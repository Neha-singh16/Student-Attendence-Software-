import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { Block as BlockIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user) {
      // Navigate to appropriate dashboard based on user role
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        default:
          navigate('/');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={6} sx={{ p: 4, textAlign: 'center', width: '100%' }}>
          <BlockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom color="error">
            Access Denied
          </Typography>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            You don't have permission to access this page
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            Please contact your administrator if you believe this is an error.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGoBack}
          >
            Go Back to Dashboard
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;