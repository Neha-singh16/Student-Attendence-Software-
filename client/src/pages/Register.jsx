import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useForm } from 'react-hook-form';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const userRole = watch('role');
  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const result = await registerUser(data);
    
    if (result.success) {
      setSuccess(result.message || 'Registration successful! Please login with your credentials.');
      setTimeout(() => {
        // Redirect to login page instead of dashboard since backend doesn't auto-login after register
        navigate('/login', { replace: true });
      }, 2000);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const getDashboardRoute = (role) => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper elevation={6} sx={{ p: 4, width: '100%', maxWidth: 600 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <PersonAdd />
            </Avatar>
            <Typography component="h1" variant="h4" gutterBottom>
              Attendance System
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Create Account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1, width: '100%' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('name', {
                      required: 'Full name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    fullWidth
                    label="Full Name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={loading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    fullWidth
                    label="Email Address"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    fullWidth
                    label="Password"
                    type="password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === password || 'Passwords do not match',
                    })}
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      {...register('role', { required: 'Role is required' })}
                      value={userRole || ''}
                      label="Role"
                      error={!!errors.role}
                      disabled={loading}
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="teacher">Teacher</MenuItem>
                      <MenuItem value="student">Student</MenuItem>
                    </Select>
                    {errors.role && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.role.message}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[0-9]{10,}$/,
                        message: 'Enter a valid phone number',
                      },
                    })}
                    fullWidth
                    label="Phone Number"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    disabled={loading}
                  />
                </Grid>

                {/* Role-specific fields */}
                {userRole === 'student' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('studentId', {
                          required: 'Student ID is required',
                        })}
                        fullWidth
                        label="Student ID"
                        error={!!errors.studentId}
                        helperText={errors.studentId?.message}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('grade', {
                          required: 'Grade is required',
                        })}
                        fullWidth
                        label="Grade/Class"
                        error={!!errors.grade}
                        helperText={errors.grade?.message}
                        disabled={loading}
                      />
                    </Grid>
                  </>
                )}

                {userRole === 'teacher' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('employeeId', {
                          required: 'Employee ID is required',
                        })}
                        fullWidth
                        label="Employee ID"
                        error={!!errors.employeeId}
                        helperText={errors.employeeId?.message}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('department', {
                          required: 'Department is required',
                        })}
                        fullWidth
                        label="Department"
                        error={!!errors.department}
                        helperText={errors.department?.message}
                        disabled={loading}
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Button 
                      variant="text" 
                      disabled={loading}
                    >
                      Sign In
                    </Button>
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;