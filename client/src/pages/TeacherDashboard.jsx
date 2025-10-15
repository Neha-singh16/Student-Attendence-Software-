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
  Button,
  CircularProgress,
  Chip,
  Paper,
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
  People,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeacherData } from '../hooks/useTeacherData';
import MyClasses from './teacher/MyClasses';
import SessionsManagement from './teacher/SessionsManagement';
import StudentsPanel from './teacher/StudentsPanel';
import ReportsPanel from './teacher/ReportsPanel';

const drawerWidth = 260;

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { 
    classes, 
    todaySessions, 
    dashboardStats, 
    upcomingSessions, 
    isLoading 
  } = useTeacherData();

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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/teacher/dashboard' },
    { text: 'My Classes', icon: <ClassIcon />, path: '/teacher/classes' },
    { text: 'Sessions', icon: <Schedule />, path: '/teacher/sessions' },
    { text: 'Take Attendance', icon: <QrCodeScanner />, path: '/teacher/attendance' },
    { text: 'Students', icon: <People />, path: '/teacher/students' },
    { text: 'Reports', icon: <Assessment />, path: '/teacher/reports' },
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
            Teacher Dashboard
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
                  My Classes
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.totalClasses}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.totalClasses === 0 ? 'No classes assigned' : 'Active classes'}
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
                  Total Students
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.totalStudents}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Across all classes
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
                  Today's Sessions
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.todaysSessions}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Scheduled for today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%',
                background: dashboardStats.avgAttendance >= 75 
                  ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                  : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }} gutterBottom>
                  Avg. Attendance
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.avgAttendance}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Overall performance
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Classes
                </Typography>
                {todaySessions.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body1" color="textSecondary">
                      No sessions scheduled for today
                    </Typography>
                    <Button 
                      variant="outlined" 
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/teacher/sessions')}
                    >
                      Create Session
                    </Button>
                  </Paper>
                ) : (
                  <List>
                    {todaySessions.slice(0, 3).map((session, index) => (
                      <ListItem key={session.id || index} sx={{ px: 0 }}>
                        <ListItemText 
                          primary={`${session.className || 'Unknown Class'}`}
                          secondary={
                            session.scheduledTime 
                              ? new Date(session.scheduledTime).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : 'Time not set'
                          }
                        />
                        <Chip 
                          label={session.status || 'Scheduled'}
                          color={
                            session.status === 'active' ? 'success' :
                            session.status === 'completed' ? 'default' : 'primary'
                          }
                          size="small"
                        />
                        {session.status !== 'completed' && (
                          <Button 
                            variant="contained" 
                            size="small" 
                            sx={{ ml: 1 }}
                            onClick={() => navigate(`/teacher/sessions/${session.id}`)}
                          >
                            {session.status === 'active' ? 'Continue' : 'Start Session'}
                          </Button>
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<QrCodeScanner />}
                    onClick={() => navigate('/teacher/attendance')}
                    fullWidth
                    disabled={todaySessions.length === 0}
                  >
                    Take Attendance
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Schedule />}
                    onClick={() => navigate('/teacher/sessions')}
                    fullWidth
                  >
                    Create New Session
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => navigate('/teacher/reports')}
                    fullWidth
                  >
                    View Reports
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClassIcon />}
                    onClick={() => navigate('/teacher/classes')}
                    fullWidth
                  >
                    Manage Classes
                  </Button>
                </Box>
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
                {user?.firstName?.charAt(0) || 'T'}
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
              T
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Teacher Panel
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
              T
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Teacher Panel
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
          <Route path="/sessions" element={<SessionsManagement />} />
          <Route path="/attendance" element={<div>Take Attendance (Coming Soon)</div>} />
          <Route path="/students" element={<StudentsPanel />} />
          <Route path="/reports" element={<ReportsPanel />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default TeacherDashboard;