import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Packages from './pages/Packages';
import PackageDetail from './pages/PackageDetail';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { getTranslations, adminLogout, getNotifications, markNotificationsRead } from './api/api';
import { localTranslations } from './utils/translations';
import { Bell, X } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'customer'
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    const customerUser = localStorage.getItem('customer_user');

    if (adminToken) {
      setIsAuthenticated(true);
      setUserRole('admin');
      setCurrentUser({ name: localStorage.getItem('admin_name') || 'Admin', username: 'admin' });
    } else if (customerUser) {
      try {
        const parsed = JSON.parse(customerUser);
        setIsAuthenticated(true);
        setUserRole('customer');
        setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem('customer_user');
      }
    }
    loadTranslations('en');
  }, []);

  const addToast = (title, message, type) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch and poll notifications if admin
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    let previousNotificationIds = new Set();

    const fetchNotificationsData = async (isFirstLoad = false) => {
      try {
        const res = await getNotifications();
        if (res.data.success && isMounted) {
          const fetchedNotifs = res.data.data || [];
          setNotifications(fetchedNotifs);

          const unread = fetchedNotifs.filter(n => !n.is_read).length;
          setUnreadCount(unread);

          if (!isFirstLoad) {
            fetchedNotifs.forEach(notif => {
              if (!previousNotificationIds.has(notif.notification_id)) {
                if (!notif.is_read) {
                  addToast(notif.title, notif.message, notif.notification_type);
                }
              }
            });
          }

          previousNotificationIds = new Set(fetchedNotifs.map(n => n.notification_id));
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotificationsData(true);

    const interval = setInterval(() => {
      fetchNotificationsData(false);
    }, 8000); // Poll every 8 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, userRole]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await markNotificationsRead(id);
      if (res.data.success) {
        setNotifications(prev =>
          prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markNotificationsRead(null, true);
      if (res.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const loadTranslations = async (langCode) => {
    try {
      const response = await getTranslations(langCode);
      const backendData = response.data.success ? response.data.data : {};
      const localData = localTranslations[langCode] || localTranslations['en'];
      setTranslations({
        ...localData,
        ...backendData
      });
    } catch (error) {
      console.error('Error loading translations:', error);
      setTranslations(localTranslations[langCode] || localTranslations['en']);
    }
  };

  const handleLanguageChange = async (langCode) => {
    setLanguage(langCode);
    await loadTranslations(langCode);
  };

  const handleLogin = (role, data) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setCurrentUser(data);
  };

  const handleLogout = async () => {
    if (userRole === 'admin') {
      try {
        await adminLogout();
      } catch (error) {
        console.error('Backend logout failed:', error);
      }
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('customer_user');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans transition-colors duration-300">
        <Navbar
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          currentUser={currentUser}
          onLogout={handleLogout}
          language={language}
          onLanguageChange={handleLanguageChange}
          translations={translations}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home language={language} translations={translations} />} />
            <Route path="/packages" element={<Packages language={language} translations={translations} />} />
            <Route
              path="/packages/:id"
              element={<PackageDetail language={language} translations={translations} userRole={userRole} />}
            />
            <Route
              path="/booking/:scheduleId"
              element={<Booking language={language} translations={translations} currentUser={currentUser} userRole={userRole} />}
            />
            <Route path="/my-bookings" element={<MyBookings language={language} translations={translations} />} />
            <Route
              path="/admin"
              element={
                isAuthenticated && userRole === 'admin' ? (
                  <AdminDashboard
                    notificationsList={notifications}
                    setNotificationsList={setNotifications}
                    unreadCount={unreadCount}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onRefreshNotifications={() => {
                      getNotifications().then(res => {
                        if (res.data.success) {
                          setNotifications(res.data.data || []);
                          setUnreadCount(res.data.data.filter(n => !n.is_read).length);
                        }
                      });
                    }}
                  />
                ) : <Navigate to="/login" />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  userRole === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/profile" />
                ) : (
                  <Login handleLogin={handleLogin} translations={translations} />
                )
              }
            />
            <Route
              path="/profile"
              element={
                isAuthenticated && userRole === 'customer' ? (
                  <Profile
                    translations={translations}
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    onLogout={handleLogout}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>

        {/* Toast Container */}
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 p-4 animate-slide-in flex items-start space-x-3 backdrop-blur-md bg-opacity-95"
            >
              <div className="bg-primary/25 p-2 rounded-lg text-primary">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-white flex justify-between items-center">
                  <span>{toast.title}</span>
                  <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase animate-pulse">New</span>
                </h5>
                <p className="text-xs text-slate-300 mt-1">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Router>
  );
}

export default App;