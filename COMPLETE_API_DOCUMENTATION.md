# 🎯 Complete API Documentation & Frontend Integration Guide

## 📚 **Table of Contents**
1. [Authentication APIs](#authentication-apis)
2. [User Management APIs](#user-management-apis)
3. [Class Management APIs](#class-management-apis)
4. [Student Management APIs](#student-management-apis)
5. [Session Management APIs](#session-management-apis)
6. [Check-in & Attendance APIs](#check-in--attendance-apis)
7. [Device Management APIs](#device-management-apis)
8. [Admin APIs](#admin-apis)
9. [Analytics & Reports APIs](#analytics--reports-apis)
10. [Teacher APIs](#teacher-apis)
11. [Notification APIs](#notification-apis)
12. [Frontend Architecture Recommendations](#frontend-architecture-recommendations)
13. [Integration Examples](#integration-examples)

---

## 🔐 **Authentication APIs**
**Base URL**: `http://localhost:8000/auth`

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher" // optional: admin, teacher, student
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "userId",
    "firstName": "John",
    "role": "teacher"
  }
}
```

### 3. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "tokenId:rawToken"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "tokenId:rawToken" // optional
}
```

### 5. Claim Student Account
```http
POST /auth/claim
Content-Type: application/json

{
  "claimCode": "ABC123",
  "email": "student@example.com",
  "password": "password123"
}
```

---

## 👤 **User Management APIs**
**Base URL**: `http://localhost:8000/users`
**Authentication**: Required (Bearer Token)

### 1. Get Current User Profile
```http
GET /users/me
Authorization: Bearer <token>

Response:
{
  "id": "userId",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "teacher",
  "profilePicture": "uploads/avatars/filename.jpg",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### 2. Update Current User Profile
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "password": "newPassword123" // optional
}
```

### 3. Get User by ID
```http
GET /users/:id
Authorization: Bearer <token>
```

### 4. Upload Avatar
```http
PUT /users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
avatar: <image file> (max 5MB)

Response:
{
  "ok": true,
  "profilePicture": "uploads/avatars/filename.jpg",
  "url": "http://localhost:8000/uploads/avatars/filename.jpg"
}
```

---

## 🏫 **Class Management APIs**
**Base URL**: `http://localhost:8000/classes`
**Authentication**: Required (Teacher/Admin only)

### 1. List Classes
```http
GET /classes
Authorization: Bearer <token>
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
```

### 2. Create Class
```http
POST /classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mathematics 101",
  "section": "A",
  "description": "Basic mathematics course"
}
```

### 3. Get Class by ID
```http
GET /classes/:id
Authorization: Bearer <token>
```

### 4. Update Class
```http
PUT /classes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Mathematics 101",
  "section": "B"
}
```

### 5. Delete Class
```http
DELETE /classes/:id
Authorization: Bearer <token>
```

### 6. Get Class Students
```http
GET /classes/:id/students
Authorization: Bearer <token>
```

### 7. Bulk Upload Students (CSV)
```http
POST /classes/:id/students/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
csvFile: <CSV file>
createUsers: true/false

CSV Format:
name,rollNo,email
John Doe,101,john@example.com
Jane Smith,102,jane@example.com
```

---

## 🎓 **Student Management APIs**
**Base URL**: `http://localhost:8000/students`
**Authentication**: Required (Teacher/Admin only for most endpoints)

### 1. List Students
```http
GET /students
Authorization: Bearer <token>
Query Parameters:
- classId: ObjectId
- page: number
- limit: number
- search: string
```

### 2. Create Student
```http
POST /students
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "rollNo": "101",
  "classId": "classObjectId",
  "email": "john@example.com", // optional
  "createUser": true // optional, creates user account if email provided
}

Response (if createUser: true):
{
  "ok": true,
  "student": {
    "id": "studentId",
    "name": "John Doe",
    "rollNo": "101",
    "userId": "userId"
  },
  "tempPassword": "temp123", // DEV only
  "inviteToken": "jwt-token" // DEV only
}

Response (if createUser: false):
{
  "ok": true,
  "student": {
    "id": "studentId",
    "name": "John Doe",
    "rollNo": "101"
  },
  "claimCode": "ABC123" // DEV only - for student to claim account
}
```

### 3. Update Student
```http
PUT /students/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "rollNo": "102"
}
```

### 4. Delete Student
```http
DELETE /students/:id
Authorization: Bearer <token>
```

### 5. Get Student by ID
```http
GET /students/:id
Authorization: Bearer <token>
```

### 6. Student Claim Account (Public)
```http
POST /students/claim
Content-Type: application/json

{
  "claimCode": "ABC123",
  "email": "student@example.com",
  "password": "password123"
}
```

### 7. Accept Invite Token
```http
POST /students/invite-accept
Content-Type: application/json

{
  "token": "jwt-invite-token",
  "password": "password123"
}
```

### 8. Generate QR Token for Student
```http
POST /students/:id/generate-qr
Authorization: Bearer <token>

Response:
{
  "ok": true,
  "qrToken": "unique-qr-token"
}
```

---

## 📅 **Session Management APIs**
**Base URL**: `http://localhost:8000/session`
**Authentication**: Required (Teacher/Admin)

### 1. List Sessions
```http
GET /session
Authorization: Bearer <token>
Query Parameters:
- classId: ObjectId
- status: active/ended
- page: number
- limit: number
```

### 2. Create Session
```http
POST /session
Authorization: Bearer <token>
Content-Type: application/json

{
  "classId": "classObjectId",
  "name": "Math Class Session", // optional
  "duration": 60 // optional, minutes
}

Response:
{
  "ok": true,
  "session": {
    "id": "sessionId",
    "classId": "classId",
    "qrToken": "session-qr-token",
    "status": "active",
    "createdAt": "timestamp"
  }
}
```

### 3. End Session
```http
PUT /session/:id/end
Authorization: Bearer <token>

Response:
{
  "ok": true,
  "session": {
    "id": "sessionId",
    "status": "ended",
    "endedAt": "timestamp"
  },
  "attendanceSummary": {
    "totalStudents": 30,
    "presentCount": 25,
    "absentCount": 5,
    "attendanceRate": 83.33
  }
}
```

### 4. Get Session QR Code
```http
GET /session/:id/qr
Authorization: Bearer <token>

Response:
{
  "qrToken": "session-qr-token",
  "qrData": "attendance_check_in|sessionId|qrToken"
}
```

### 5. Get Session Attendance Summary
```http
GET /session/:id/attendance-summary
Authorization: Bearer <token>

Response:
{
  "sessionId": "sessionId",
  "classId": "classId",
  "totalStudents": 30,
  "presentCount": 25,
  "absentCount": 5,
  "attendanceRate": 83.33,
  "attendanceList": [
    {
      "studentId": "studentId",
      "name": "John Doe",
      "rollNo": "101",
      "status": "present",
      "checkInTime": "timestamp"
    }
  ]
}
```

---

## ✅ **Check-in & Attendance APIs**
**Base URL**: `http://localhost:8000/checkin`
**Authentication**: Required

### 1. QR Code Check-in
```http
POST /checkin/qr
Authorization: Bearer <token>
Content-Type: application/json

{
  "qrData": "attendance_check_in|sessionId|qrToken"
}

Response:
{
  "ok": true,
  "message": "Attendance marked successfully",
  "attendanceLog": {
    "sessionId": "sessionId",
    "studentId": "studentId",
    "status": "present",
    "timestamp": "checkin-time"
  }
}
```

### 2. Manual Check-in (Teacher)
```http
POST /checkin/manual
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "sessionId",
  "studentId": "studentId",
  "status": "present" // present, absent, late
}
```

### 3. Face Recognition Check-in
```http
POST /checkin/face
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
sessionId: sessionId
image: <face image file>

Response:
{
  "ok": true,
  "student": {
    "id": "studentId",
    "name": "John Doe"
  },
  "confidence": 0.95,
  "attendanceMarked": true
}
```

---

## 📱 **Device Management APIs**
**Base URL**: `http://localhost:8000/device`
**Authentication**: Required (Teacher/Admin)

### 1. Register Device
```http
POST /device/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Classroom Scanner 1"
}

Response:
{
  "deviceId": "deviceObjectId",
  "secret": "device-secret-key"
}
```

### 2. Submit Attendance Event
```http
POST /device/events
Authorization: Bearer <device-secret>
Content-Type: application/json

{
  "sessionId": "sessionId",
  "studentId": "studentId",
  "eventType": "checkin",
  "timestamp": "2023-01-01T10:00:00.000Z",
  "metadata": {
    "method": "qr_scan",
    "confidence": 0.98
  }
}
```

---

## 🛠 **Admin APIs**
**Base URL**: `http://localhost:8000/admin`
**Authentication**: Required (Admin only)

### 1. List All Users
```http
GET /admin/users
Authorization: Bearer <token>
Query Parameters:
- page: number
- limit: number
- role: admin/teacher/student
- search: string
- status: active/inactive
```

### 2. Create User
```http
POST /admin/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher"
}
```

### 3. Update User
```http
PUT /admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "role": "admin",
  "status": "active"
}
```

### 4. Delete User
```http
DELETE /admin/users/:id
Authorization: Bearer <token>
```

### 5. Admin Dashboard Overview
```http
GET /admin/overview
Authorization: Bearer <token>

Response:
{
  "totalUsers": 150,
  "usersByRole": {
    "admin": 2,
    "teacher": 20,
    "student": 128
  },
  "totalClasses": 25,
  "totalStudents": 128,
  "totalSessions": 500,
  "recentActivity": {
    "newUsers": 5,
    "newSessions": 12,
    "attendanceEvents": 340
  }
}
```

### 6. Get Audit Logs
```http
GET /admin/audit-logs
Authorization: Bearer <token>
Query Parameters:
- page: number
- limit: number
- action: string
- userId: ObjectId
- startDate: ISO date
- endDate: ISO date
```

### 7. System Statistics
```http
GET /admin/system-stats
Authorization: Bearer <token>

Response:
{
  "collections": {
    "users": 150,
    "classes": 25,
    "students": 500,
    "sessions": 1200,
    "attendanceLogs": 15000
  },
  "performance": {
    "avgResponseTime": "120ms",
    "uptime": "99.9%"
  },
  "storage": {
    "totalSize": "2.5GB",
    "avatarStorage": "500MB"
  }
}
```

---

## 📊 **Analytics & Reports APIs**
**Base URL**: `http://localhost:8000/analytics`
**Authentication**: Required

### 1. Class Attendance Analytics
```http
GET /analytics/class/:id/attendance
Authorization: Bearer <token>
Query Parameters:
- startDate: ISO date
- endDate: ISO date
- granularity: day/week/month

Response:
{
  "classId": "classId",
  "className": "Mathematics 101",
  "period": {
    "start": "2023-01-01",
    "end": "2023-01-31"
  },
  "overallStats": {
    "totalSessions": 20,
    "avgAttendanceRate": 85.5,
    "totalStudents": 30
  },
  "trends": [
    {
      "date": "2023-01-01",
      "attendanceCount": 25,
      "totalStudents": 30,
      "rate": 83.33
    }
  ],
  "studentStats": [
    {
      "studentId": "id",
      "name": "John Doe",
      "attendanceRate": 90.0,
      "presentCount": 18,
      "absentCount": 2
    }
  ]
}
```

### 2. Student Attendance Analytics
```http
GET /analytics/student/:id/attendance
Authorization: Bearer <token>
Query Parameters:
- startDate: ISO date
- endDate: ISO date
```

### 3. Teacher Analytics
```http
GET /analytics/teacher/:id/overview
Authorization: Bearer <token>

Response:
{
  "teacherId": "teacherId",
  "teacherName": "John Teacher",
  "classesCount": 3,
  "totalStudents": 90,
  "totalSessions": 60,
  "avgAttendanceRate": 87.5,
  "classBreakdown": [
    {
      "classId": "classId",
      "className": "Math 101",
      "studentsCount": 30,
      "sessionsCount": 20,
      "attendanceRate": 85.0
    }
  ]
}
```

### 4. Attendance Trends
```http
GET /analytics/attendance-trends
Authorization: Bearer <token>
Query Parameters:
- period: week/month/semester
- classId: ObjectId (optional)
```

### 5. Export Attendance Report
```http
GET /analytics/export/attendance
Authorization: Bearer <token>
Query Parameters:
- format: csv/pdf
- classId: ObjectId
- startDate: ISO date
- endDate: ISO date

Response: File download (CSV/PDF)
```

---

## 👨‍🏫 **Teacher APIs**
**Base URL**: `http://localhost:8000/`
**Authentication**: Required (Teacher/Admin)

### 1. Override Attendance
```http
POST /session/:id/override
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentId": "studentId",
  "status": "present", // present, absent, late
  "reason": "Manual correction by teacher"
}
```

### 2. Teacher Reports
```http
GET /teacher/:id/reports
Authorization: Bearer <token>
Query Parameters:
- from: ISO date
- to: ISO date
```

---

## 🔔 **Notification APIs**
**Base URL**: `http://localhost:8000/notifications`
**Authentication**: Required

### 1. Get User Notifications
```http
GET /notifications
Authorization: Bearer <token>
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- unreadOnly: boolean (default: false)

Response:
{
  "notifications": [
    {
      "id": "notificationId",
      "title": "Attendance Reminder",
      "message": "Please mark your attendance for Math class",
      "type": "info", // info, success, warning, error
      "read": false,
      "readAt": null,
      "actionUrl": "/session/123",
      "createdAt": "timestamp"
    }
  ],
  "total": 25,
  "unreadCount": 5,
  "page": 1,
  "limit": 20,
  "pages": 2
}
```

### 2. Create Notification (Admin/System)
```http
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "targetUserId",
  "title": "Attendance Alert",
  "message": "Your attendance is below 75%",
  "type": "warning",
  "actionUrl": "/attendance/summary"
}
```

### 3. Mark Notification as Read
```http
PUT /notifications/:id/read
Authorization: Bearer <token>
```

### 4. Mark All Notifications as Read
```http
PUT /notifications/mark-all-read
Authorization: Bearer <token>
```

### 5. Delete Notification
```http
DELETE /notifications/:id
Authorization: Bearer <token>
```

---

## 🎨 **Frontend Architecture Recommendations**

### **Recommended Tech Stack:**

#### **Core Framework:**
- **React 18+** with TypeScript
- **Next.js 14+** for full-stack features (optional but recommended)
- **Vite** for fast development (if not using Next.js)

#### **State Management:**
- **Zustand** (lightweight) or **Redux Toolkit** (complex apps)
- **TanStack Query (React Query)** for server state management

#### **UI Framework:**
- **Material-UI (MUI)** - Professional, comprehensive
- **Ant Design** - Rich components, good for admin dashboards
- **Chakra UI** - Simple, modular
- **Tailwind CSS** - Utility-first, highly customizable

#### **Form Handling:**
- **React Hook Form** with **Zod** validation
- **Formik** (alternative)

#### **Routing:**
- **React Router v6** (SPA)
- **Next.js App Router** (if using Next.js)

#### **HTTP Client:**
- **Axios** with interceptors
- **Fetch API** with custom wrapper
- **TanStack Query** for data fetching

#### **Authentication:**
- **JWT tokens** in memory + **httpOnly cookies** for refresh tokens
- **React Context** for auth state
- **Protected Route** components

#### **Additional Tools:**
- **Chart.js** or **Recharts** for analytics
- **date-fns** or **Day.js** for date handling
- **QR Code Scanner** libraries
- **Camera access** for face recognition
- **PWA** capabilities for mobile

### **Project Structure:**
```
client/
├── public/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components
│   │   ├── forms/          # Form components
│   │   ├── charts/         # Chart components
│   │   └── layout/         # Layout components
│   ├── pages/              # Route components
│   │   ├── auth/           # Login, register, etc.
│   │   ├── dashboard/      # Role-based dashboards
│   │   ├── classes/        # Class management
│   │   ├── students/       # Student management
│   │   ├── attendance/     # Attendance tracking
│   │   └── analytics/      # Reports and analytics
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   ├── useApi.ts       # API calling hook
│   │   └── useSocket.ts    # WebSocket hook
│   ├── services/           # API service layer
│   │   ├── api.ts          # Base API client
│   │   ├── auth.ts         # Auth services
│   │   ├── classes.ts      # Class services
│   │   └── students.ts     # Student services
│   ├── store/              # State management
│   │   ├── authStore.ts    # Auth state
│   │   └── uiStore.ts      # UI state
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Utility functions
│   ├── constants/          # App constants
│   └── styles/             # Global styles
├── package.json
└── README.md
```

---

## 🔧 **Integration Examples**

### **1. Authentication Service**
```typescript
// services/auth.ts
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export class AuthService {
  private static instance: AuthService;
  
  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    
    return response.data;
  }

  async register(userData: RegisterData) {
    const response = await axios.post(`${API_BASE}/auth/register`, userData);
    return response.data;
  }

  async refreshToken() {
    const response = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      withCredentials: true // for httpOnly cookies
    });
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    
    return response.data;
  }

  logout() {
    localStorage.removeItem('accessToken');
    axios.post(`${API_BASE}/auth/logout`, {}, {
      withCredentials: true
    });
  }

  getToken() {
    return localStorage.getItem('accessToken');
  }
}
```

### **2. API Client with Interceptors**
```typescript
// services/api.ts
import axios, { AxiosResponse } from 'axios';
import { AuthService } from './auth';

const authService = AuthService.getInstance();

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await authService.refreshToken();
        const token = authService.getToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

### **3. Authentication Hook**
```typescript
// hooks/useAuth.ts
import { useState, useEffect, useContext, createContext } from 'react';
import { AuthService } from '../services/auth';

interface User {
  id: string;
  firstName: string;
  role: 'admin' | 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = AuthService.getInstance();

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          // Verify token by getting user profile
          const userData = await apiClient.get('/users/me');
          setUser(userData.data);
        } catch (error) {
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### **4. Protected Route Component**
```typescript
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### **5. Class Management Service**
```typescript
// services/classes.ts
import apiClient from './api';

export interface Class {
  id: string;
  name: string;
  section: string;
  description?: string;
  teacherId: string;
  studentsCount: number;
  createdAt: string;
}

export class ClassService {
  async getClasses(page = 1, limit = 20) {
    const response = await apiClient.get(`/classes?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createClass(classData: Omit<Class, 'id' | 'teacherId' | 'studentsCount' | 'createdAt'>) {
    const response = await apiClient.post('/classes', classData);
    return response.data;
  }

  async updateClass(id: string, classData: Partial<Class>) {
    const response = await apiClient.put(`/classes/${id}`, classData);
    return response.data;
  }

  async deleteClass(id: string) {
    const response = await apiClient.delete(`/classes/${id}`);
    return response.data;
  }

  async getClassStudents(id: string) {
    const response = await apiClient.get(`/classes/${id}/students`);
    return response.data;
  }

  async uploadStudentsCSV(classId: string, file: File, createUsers = false) {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('createUsers', createUsers.toString());

    const response = await apiClient.post(
      `/classes/${classId}/students/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}
```

### **6. Dashboard Components Example**
```typescript
// components/dashboard/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await apiClient.get('/admin/overview');
        setOverview(response.data);
      } catch (error) {
        console.error('Failed to fetch overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <h1>Welcome back, {user?.firstName}!</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{overview?.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Total Classes</h3>
          <p>{overview?.totalClasses}</p>
        </div>
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{overview?.totalStudents}</p>
        </div>
        <div className="stat-card">
          <h3>Total Sessions</h3>
          <p>{overview?.totalSessions}</p>
        </div>
      </div>

      <div className="user-breakdown">
        <h3>Users by Role</h3>
        {overview?.usersByRole && Object.entries(overview.usersByRole).map(([role, count]) => (
          <div key={role} className="role-stat">
            <span>{role}:</span> <span>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🚀 **Quick Start Frontend Development**

### **Step 1: Project Setup**
```bash
# Using Vite + React + TypeScript
npm create vite@latest attendance-frontend -- --template react-ts
cd attendance-frontend
npm install

# Install additional dependencies
npm install axios @tanstack/react-query react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install @hookform/resolvers react-hook-form zod
npm install date-fns recharts qr-scanner
```

### **Step 2: Environment Setup**
```typescript
// .env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Attendance Management System
```

### **Step 3: Basic App Structure**
```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/*" element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/*" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 📱 **Mobile App Considerations**

If you want to create a mobile app later:

### **React Native**
- Use **Expo** for rapid development
- **React Navigation** for routing
- **AsyncStorage** for token storage
- **React Native Camera** for QR scanning
- **Push notifications** for attendance reminders

### **Progressive Web App (PWA)**
- Add **service worker** for offline capability
- **Camera API** for QR scanning
- **Push notifications** via web APIs
- **App-like** installation on mobile devices

---

## 🎯 **Next Steps**

1. **Choose your frontend stack** (React + TypeScript recommended)
2. **Set up the project structure** using the provided template
3. **Start with authentication** (login/register pages)
4. **Build role-based dashboards** progressively
5. **Implement QR scanning** for attendance
6. **Add real-time features** with WebSockets
7. **Create analytics dashboards** with charts
8. **Add mobile responsiveness**
9. **Implement PWA features**
10. **Deploy and test** end-to-end

Your backend is solid and ready to support a full-featured frontend application! 🚀