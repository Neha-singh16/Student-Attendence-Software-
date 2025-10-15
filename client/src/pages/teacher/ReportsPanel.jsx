import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { analyticsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ReportsPanel = () => {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-reports', user?._id],
    queryFn: () => analyticsAPI.getDashboard(),
    enabled: !!user?._id,
  });

  const reports = data?.data?.reports || [];

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
        Error loading reports: {error.response?.data?.message || error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Reports & Analytics
        </Typography>
        <Button variant="outlined" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total Sessions</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Attendance Rate</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Last Session</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No reports found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.classId} hover>
                  <TableCell>{report.className}</TableCell>
                  <TableCell>{report.totalSessions}</TableCell>
                  <TableCell>{report.attendanceRate}%</TableCell>
                  <TableCell>{report.lastSession ? new Date(report.lastSession).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReportsPanel;
