// Helper: Parse schedule string to array of objects
function parseSchedule(scheduleStr) {
  // Example input: "mon/wed/fri 10:00 am - 11:00am"
  if (!scheduleStr) return [];
  const parts = scheduleStr.split(' ');
  if (parts.length < 3) return [];
  const daysPart = parts[0];
  const timeMatch = scheduleStr.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
  if (!daysPart || !timeMatch) return [];
  const days = daysPart.split('/').map(function(d) { return d.trim(); });
  const start = timeMatch[1];
  const end = timeMatch[2];
  if (!start || !end) return [];
  return days.map(function(day) { return { day, start, end }; });
}

// Helper: Format schedule array to string for editing
function formatSchedule(scheduleArr) {
  if (!Array.isArray(scheduleArr) || scheduleArr.length === 0) return '';
  const days = scheduleArr.map(function(s) { return s.day; }).join('/');
  const start = scheduleArr[0].start;
  const end = scheduleArr[0].end;
  return days + ' ' + start + ' - ' + end;
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { classAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MyClasses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    schedule: '',
  });

  // Fetch teacher's classes
  const { data: classesData, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-classes', user?._id],
    queryFn: () => classAPI.getClasses({ teacherId: user?._id }),
    enabled: !!user?._id,
  });

  const classes = classesData?.data?.classes || classesData?.data || [];

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (classData) => {
      // Parse schedule string to array of objects
      const scheduleArr = parseSchedule(classData.schedule);
      const payload = {
        title: classData.title,
        code: classData.code,
        schedule: scheduleArr,
        meta: classData.description ? { description: classData.description } : {},
        teacherId: user._id,
      };
      return classAPI.createClass(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher-classes']);
      setOpenDialog(false);
      resetForm();
      setSnackbar({ open: true, message: 'Class created successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create class', 
        severity: 'error' 
      });
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ id, classData }) => classAPI.updateClass(id, classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher-classes']);
      setOpenDialog(false);
      resetForm();
      setSnackbar({ open: true, message: 'Class updated successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to update class', 
        severity: 'error' 
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (id) => classAPI.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacher-classes']);
      setSnackbar({ open: true, message: 'Class deleted successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to delete class', 
        severity: 'error' 
      });
    },
  });

  const handleOpenDialog = (classItem = null) => {
    if (classItem) {
      setSelectedClass(classItem);
      setFormData({
        title: classItem.title || '',
        code: classItem.code || '',
        description: classItem.meta?.description || '',
        schedule: formatSchedule(classItem.schedule) || '',
      });
    } else {
      setSelectedClass(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedClass(null);
    setFormData({
      title: '',
      code: '',
      description: '',
      schedule: '',
    });
  };

  const handleSubmit = () => {
    if (selectedClass) {
      updateClassMutation.mutate({ id: selectedClass._id, classData: formData });
    } else {
      createClassMutation.mutate(formData);
    }
  };

  const handleDelete = (classId) => {
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      deleteClassMutation.mutate(classId);
    }
  };

  const handleViewClass = (classId) => {
    navigate(`/teacher/classes/${classId}`);
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          My Classes
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
            onClick={() => handleOpenDialog()}
          >
            Create Class
          </Button>
        </Box>
      </Box>

      {classes.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Classes Yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Create your first class to start managing attendance
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Your First Class
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {classes.map((classItem) => (
            <Grid item xs={12} sm={6} md={4} key={classItem._id}>
              <Card 
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      {classItem.name}
                    </Typography>
                    <Chip
                      label={classItem.isActive ? 'ACTIVE' : 'INACTIVE'}
                      color={classItem.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
                    {classItem.code}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {classItem.description || 'No description provided'}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      {classItem.studentCount || classItem.students?.length || 0} Students
                    </Typography>
                  </Box>

                  {classItem.schedule && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {classItem.schedule}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => handleViewClass(classItem._id)}
                  >
                    View Details
                  </Button>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(classItem)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(classItem._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClass ? 'Edit Class' : 'Create New Class'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Class Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              required
              helperText="Unique identifier for the class"
            />
            <TextField
              label="Class Name"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Schedule"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              fullWidth
              helperText="e.g., Mon/Wed/Fri 10:00 AM - 11:30 AM"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createClassMutation.isLoading || updateClassMutation.isLoading}
          >
            {selectedClass ? 'Update' : 'Create'}
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

export default MyClasses;
