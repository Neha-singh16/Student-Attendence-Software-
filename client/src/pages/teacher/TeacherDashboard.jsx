import React from 'react';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';

const panels = [
  {
    title: 'My Classes',
    description: 'Manage your classes, view details, and update schedules.',
    icon: <SchoolIcon fontSize="large" color="primary" />,
    route: '/teacher/classes',
  },
  {
    title: 'Sessions',
    description: 'Start, end, and review attendance sessions for your classes.',
    icon: <EventIcon fontSize="large" color="primary" />,
    route: '/teacher/sessions',
  },
  {
    title: 'Students',
    description: 'View and manage students enrolled in your classes.',
    icon: <GroupIcon fontSize="large" color="primary" />,
    route: '/teacher/students',
  },
  {
    title: 'Reports',
    description: 'View attendance and performance analytics for your classes.',
    icon: <AssessmentIcon fontSize="large" color="primary" />,
    route: '/teacher/reports',
  },
];

const TeacherDashboard = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Teacher Dashboard
      </Typography>
      <Grid container spacing={4}>
        {panels.map((panel) => (
          <Grid item xs={12} sm={6} md={3} key={panel.title}>
            <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              {panel.icon}
              <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                {panel.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {panel.description}
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate(panel.route)}
                sx={{ mt: 2 }}
              >
                Go to {panel.title}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TeacherDashboard;
