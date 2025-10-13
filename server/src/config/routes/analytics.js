const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { userAuth, requireRole } = require('../middleware/userAuth');
const Class = require('../models/class');
const Session = require('../models/session');
const AttendanceLog = require('../models/AttendanceLog');
const Student = require('../models/students');
const User = require('../models/user');

// GET /analytics/dashboard - Teacher Dashboard Overview
router.get('/dashboard', userAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    
    const filter = isAdmin ? {} : { teacherId: userId };
    
    // Basic counts
    const classesCount = await Class.countDocuments(filter);
    const studentsCount = await Student.aggregate([
      { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' }},
      { $match: isAdmin ? {} : { 'class.teacherId': userId }},
      { $count: 'total' }
    ]);
    
    const sessionsFilter = isAdmin ? {} : { teacherId: userId };
    const totalSessions = await Session.countDocuments(sessionsFilter);
    const activeSessions = await Session.countDocuments({ ...sessionsFilter, status: 'open' });
    
    // Recent attendance summary (last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAttendance = await AttendanceLog.aggregate([
      { $match: { timestamp: { $gte: last7Days }}},
      ...(isAdmin ? [] : [
        { $lookup: { from: 'sessions', localField: 'sessionId', foreignField: '_id', as: 'session' }},
        { $match: { 'session.teacherId': userId }}
      ]),
      { $group: { 
        _id: '$status', 
        count: { $sum: 1 }
      }}
    ]);
    
    // Today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysSessions = await Session.find({
      ...sessionsFilter,
      createdAt: { $gte: today, $lt: tomorrow }
    }).populate('classId', 'title').limit(10).sort({ createdAt: -1 });

    res.json({
      overview: {
        classesCount,
        studentsCount: studentsCount[0]?.total || 0,
        totalSessions,
        activeSessions
      },
      recentAttendance: recentAttendance.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      todaysSessions
    });
  } catch (err) {
    console.error('GET /analytics/dashboard', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /analytics/class/:id/reports - Class attendance reports
router.get('/class/:id/reports', userAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const classId = req.params.id;
    const { startDate, endDate, format = 'json' } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'invalid class id' });
    }

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ error: 'class not found' });
    
    // Authorization check
    if (req.user.role !== 'admin' && cls.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Date range filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Get all students in class
    const students = await Student.find({ classId }).select('name rollNo userId');
    
    // Get sessions in date range
    const sessionsQuery = { classId };
    if (hasDateFilter) sessionsQuery.createdAt = dateFilter;
    const sessions = await Session.find(sessionsQuery).sort({ createdAt: -1 });

    // Get attendance data
    const attendanceLogs = await AttendanceLog.find({
      sessionId: { $in: sessions.map(s => s._id) }
    }).populate('sessionId', 'title createdAt');

    // Build student attendance matrix
    const attendanceMatrix = students.map(student => {
      const studentAttendance = sessions.map(session => {
        const log = attendanceLogs.find(
          log => log.studentId.toString() === student._id.toString() && 
                 log.sessionId._id.toString() === session._id.toString()
        );
        return {
          sessionId: session._id,
          sessionTitle: session.title,
          sessionDate: session.createdAt,
          status: log ? log.status : 'absent',
          timestamp: log ? log.timestamp : null
        };
      });

      const presentCount = studentAttendance.filter(a => a.status === 'present').length;
      const attendancePercentage = sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0;

      return {
        student: {
          id: student._id,
          name: student.name,
          rollNo: student.rollNo
        },
        attendance: studentAttendance,
        summary: {
          totalSessions: sessions.length,
          presentCount,
          absentCount: sessions.length - presentCount,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        }
      };
    });

    // Overall class statistics
    const totalSessionsCount = sessions.length;
    const overallStats = {
      totalStudents: students.length,
      totalSessions: totalSessionsCount,
      averageAttendance: attendanceMatrix.length > 0 
        ? attendanceMatrix.reduce((sum, s) => sum + s.summary.attendancePercentage, 0) / attendanceMatrix.length 
        : 0
    };

    if (format === 'csv') {
      // Return CSV format
      const csv = generateAttendanceCSV(attendanceMatrix, sessions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${cls.title}-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({
      class: { id: cls._id, title: cls.title },
      dateRange: { startDate, endDate },
      overallStats,
      attendanceMatrix
    });
  } catch (err) {
    console.error('GET /analytics/class/:id/reports', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Helper function to generate CSV
function generateAttendanceCSV(attendanceMatrix, sessions) {
  if (!attendanceMatrix.length) return 'No data available';
  
  // CSV headers
  let csv = 'Student Name,Roll No';
  sessions.forEach(session => {
    csv += `,${session.title || 'Session'} (${new Date(session.createdAt).toLocaleDateString()})`;
  });
  csv += ',Total Present,Total Absent,Attendance %\n';

  // CSV data rows
  attendanceMatrix.forEach(row => {
    csv += `"${row.student.name}","${row.student.rollNo}"`;
    row.attendance.forEach(att => {
      csv += `,${att.status}`;
    });
    csv += `,${row.summary.presentCount},${row.summary.absentCount},${row.summary.attendancePercentage}%\n`;
  });

  return csv;
}

// GET /analytics/student/:id/attendance - Individual student attendance
router.get('/student/:id/attendance', userAuth, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'invalid student id' });
    }

    const student = await Student.findById(studentId).populate('classId', 'title teacherId');
    if (!student) return res.status(404).json({ error: 'student not found' });

    // Authorization: student themselves, class teacher, or admin
    const isAuthorized = 
      (req.user.role === 'student' && student.userId && student.userId.toString() === req.user._id.toString()) ||
      (req.user.role === 'teacher' && student.classId.teacherId.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Get attendance records with pagination
    const attendanceRecords = await AttendanceLog.find({ studentId })
      .populate('sessionId', 'title createdAt')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Calculate summary statistics
    const totalRecords = await AttendanceLog.countDocuments({ studentId });
    const statusCounts = await AttendanceLog.aggregate([
      { $match: { studentId: mongoose.Types.ObjectId(studentId) }},
      { $group: { _id: '$status', count: { $sum: 1 }}}
    ]);

    const summary = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { present: 0, absent: 0, late: 0, excused: 0 });

    const attendancePercentage = totalRecords > 0 ? ((summary.present || 0) / totalRecords) * 100 : 0;

    res.json({
      student: {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        class: student.classId
      },
      summary: {
        ...summary,
        totalRecords,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      },
      records: attendanceRecords,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalRecords
      }
    });
  } catch (err) {
    console.error('GET /analytics/student/:id/attendance', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;