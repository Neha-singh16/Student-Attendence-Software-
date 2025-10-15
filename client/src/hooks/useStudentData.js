import { useQuery } from '@tanstack/react-query';
import { studentAPI, classAPI, sessionAPI, checkinAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useStudentData = () => {
  const { user } = useAuth();

  // Get student profile
  const { data: studentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: () => studentAPI.getStudentById(user?.id).then(res => res.data),
    enabled: !!user?.id && user?.role === 'student',
    retry: 1,
  });

  // Get student's classes
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['student-classes', user?.id],
    queryFn: () => studentAPI.getStudentClasses(user?.id).then(res => res.data),
    enabled: !!user?.id && user?.role === 'student',
    retry: 1,
  });

  // Get student's attendance history
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['student-attendance', user?.id],
    queryFn: () => checkinAPI.getAttendanceByStudent(user?.id).then(res => res.data),
    enabled: !!user?.id && user?.role === 'student',
    retry: 1,
  });

  // Get today's sessions for the student
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['student-today-sessions', user?.id],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return sessionAPI.getSessions({ 
        studentId: user?.id, 
        date: today 
      }).then(res => res.data);
    },
    enabled: !!user?.id && user?.role === 'student',
    retry: 1,
  });

  // Safely ensure all data is an array
  const classes = Array.isArray(classesData) ? classesData : [];
  const attendanceHistory = Array.isArray(attendanceData) ? attendanceData : [];
  const todaySessions = Array.isArray(sessionsData) ? sessionsData : [];

  // Calculate dashboard stats
  const totalClasses = classes.length || 0;
  const totalSessions = attendanceHistory.length || 0;
  const presentSessions = attendanceHistory.filter(a => a.status === 'present').length || 0;
  const overallAttendance = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
  
  const todaysClassesCount = todaySessions.length || 0;
  const todaysPresentCount = todaySessions.filter(s => s.attendanceStatus === 'present').length || 0;

  const dashboardStats = {
    enrolledClasses: totalClasses,
    overallAttendance,
    todaysClasses: todaysClassesCount,
    presentToday: todaysPresentCount,
    totalSessions,
    presentSessions,
  };

  // Group attendance by class for subject-wise breakdown
  const attendanceByClass = classes.map(classItem => {
    const classAttendance = attendanceHistory.filter(a => a.classId === classItem.id);
    const classPresent = classAttendance.filter(a => a.status === 'present').length;
    const classTotal = classAttendance.length;
    
    return {
      ...classItem,
      attendanceCount: classPresent,
      totalSessions: classTotal,
      attendancePercentage: classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0,
    };
  });

  // Today's schedule with attendance status
  const todaysSchedule = todaySessions.map(session => ({
    ...session,
    attendanceStatus: getAttendanceStatus(session, attendanceHistory),
  }));

  return {
    studentProfile,
    classes,
    attendanceHistory,
    todaySessions,
    dashboardStats,
    attendanceByClass,
    todaysSchedule,
    isLoading: profileLoading || classesLoading || attendanceLoading || sessionsLoading,
  };
};

// Helper function to get attendance status for a session
const getAttendanceStatus = (session, attendanceHistory) => {
  const attendance = attendanceHistory.find(a => a.sessionId === session.id);
  if (!attendance) {
    const now = new Date();
    const sessionTime = new Date(session.scheduledTime);
    if (sessionTime > now) return 'upcoming';
    return 'absent';
  }
  return attendance.status;
};

export default useStudentData;