import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classAPI, sessionAPI, teacherAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useTeacherData = () => {
  const { user } = useAuth();

  // Get teacher's classes
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes', user?.id],
    queryFn: () => teacherAPI.getTeacherClasses(user?.id).then(res => res.data),
    enabled: !!user?.id && user?.role === 'teacher',
    retry: 1,
  });

  // Get teacher's sessions for today
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['teacher-sessions', user?.id],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return sessionAPI.getSessions({ 
        teacherId: user?.id, 
        date: today 
      }).then(res => res.data);
    },
    enabled: !!user?.id && user?.role === 'teacher',
    retry: 1,
  });

  // Get teacher profile data
  const { data: teacherProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: () => teacherAPI.getTeacherById(user?.id).then(res => res.data),
    enabled: !!user?.id && user?.role === 'teacher',
    retry: 1,
  });

  // Safely ensure data is an array
  const classes = Array.isArray(classesData) ? classesData : [];
  const todaySessions = Array.isArray(sessionsData) ? sessionsData : [];

  // Calculate dashboard stats
  const dashboardStats = {
    totalClasses: classes.length || 0,
    totalStudents: classes.reduce((acc, cls) => acc + (cls.students?.length || 0), 0),
    todaysSessions: todaySessions.length || 0,
    avgAttendance: calculateAverageAttendance(classes),
  };

  // Get upcoming sessions (next 2 hours)
  const upcomingSessions = todaySessions.filter(session => {
    if (!session.scheduledTime) return false;
    const sessionTime = new Date(session.scheduledTime);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return sessionTime > now && sessionTime <= twoHoursFromNow;
  });

  return {
    classes,
    todaySessions,
    teacherProfile,
    dashboardStats,
    upcomingSessions,
    isLoading: classesLoading || sessionsLoading || profileLoading,
  };
};

// Helper function to calculate average attendance
const calculateAverageAttendance = (classes) => {
  if (!classes || classes.length === 0) return 0;
  
  const totalSessions = classes.reduce((acc, cls) => acc + (cls.sessionCount || 0), 0);
  const totalAttended = classes.reduce((acc, cls) => acc + (cls.attendedSessions || 0), 0);
  
  if (totalSessions === 0) return 0;
  return Math.round((totalAttended / totalSessions) * 100);
};

export default useTeacherData;