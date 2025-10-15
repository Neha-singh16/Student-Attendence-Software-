import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  LinearProgress,
  Chip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Class as ClassIcon,
  QrCodeScanner,
  Assessment,
  AccountCircle,
  Settings,
  Logout,
  Schedule,
  CheckCircle,
  Cancel,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudentData } from '../hooks/useStudentData';
import MyClasses from './student/MyClasses';
import AttendanceHistory from './student/AttendanceHistory';

const drawerWidth = 260;

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { 
    dashboardStats, 
    attendanceByClass, 
    todaysSchedule,
    isLoading 
  } = useStudentData();

  // Check if user is new (created within last 24 hours)
  const isNewUser = () => {
    if (!user?.createdAt) return true;
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return accountAge < oneDayInMs;
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/student/dashboard' },
    { text: 'My Classes', icon: <ClassIcon />, path: '/student/classes' },
    { text: 'Attendance', icon: <QrCodeScanner />, path: '/student/attendance' },
    { text: 'Schedule', icon: <Schedule />, path: '/student/schedule' },
    { text: 'Reports', icon: <Assessment />, path: '/student/reports' },
  ];

  const DashboardOverview = () => {
    if (isLoading) {
      return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </Container>
      );
    }

    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Student Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            {isNewUser() ? `Welcome, ${user?.firstName}!` : `Welcome back, ${user?.firstName}!`}
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }} gutterBottom>
                  Enrolled Classes
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.enrolledClasses}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.enrolledClasses === 0 ? 'Not enrolled yet' : 'Active enrollments'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }} gutterBottom>
                  Overall Attendance
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.overallAttendance}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.totalSessions > 0 ? `${dashboardStats.presentSessions}/${dashboardStats.totalSessions} sessions` : 'No sessions yet'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }} gutterBottom>
                  Classes Today
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.todaysClasses}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.todaysClasses === 0 ? 'No classes today' : 'Scheduled for today'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }} gutterBottom>
                  Present Today
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.presentToday}/{dashboardStats.todaysClasses}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  {dashboardStats.todaysClasses === 0 ? 'No sessions' : 'Sessions attended'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Schedule
                </Typography>
                {todaysSchedule.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body1" color="textSecondary">
                      No classes scheduled for today
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Enjoy your free day!
                    </Typography>
                  </Paper>
                ) : (
                  <List>
                    {todaysSchedule.map((session, index) => {
                      const status = session.attendanceStatus || 'upcoming';
                      const getStatusIcon = () => {
                        switch (status) {
                          case 'present': return <CheckCircle color="success" />;
                          case 'absent': return <Cancel color="error" />;
                          case 'upcoming': return <Schedule color="warning" />;
                          default: return <Schedule color="disabled" />;
                        }
                      };
                      
                      const getStatusColor = () => {
                        switch (status) {
                          case 'present': return 'success';
                          case 'absent': return 'error';
                          case 'upcoming': return 'warning';
                          default: return 'default';
                        }
                      };

                      return (
                        <ListItem key={session.id || index} sx={{ px: 0, borderBottom: index < todaysSchedule.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <ListItemIcon>
                            {getStatusIcon()}
                          </ListItemIcon>
                          <ListItemText 
                            primary={session.className || `Class ${index + 1}`}
                            secondary={
                              session.scheduledTime 
                                ? `${new Date(session.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${session.location || 'Location TBD'}`
                                : 'Time not set'
                            }
                          />
                          <Chip 
                            label={status.charAt(0).toUpperCase() + status.slice(1)} 
                            color={getStatusColor()} 
                            size="small" 
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Summary
              </Typography>

              
                {attendanceByClass.length === 0 ? (
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body2" color="textSecondary">
                      No attendance data available
                    </Typography>
                  </Paper>
                ) : (
                  attendanceByClass.slice(0, 4).map((classItem, index) => (
                    <Box key={classItem.id || index} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        {classItem.name || `Class ${index + 1}`}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={classItem.attendancePercentage || 0}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: classItem.attendancePercentage >= 75 ? '#4caf50' : 
                                           classItem.attendancePercentage >= 50 ? '#ff9800' : '#f44336'
                          }
                        }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {classItem.attendancePercentage}% ({classItem.attendanceCount}/{classItem.totalSessions} sessions)
                      </Typography>
                    </Box>
                  ))
                )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Attendance Management System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              onClick={handleProfileMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'transparent',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  width: 40,
                  height: 40,
                }}
              >
                {user?.firstName?.charAt(0) || 'S'}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 200,
              },
            }}
          >
            <MenuItem onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          },
        }}
      >
        <Toolbar>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
          }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              S
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Student Portal
            </Typography>
          </Box>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1, pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        <Toolbar>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
          }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              S
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Student Portal
            </Typography>
          </Box>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1, pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Routes>
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/classes" element={<MyClasses />} />
          <Route path="/attendance" element={<AttendanceHistory />} />
          <Route path="/schedule" element={<div>Class Schedule (Coming Soon)</div>} />
          <Route path="/reports" element={<div>My Reports (Coming Soon)</div>} />
        </Routes>
      </Box>
    </Box>
  );
};

export default StudentDashboard;