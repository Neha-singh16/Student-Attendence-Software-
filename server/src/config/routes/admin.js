const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { userAuth, requireRole } = require('../middleware/userAuth');
const User = require('../models/user');
const Class = require('../models/class');
const Student = require('../models/students');
const Session = require('../models/session');
const AttendanceLog = require('../models/AttendanceLog');
const AuditLog = require('../models/audit');

// GET /admin/users - List all users with filtering and pagination
router.get('/users', userAuth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status = 'active' } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' }},
        { lastName: { $regex: search, $options: 'i' }},
        { email: { $regex: search, $options: 'i' }}
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter)
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get additional info for teachers (class count)
    const teacherIds = users.filter(u => u.role === 'teacher').map(u => u._id);
    const classCounts = await Class.aggregate([
      { $match: { teacherId: { $in: teacherIds }}},
      { $group: { _id: '$teacherId', count: { $sum: 1 }}}
    ]);
    
    const classCountMap = classCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});
    
    // Get additional info for students (linked status)
    const userIds = users.map(u => u._id);
    const studentLinks = await Student.find({ userId: { $in: userIds }}).select('userId');
    const linkedStudentIds = new Set(studentLinks.map(s => s.userId.toString()));
    
    const enrichedUsers = users.map(user => ({
      ...user,
      classCount: user.role === 'teacher' ? (classCountMap[user._id.toString()] || 0) : undefined,
      hasStudentRecord: user.role === 'student' ? linkedStudentIds.has(user._id.toString()) : undefined
    }));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users: enrichedUsers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /admin/users error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /admin/users - Create new user (admin only)
router.post('/users', userAuth, requireRole('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role = 'teacher' } = req.body;
    
    if (!firstName || !email || !password) {
      return res.status(400).json({ error: 'firstName, email, and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    
    if (!['teacher', 'student', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'email already exists' });
    }
    
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save hook
      role,
      emailVerified: true // Admin created accounts are verified
    });
    
    await user.save();
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_USER',
      targetId: user._id,
      details: { email: user.email, role: user.role }
    }).catch(() => {}); // Don't fail if audit fails
    
    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('POST /admin/users error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// PUT /admin/users/:id - Update user (admin only)
router.put('/users/:id', userAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'invalid user id' });
    }
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'user not found' });
    
    const { firstName, lastName, email, role, password } = req.body;
    const updates = {};
    
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName?.trim() || '';
    if (email !== undefined) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId }});
      if (existingEmail) {
        return res.status(409).json({ error: 'email already exists' });
      }
      updates.email = email.toLowerCase().trim();
    }
    if (role !== undefined && ['teacher', 'student', 'admin'].includes(role)) {
      updates.role = role;
    }
    if (password && password.length >= 8) {
      updates.passwordHash = password; // Will be hashed by pre-save hook
      updates.tokenVersion = user.tokenVersion + 1; // Invalidate existing tokens
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash -__v');
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_USER',
      targetId: userId,
      details: updates
    }).catch(() => {});
    
    res.json(updatedUser);
  } catch (err) {
    console.error('PUT /admin/users/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /admin/users/:id - Soft delete user (admin only)
router.delete('/users/:id', userAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'invalid user id' });
    }
    
    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'cannot delete yourself' });
    }
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'user not found' });
    
    // Check for dependencies before deletion
    if (user.role === 'teacher') {
      const classCount = await Class.countDocuments({ teacherId: userId });
      if (classCount > 0) {
        return res.status(400).json({ 
          error: 'cannot_delete', 
          message: `User has ${classCount} classes. Please reassign or delete them first.`
        });
      }
    }
    
    // For now, we'll do hard delete. In production, implement soft delete
    await user.deleteOne();
    
    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE_USER',
      targetId: userId,
      details: { email: user.email, role: user.role }
    }).catch(() => {});
    
    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE /admin/users/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /admin/overview - Admin dashboard overview
router.get('/overview', userAuth, requireRole('admin'), async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 }}}
    ]);
    
    const totalClasses = await Class.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalSessions = await Session.countDocuments();
    
    // Recent activity (last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: last7Days }});
    const recentSessions = await Session.countDocuments({ createdAt: { $gte: last7Days }});
    
    // Attendance statistics
    const attendanceStats = await AttendanceLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }}}
    ]);
    
    // Active sessions
    const activeSessions = await Session.countDocuments({ status: 'open' });
    
    res.json({
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentSignups: recentUsers
      },
      classes: {
        total: totalClasses
      },
      students: {
        total: totalStudents
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
        recent: recentSessions
      },
      attendance: attendanceStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('GET /admin/overview error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /admin/audit-logs - Get audit logs
router.get('/audit-logs', userAuth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    
    const filter = {};
    if (action) filter.action = action;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = mongoose.Types.ObjectId(userId);
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditLog.countDocuments(filter);
    
    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /admin/audit-logs error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /admin/system-stats - System performance and usage stats
router.get('/system-stats', userAuth, requireRole('admin'), async (req, res) => {
  try {
    // Database stats
    const dbStats = {
      collections: {
        users: await User.countDocuments(),
        classes: await Class.countDocuments(),
        students: await Student.countDocuments(),
        sessions: await Session.countDocuments(),
        attendanceLogs: await AttendanceLog.countDocuments()
      }
    };
    
    // Usage trends (last 30 days)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyStats = await Session.aggregate([
      { $match: { createdAt: { $gte: last30Days }}},
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }},
        sessionsCount: { $sum: 1 }
      }},
      { $sort: { _id: 1 }}
    ]);
    
    // Most active teachers
    const activeTeachers = await Session.aggregate([
      { $match: { createdAt: { $gte: last30Days }}},
      { $group: { _id: '$teacherId', sessionsCount: { $sum: 1 }}},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'teacher' }},
      { $unwind: '$teacher' },
      { $project: {
        teacherName: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] },
        email: '$teacher.email',
        sessionsCount: 1
      }},
      { $sort: { sessionsCount: -1 }},
      { $limit: 10 }
    ]);
    
    res.json({
      database: dbStats,
      trends: {
        dailySessionCounts: dailyStats
      },
      insights: {
        mostActiveTeachers: activeTeachers
      }
    });
  } catch (err) {
    console.error('GET /admin/system-stats error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
