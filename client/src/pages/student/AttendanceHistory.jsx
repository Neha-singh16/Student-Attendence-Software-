import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { analyticsAPI, classAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedClass, setSelectedClass] = useState('all');

  // Fetch student's classes
  const { data: classesData } = useQuery({
    queryKey: ['student-classes', user?._id],
    queryFn: () => classAPI.getClasses({ studentId: user?._id }),
    enabled: !!user?._id,
  });

  // Fetch attendance data
  const { data: attendanceData, isLoading, error } = useQuery({
    queryKey: ['student-attendance-history', user?._id],
    queryFn: () => analyticsAPI.getStudentAttendance(user?._id),
    enabled: !!user?._id,
  });

  const classes = classesData?.data?.classes || classesData?.data || [];
  const attendanceRecords = attendanceData?.data?.records || [];
  const summary = attendanceData?.data?.summary || {
    totalSessions: 0,
    attended: 0,
    missed: 0,
    percentage: 0,
  };

  // Filter records by class
  const filteredRecords = selectedClass === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(record => record.classId === selectedClass);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircleIcon color="success" />;
      case 'absent':
        return <CancelIcon color="error" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      default:
        return 'default';
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c._id === classId);
    return cls ? cls.name : 'Unknown Class';
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
        Error loading attendance: {error.response?.data?.message || error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Attendance History
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Sessions
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                {summary.totalSessions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Attended
              </Typography>
              <Typography variant="h4" component="div" color="success.main" sx={{ fontWeight: 700 }}>
                {summary.attended || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Missed
              </Typography>
              <Typography variant="h4" component="div" color="error.main" sx={{ fontWeight: 700 }}>
                {summary.missed || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Attendance Rate
              </Typography>
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  fontWeight: 700,
                  color: summary.percentage >= 75 ? 'success.main' : summary.percentage >= 50 ? 'warning.main' : 'error.main'
                }}
              >
                {summary.percentage?.toFixed(1) || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          select
          label="Filter by Class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          fullWidth
          size="small"
        >
          <MenuItem value="all">All Classes</MenuItem>
          {classes.map((cls) => (
            <MenuItem key={cls._id} value={cls._id}>
              {cls.name}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Attendance Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Session Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Check-in Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No attendance records found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record, index) => (
                  <TableRow key={record._id || index} hover>
                    <TableCell>
                      {new Date(record.date || record.sessionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getClassName(record.classId)}
                    </TableCell>
                    <TableCell>
                      {record.sessionStartTime 
                        ? new Date(record.sessionStartTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(record.status)}
                        <Chip
                          label={record.status?.toUpperCase() || 'UNKNOWN'}
                          color={getStatusColor(record.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {record.checkInTime 
                        ? new Date(record.checkInTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : record.status === 'present' ? 'On Time' : '-'}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default AttendanceHistory;
