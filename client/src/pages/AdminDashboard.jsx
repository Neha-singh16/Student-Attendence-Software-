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
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  AccountCircle,
  Settings,
  Logout,
  Analytics,
  Devices,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminData } from '../hooks/useAdminData';
import UsersManagement from './admin/UsersManagement';
import StudentsManagement from './admin/StudentsManagement';
import ClassesManagement from './admin/ClassesManagement';

const drawerWidth = 260;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { 
    dashboardStats, 
    recentSessions, 
    classes,
    isLoading,
    error,
  } = useAdminData();

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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Teachers', icon: <SchoolIcon />, path: '/admin/teachers' },
    { text: 'Students', icon: <PeopleIcon />, path: '/admin/students' },
    { text: 'Classes', icon: <ClassIcon />, path: '/admin/classes' },
    { text: 'Analytics', icon: <Analytics />, path: '/admin/analytics' },
    { text: 'Devices', icon: <Devices />, path: '/admin/devices' },
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

    if (error) {
      return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography variant="h6" gutterBottom>
              Error Loading Dashboard Data
            </Typography>
            <Typography variant="body2">
              {error.message || 'Unable to fetch dashboard data. Please try refreshing the page.'}
            </Typography>
          </Paper>
        </Container>
      );
    }

    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            {isNewUser() ? `Welcome, ${user?.firstName}!` : `Welcome back, ${user?.firstName}!`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            System Overview & Management
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
                  Total Students
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.totalStudents}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.totalStudents === 0 ? 'No students registered' : 'Registered students'}
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
                  Total Teachers
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.totalTeachers}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Active faculty members
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
                  Active Classes
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.activeClasses}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  Out of {dashboardStats.totalClasses} total
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
                  Today's Attendance
                </Typography>
                <Typography variant="h3" component="div" sx={{ fontWeight: 700, my: 1 }}>
                  {dashboardStats.todaysAttendance}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {dashboardStats.todaysAttendance >= 75 ? 'Good performance' : 'Needs attention'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} lg={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sessions
                </Typography>
                {recentSessions.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body1" color="textSecondary">
                      No recent sessions found
                    </Typography>
                  </Paper>
                ) : (
                  <List>
                    {recentSessions.map((session, index) => (
                      <ListItem key={session.id || index} sx={{ px: 0, borderBottom: index < recentSessions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <ListItemText 
                          primary={`${session.className || 'Unknown Class'}`}
                          secondary={`${session.teacherName || 'Unknown Teacher'} • ${session.scheduledTime ? new Date(session.scheduledTime).toLocaleString() : 'Time not set'}`}
                        />
                        <Chip 
                          label={session.status || 'Scheduled'}
                          color={
                            session.status === 'active' ? 'success' :
                            session.status === 'completed' ? 'default' : 'primary'
                          }
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Stats
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Users
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {dashboardStats.totalUsers}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Student-Teacher Ratio
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {dashboardStats.totalTeachers > 0 ? Math.round(dashboardStats.totalStudents / dashboardStats.totalTeachers) : 0}:1
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Classes per Teacher
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {dashboardStats.totalTeachers > 0 ? (dashboardStats.totalClasses / dashboardStats.totalTeachers).toFixed(1) : 0}
                    </Typography>
                  </Box>
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
                {user?.firstName?.charAt(0) || 'A'}
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
              A
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Admin Panel
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
              A
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Admin Panel
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
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/teachers" element={<div>Teachers Management (Coming Soon)</div>} />
          <Route path="/students" element={<StudentsManagement />} />
          <Route path="/classes" element={<ClassesManagement />} />
          <Route path="/analytics" element={<div>Analytics (Coming Soon)</div>} />
          <Route path="/devices" element={<div>Devices Management (Coming Soon)</div>} />
        </Routes>
      </Box>
    </Box>
  );
};

export default AdminDashboard;