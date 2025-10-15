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
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { classAPI, userAPI } from '../../services/api';

const ClassesManagement = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    teacherId: '',
    schedule: '',
  });

  // Fetch classes
  const { data: classesData, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', page, rowsPerPage],
    queryFn: () => classAPI.getClasses({ page: page + 1, limit: rowsPerPage }),
  });

  // Fetch teachers for dropdown
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => userAPI.getUsers({ role: 'teacher' }),
  });

  const classes = classesData?.data?.classes || classesData?.data || [];
  const totalClasses = classesData?.data?.total || classes.length;
  const teachers = teachersData?.data?.users || teachersData?.data || [];

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (classData) => classAPI.createClass(classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes']);
      setOpenDialog(false);
      resetForm();
      setSnackbar({ open: true, message: 'Class created successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Failed to create class', 
        severity: 'error' 
      });
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ id, classData }) => classAPI.updateClass(id, classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes']);
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
      queryClient.invalidateQueries(['classes']);
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (classItem = null) => {
    if (classItem) {
      setSelectedClass(classItem);
      setFormData({
        name: classItem.name || '',
        code: classItem.code || '',
        description: classItem.description || '',
        teacherId: classItem.teacher?._id || classItem.teacherId || '',
        schedule: classItem.schedule || '',
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
      name: '',
      code: '',
      description: '',
      teacherId: '',
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
    if (window.confirm('Are you sure you want to delete this class?')) {
      deleteClassMutation.mutate(classId);
    }
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
          Classes Management
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
            Add Class
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No classes found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              classes.map((classItem) => (
                <TableRow key={classItem._id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {classItem.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{classItem.name}</TableCell>
                  <TableCell>
                    {classItem.teacher 
                      ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                      : 'Not assigned'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {classItem.studentCount || classItem.students?.length || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={classItem.isActive ? 'ACTIVE' : 'INACTIVE'}
                      color={classItem.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalClasses}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClass ? 'Edit Class' : 'Add New Class'}
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              label="Teacher"
              select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">
                <em>Select a teacher</em>
              </MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher._id} value={teacher._id}>
                  {teacher.firstName} {teacher.lastName}
                </MenuItem>
              ))}
            </TextField>
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

export default ClassesManagement;
