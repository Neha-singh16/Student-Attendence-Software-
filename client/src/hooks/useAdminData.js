import { useQuery } from '@tanstack/react-query';
import { userAPI, classAPI, studentAPI, sessionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useAdminData = () => {
  const { user } = useAuth();

  // Get all users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userAPI.getUsers().then(res => res.data),
    enabled: !!user?.id && user?.role === 'admin',
    retry: 1,
  });

  // Get all classes
  const { data: classesData, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['all-classes'],
    queryFn: () => classAPI.getClasses().then(res => res.data),
    enabled: !!user?.id && user?.role === 'admin',
    retry: 1,
  });

  // Get all students
  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['all-students'],
    queryFn: () => studentAPI.getStudents().then(res => res.data),
    enabled: !!user?.id && user?.role === 'admin',
    retry: 1,
  });

  // Get today's sessions
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['today-sessions'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return sessionAPI.getSessions({ date: today }).then(res => res.data);
    },
    enabled: !!user?.id && user?.role === 'admin',
    retry: 1,
  });

  // Safely ensure all data is an array
  const users = Array.isArray(usersData) ? usersData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const students = Array.isArray(studentsData) ? studentsData : [];
  const todaySessions = Array.isArray(sessionsData) ? sessionsData : [];

  // Calculate dashboard stats
  const teachers = users.filter(u => u.role === 'teacher');
  const adminUsers = users.filter(u => u.role === 'admin');
  
  const dashboardStats = {
    totalStudents: students.length || 0,
    totalTeachers: teachers.length || 0,
    totalClasses: classes.length || 0,
    todaysAttendance: calculateTodaysAttendance(todaySessions),
    activeClasses: classes.filter(c => c.status === 'active').length || 0,
    totalUsers: users.length || 0,
  };

  // Recent activity (last 5 sessions)
  const recentSessions = todaySessions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return {
    users,
    teachers,
    students,
    classes,
    todaySessions,
    dashboardStats,
    recentSessions,
    isLoading: usersLoading || classesLoading || studentsLoading || sessionsLoading,
    error: usersError || classesError || studentsError || sessionsError,
  };
};

// Helper function to calculate today's attendance percentage
const calculateTodaysAttendance = (sessions) => {
  if (!sessions || sessions.length === 0) return 0;
  
  const totalStudentsExpected = sessions.reduce((acc, session) => {
    return acc + (session.expectedStudents || 0);
  }, 0);
  
  const totalStudentsPresent = sessions.reduce((acc, session) => {
    return acc + (session.presentStudents || 0);
  }, 0);
  
  if (totalStudentsExpected === 0) return 0;
  return Math.round((totalStudentsPresent / totalStudentsExpected) * 100);
};

export default useAdminData;