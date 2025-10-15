import axios from 'axios';

// API base configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// User API functions
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getCurrentUser: () => api.get('/users/me'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  updateCurrentUser: (userData) => api.put('/users/me', userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  uploadAvatar: (formData) => api.put('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Class API functions
export const classAPI = {
  getClasses: (params) => api.get('/classes', { params }),
  getClassById: (id) => api.get(`/classes/${id}`),
  getClassStudents: (id) => api.get(`/classes/${id}/students`),
  getClassSessions: (id) => api.get(`/classes/${id}/sessions`),
  createClass: (classData) => api.post('/classes', classData),
  updateClass: (id, classData) => api.put(`/classes/${id}`, classData),
  deleteClass: (id) => api.delete(`/classes/${id}`),
  uploadStudents: (classId, formData) => api.post(`/classes/${classId}/students/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Student API functions
export const studentAPI = {
  getStudents: (params) => api.get('/students', { params }),
  getStudentById: (id) => api.get(`/students/${id}`),
  createStudent: (studentData) => api.post('/students', studentData),
  updateStudent: (id, studentData) => api.put(`/students/${id}`, studentData),
  deleteStudent: (id) => api.delete(`/students/${id}`),
  updateStudentStatus: (id, status) => api.patch(`/students/${id}/status`, { status }),
  enrollBiometric: (id, biometricData) => api.post(`/students/${id}/biometric/enroll`, biometricData),
  verifyBiometric: (id, biometricData) => api.post(`/students/${id}/biometric/verify`, biometricData),
};

// Session API functions
export const sessionAPI = {
  getSessions: (params) => api.get('/session', { params }),
  getSessionsList: (params) => api.get('/session/list', { params }),
  getSessionById: (id) => api.get(`/session/${id}`),
  startSession: (sessionData) => api.post('/session/start', sessionData),
  endSession: (id) => api.post(`/session/${id}/end`),
  extendSession: (id, duration) => api.put(`/session/${id}/extend`, { duration }),
  getSessionLogs: (id) => api.get(`/session/${id}/logs`),
  getSessionAttendanceSummary: (id) => api.get(`/session/${id}/attendance-summary`),
  subscribeToSession: (id) => api.get(`/session/${id}/subscribe`),
};

// Check-in API functions
export const checkinAPI = {
  checkInQR: (data) => api.post('/checkin/qr', data),
  checkInFace: (data) => api.post('/checkin/face', data),
};

// Device API functions
export const deviceAPI = {
  registerDevice: (deviceData) => api.post('/device/register', deviceData),
  syncDevice: (id, syncData) => api.post(`/device/${id}/sync`, syncData),
};

// Admin API functions
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getOverview: () => api.get('/admin/overview'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSystemStats: () => api.get('/admin/system-stats'),
};

// Analytics API functions
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getClassReport: (classId) => api.get(`/analytics/class/${classId}/reports`),
  getStudentAttendance: (studentId) => api.get(`/analytics/student/${studentId}/attendance`),
};

// Notifications API functions
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  createNotification: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

// Teacher API functions
export const teacherAPI = {
  getTeachers: (params) => api.get('/teachers', { params }),
  getTeacherById: (id) => api.get(`/teachers/${id}`),
  createTeacher: (teacherData) => api.post('/teachers', teacherData),
  updateTeacher: (id, teacherData) => api.put(`/teachers/${id}`, teacherData),
  deleteTeacher: (id) => api.delete(`/teachers/${id}`),
  getTeacherClasses: (id) => api.get(`/teachers/${id}/classes`),
};

export default api;