import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, LogOut, Globe, Menu, X, User, Bell } from 'lucide-react';

const Navbar = ({ isAuthenticated, userRole, currentUser, onLogout, language, onLanguageChange, translations, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'gu', name: 'ગુજરાતી' }
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-all duration-300">
              <MapPin className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Madhavan Tourism
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-primary font-medium tracking-wide transition-colors">
              {translations.home || 'Home'}
            </Link>
            <Link to="/packages" className="text-gray-600 hover:text-primary font-medium tracking-wide transition-colors">
              {translations.packages || 'Packages'}
            </Link>
            <Link to="/my-bookings" className="text-gray-600 hover:text-primary font-medium tracking-wide transition-colors">
              {translations.my_bookings || 'My Bookings'}
            </Link>

            {/* Auth section */}
            <div className="flex items-center space-x-4 border-l pl-6 border-gray-200">
              {isAuthenticated ? (
                <div className="flex items-center space-x-6">
                  {userRole === 'admin' ? (
                    <div className="flex items-center space-x-4">
                      {/* Notifications Dropdown */}
                      <div className="relative">
                        <button 
                          onClick={() => setIsNotifOpen(!isNotifOpen)}
                          className="relative p-2 text-gray-600 hover:text-primary hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center justify-center"
                        >
                          <Bell className="h-6 w-6" />
                          {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </button>

                        {/* Dropdown Panel */}
                        {isNotifOpen && (
                          <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-slide-in">
                            <div className="px-4 pb-2 border-b flex justify-between items-center">
                              <span className="font-extrabold text-sm text-slate-800">Notifications</span>
                              {unreadCount > 0 && (
                                <button 
                                  onClick={() => { onMarkAllAsRead(); setIsNotifOpen(false); }}
                                  className="text-xs text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
                                >
                                  Mark all as read
                                </button>
                              )}
                            </div>
                            
                            <div className="max-h-72 overflow-y-auto mt-2">
                              {notifications && notifications.length > 0 ? (
                                notifications.slice(0, 5).map(notif => (
                                  <div 
                                    key={notif.notification_id} 
                                    onClick={() => {
                                      if (!notif.is_read) onMarkAsRead(notif.notification_id);
                                      navigate('/admin', { state: { activeTab: 'notifications' } });
                                      setIsNotifOpen(false);
                                    }}
                                    className={`px-4 py-3 hover:bg-slate-50 transition cursor-pointer flex items-start space-x-2.5 border-b border-gray-50 last:border-0 ${
                                      !notif.is_read ? 'bg-primary/5 border-l-4 border-primary' : ''
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 flex justify-between items-center">
                                        <span>{notif.title}</span>
                                        {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 ml-2"></span>}
                                      </p>
                                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{notif.message}</p>
                                      <p className="text-[9px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleTimeString()}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-gray-400 text-xs">
                                  <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                  No notifications
                                </div>
                              )}
                            </div>
                            
                            <div className="px-4 pt-2 border-t mt-1 text-center">
                              <button 
                                onClick={() => {
                                  navigate('/admin', { state: { activeTab: 'notifications' } });
                                  setIsNotifOpen(false);
                                }}
                                className="text-xs text-secondary hover:text-primary font-bold hover:underline w-full cursor-pointer bg-transparent border-none"
                              >
                                View all logs
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Link 
                        to="/admin" 
                        className="bg-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 shadow-sm transition-all whitespace-nowrap"
                      >
                        {translations.admin_dashboard || 'Admin Dashboard'}
                      </Link>
                    </div>
                  ) : (
                    <Link 
                      to="/profile" 
                      className="flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/15 transition-all"
                    >
                      <User className="h-4 w-4" />
                      <span>{currentUser?.customer_name || translations.profile || 'Profile'}</span>
                    </Link>
                  )}
                  <button 
                    onClick={handleLogoutClick} 
                    className="flex items-center space-x-2 text-gray-500 hover:text-red-500 font-semibold transition-colors text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{translations.logout || 'Logout'}</span>
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center space-x-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-hover shadow-md hover:shadow-primary/20 transition-all duration-300"
                >
                  <User className="h-4 w-4" />
                  <span>{translations.login_register || 'Login / Register'}</span>
                </Link>
              )}

              {/* Language Selector */}
              <div className="flex items-center space-x-1.5 ml-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                <Globe className="h-4 w-4 text-gray-500" />
                <select 
                  value={language} 
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="border-none bg-transparent focus:outline-none text-sm font-bold text-gray-600 cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center space-x-4 md:hidden">
            {/* Language Selector for mobile */}
            <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
              <Globe className="h-4 w-4 text-gray-500" />
              <select 
                value={language} 
                onChange={(e) => onLanguageChange(e.target.value)}
                className="border-none bg-transparent focus:outline-none text-xs font-bold text-gray-600 cursor-pointer"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="text-gray-600 hover:text-primary focus:outline-none p-1 bg-slate-50 rounded-lg" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-gray-100 animate-slide-in">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-primary font-semibold text-lg py-1 transition-colors" 
                onClick={() => setIsMenuOpen(false)}
              >
                {translations.home || 'Home'}
              </Link>
              <Link 
                to="/packages" 
                className="text-gray-700 hover:text-primary font-semibold text-lg py-1 transition-colors" 
                onClick={() => setIsMenuOpen(false)}
              >
                {translations.packages || 'Packages'}
              </Link>
              <Link 
                to="/my-bookings" 
                className="text-gray-700 hover:text-primary font-semibold text-lg py-1 transition-colors" 
                onClick={() => setIsMenuOpen(false)}
              >
                {translations.my_bookings || 'My Bookings'}
              </Link>

              <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
                {isAuthenticated ? (
                  <>
                    {userRole === 'admin' ? (
                      <Link 
                        to="/admin" 
                        className="bg-secondary text-white text-center py-2.5 rounded-xl font-bold shadow-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {translations.admin_dashboard || 'Admin Dashboard'}
                      </Link>
                    ) : (
                      <Link 
                        to="/profile" 
                        className="bg-primary/10 text-primary text-center py-2.5 rounded-xl font-bold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {currentUser?.customer_name || translations.profile || 'Profile'}
                      </Link>
                    )}
                    <button 
                      onClick={() => { handleLogoutClick(); setIsMenuOpen(false); }} 
                      className="w-full text-center text-red-500 font-bold py-2 border border-red-100 rounded-xl bg-red-50/50 hover:bg-red-50 transition-colors"
                    >
                      {translations.logout || 'Logout'}
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="bg-primary text-white text-center py-3 rounded-xl font-bold shadow-md" 
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {translations.login_register || 'Login / Register'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;