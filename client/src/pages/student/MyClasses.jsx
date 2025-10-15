import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Class as ClassIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { classAPI, analyticsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MyClasses = () => {
  const { user } = useAuth();

  // Fetch student's enrolled classes
  const { data: classesData, isLoading, error } = useQuery({
    queryKey: ['student-classes', user?._id],
    queryFn: () => classAPI.getClasses({ studentId: user?._id }),
    enabled: !!user?._id,
  });

  // Fetch student's attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ['student-attendance', user?._id],
    queryFn: () => analyticsAPI.getStudentAttendance(user?._id),
    enabled: !!user?._id,
  });

  const classes = classesData?.data?.classes || classesData?.data || [];
  const attendanceByClass = attendanceData?.data?.byClass || [];

  const getAttendanceForClass = (classId) => {
    const attendance = attendanceByClass.find(a => a.classId === classId);
    return attendance || { percentage: 0, present: 0, total: 0 };
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading classes: {error.response?.data?.message || error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        My Classes
      </Typography>

      {classes.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ClassIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Classes Enrolled
          </Typography>
          <Typography variant="body2" color="textSecondary">
            You are not enrolled in any classes yet. Please contact your teacher or administrator.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {classes.map((classItem) => {
            const attendance = getAttendanceForClass(classItem._id);
            const percentage = attendance.percentage || 0;
            
            return (
              <Grid item xs={12} md={6} key={classItem._id}>
                <Card 
                  elevation={2}
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {classItem.name}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                          {classItem.code}
                        </Typography>
                      </Box>
                      <Chip
                        label={classItem.isActive ? 'ACTIVE' : 'INACTIVE'}
                        color={classItem.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    {/* Description */}
                    {classItem.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {classItem.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Class Info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                      {classItem.teacher && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary">
                            <strong>Teacher:</strong> {classItem.teacher.firstName} {classItem.teacher.lastName}
                          </Typography>
                        </Box>
                      )}

                      {classItem.schedule && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary">
                            <strong>Schedule:</strong> {classItem.schedule}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClassIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="textSecondary">
                          <strong>Students:</strong> {classItem.studentCount || classItem.students?.length || 0}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Attendance Progress */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TrendingUpIcon fontSize="small" color="action" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Attendance
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            color: percentage >= 75 ? 'success.main' : percentage >= 50 ? 'warning.main' : 'error.main'
                          }}
                        >
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        color={getAttendanceColor(percentage)}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {attendance.present || 0} out of {attendance.total || 0} sessions attended
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default MyClasses;
