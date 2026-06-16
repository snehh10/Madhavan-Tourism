import axios from 'axios';

const API_BASE_URL = 'https://madhavan-tourism-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Package APIs
export const getPackages = () => api.get('/packages/');
export const getPackage = (id) => api.get(`/packages/${id}/`);
export const createPackage = (data) => api.post('/packages/', data);
export const updatePackage = (id, data) => api.put(`/packages/${id}/`, data);
export const deletePackage = (id) => api.delete(`/packages/${id}/`);

// Schedule APIs
export const getPackageSchedules = (packageId) => api.get(`/packages/${packageId}/schedules/`);
export const getAllSchedules = () => api.get('/schedules/');
export const getScheduleById = (scheduleId) => api.get(`/schedules/?schedule_id=${scheduleId}`);

// Bus APIs
export const getBuses = () => api.get('/buses/');
export const createBus = (data) => api.post('/buses/', data);
export const createSchedule = (data) => api.post('/schedules/', data);

// Seat APIs
export const getSeats = (scheduleId) => api.get(`/schedules/${scheduleId}/seats/`);

// Booking APIs
export const createBooking = (data) => api.post('/bookings/', data);
export const getBookings = (mobile = null) => {
  const url = mobile ? `/bookings/?mobile=${mobile}` : '/bookings/';
  return api.get(url);
};
export const updateBookingStatus = (id, action, cancel_reason = '') => 
  api.put(`/bookings/${id}/`, { action, cancel_reason });

// Dashboard APIs
export const getDashboardStats = () => api.get('/dashboard/stats/');

// Language APIs
export const getTranslations = (langCode) => api.get(`/translations/${langCode}/`);

// Admin Auth APIs
export const adminLogin = (username, password) => api.post('/admin/login/', { username, password });
export const adminLogout = () => api.post('/admin/logout/');

// Notifications API
export const getNotifications = () => api.get('/notifications/');
export const markNotificationsRead = (notificationId = null, markAll = false) => api.put('/notifications/', { notification_id: notificationId, mark_all: markAll });

export default api;