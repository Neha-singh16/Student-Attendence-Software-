import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { sessionAPI, classAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SessionsManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    classId: '',
    duration: 60,
  });

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError, refetch } = useQuery({
    queryKey: ['teacher-sessions', user?._id],
    queryFn: () => sessionAPI.getSessionsList({ teacherId: user?._id }),
    enabled: !!user?._id,
  });

  // Fetch teacher's classes
  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes', user?._id],
    queryFn: () => classAPI.getClasses({ teacherId: user?._id }),
    enabled: !!user?._id,
  });

  const sessions = sessionsData?.data?.sessions || sessionsData?.data || [];
  const classes = classesData?.data?.classes || classesData?.data || [];
  const activeSessions = sessions.filter(s => s.status === 'active');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: (sessionData) => sessionAPI.startSession(sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher-sessions']);
      setOpenDialog(false);
      resetForm();
      setSnackbar({ open: true, message: 'Session started successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to start session', 
        severity: 'error' 
      });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: (sessionId) => sessionAPI.endSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher-sessions']);
      setSnackbar({ open: true, message: 'Session ended successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to end session', 
        severity: 'error' 
      });
    },
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      classId: '',
      duration: 60,
    });
  };

  const handleStartSession = () => {
    if (!formData.classId) {
      setSnackbar({ open: true, message: 'Please select a class', severity: 'error' });
      return;
    }
    startSessionMutation.mutate(formData);
  };

  const handleEndSession = (sessionId) => {
    if (window.confirm('Are you sure you want to end this session?')) {
      endSessionMutation.mutate(sessionId);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'scheduled':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c._id === classId);
    return cls ? cls.name : 'Unknown Class';
  };

  if (sessionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (sessionsError) {
    return (
      <Alert severity="error">
        Error loading sessions: {sessionsError.response?.data?.message || sessionsError.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Sessions Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Start New Session
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Sessions
              </Typography>
              <Typography variant="h3" component="div" color="success.main" sx={{ fontWeight: 700 }}>
                {activeSessions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Upcoming Sessions
              </Typography>
              <Typography variant="h3" component="div" color="primary.main" sx={{ fontWeight: 700 }}>
                {upcomingSessions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed Today
              </Typography>
              <Typography variant="h3" component="div" color="text.secondary" sx={{ fontWeight: 700 }}>
                {completedSessions.filter(s => {
                  const today = new Date().toDateString();
                  return new Date(s.endTime).toDateString() === today;
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sessions Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No sessions found</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    sx={{ mt: 2 }}
                  >
                    Start Your First Session
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session._id} hover>
                  <TableCell>
                    {getClassName(session.classId || session.class?._id)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.status?.toUpperCase() || 'UNKNOWN'}
                      color={getStatusColor(session.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon fontSize="small" color="action" />
                      {session.startTime 
                        ? new Date(session.startTime).toLocaleString()
                        : 'Not started'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {session.duration || 60} minutes
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      {session.attendanceCount || 0}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {session.status === 'active' ? (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={() => handleEndSession(session._id)}
                      >
                        End Session
                      </Button>
                    ) : session.status === 'scheduled' ? (
                      <Chip label="Scheduled" size="small" color="primary" />
                    ) : (
                      <Chip label="Completed" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Start Session Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Start New Session
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Select Class"
              select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              fullWidth
              required
            >
              {classes.length === 0 ? (
                <MenuItem value="">
                  <em>No classes available</em>
                </MenuItem>
              ) : (
                classes.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>
                    {cls.name} ({cls.code})
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              fullWidth
              required
              inputProps={{ min: 15, max: 180, step: 15 }}
              helperText="Session duration in minutes (15-180)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleStartSession}
            variant="contained"
            startIcon={<StartIcon />}
            disabled={startSessionMutation.isLoading || !formData.classId}
          >
            Start Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionsManagement;
