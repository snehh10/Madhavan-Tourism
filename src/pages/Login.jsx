import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminLogin } from '../api/api';
import { Lock, User, LogIn, Phone, Mail, MapPin, Home, ArrowRight, UserPlus } from 'lucide-react';

const Login = ({ handleLogin, translations }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    customer_name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    address: ''
  });
  const [forgotForm, setForgotForm] = useState({
    identifier: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { identifier, password } = loginForm;
    if (!identifier || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    try {
      // 1. Try Admin Login first via API if identifier matches typical admin username
      if (trimmedIdentifier.toLowerCase() === 'admin') {
        const response = await adminLogin(trimmedIdentifier, trimmedPassword);
        if (response.data.success) {
          localStorage.setItem('admin_token', response.data.token);
          localStorage.setItem('admin_name', response.data.admin.name);
          handleLogin('admin', { name: response.data.admin.name, username: 'admin' });
          const redirectUrl = location.state?.from || '/admin';
          navigate(redirectUrl);
          return;
        }
      }
    } catch (err) {
      // If admin credentials fail, show error and don't proceed to user check if it was specifically 'admin'
      setError(err.response?.data?.error || 'Invalid Admin Credentials');
      setLoading(false);
      return;
    }

    // 2. Try Customer Login from LocalStorage
    try {
      const storedUsers = JSON.parse(localStorage.getItem('tourism_registered_users') || '[]');
      const user = storedUsers.find(
        (u) => (
          u.mobile?.trim() === trimmedIdentifier || 
          u.email?.trim().toLowerCase() === trimmedIdentifier.toLowerCase() ||
          u.customer_name?.trim().toLowerCase() === trimmedIdentifier.toLowerCase()
        ) && u.password?.trim() === trimmedPassword
      );

      if (user) {
        localStorage.setItem('customer_user', JSON.stringify(user));
        handleLogin('customer', user);
        const redirectUrl = location.state?.from || '/profile';
        navigate(redirectUrl);
      } else {
        setError(translations.invalid_credentials || 'Invalid username, mobile number, or password.');
      }
    } catch (err) {
      setError('Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { customer_name, mobile, email, password, confirmPassword, city, address } = registerForm;

    const trimmedName = customer_name.trim();
    const trimmedMobile = mobile.trim();
    const trimmedEmail = email ? email.trim() : '';
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedCity = city ? city.trim() : '';
    const trimmedAddress = address ? address.trim() : '';

    // Validation
    if (!trimmedName || !trimmedMobile || !trimmedPassword || !trimmedConfirmPassword) {
      setError('Please fill in all required fields (*)');
      setLoading(false);
      return;
    }

    // Name: letters and spaces, min 3 chars
    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    if (!nameRegex.test(trimmedName)) {
      setError('Name must contain only alphabets and spaces, and be at least 3 characters long.');
      setLoading(false);
      return;
    }

    // Mobile: exactly 10 digits
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      setError('Mobile number must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    // Email: if provided, must match standard format
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }
    }

    // Password: min 6 chars
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError(translations.passwords_do_not_match || 'Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const storedUsers = JSON.parse(localStorage.getItem('tourism_registered_users') || '[]');
      
      // Check if user already exists
      const userExists = storedUsers.some(
        (u) => u.mobile.trim() === trimmedMobile || (trimmedEmail && u.email?.trim().toLowerCase() === trimmedEmail.toLowerCase())
      );
      if (userExists) {
        setError('A user with this mobile number or email is already registered.');
        setLoading(false);
        return;
      }

      // Add new user
      const newUser = {
        customer_id: Date.now(), // Generate local unique ID
        customer_name: trimmedName,
        mobile: trimmedMobile,
        email: trimmedEmail,
        password: trimmedPassword,
        city: trimmedCity,
        address: trimmedAddress
      };

      storedUsers.push(newUser);
      localStorage.setItem('tourism_registered_users', JSON.stringify(storedUsers));
      
      setSuccess(translations.register_success || 'Registration successful! You can now log in.');
      // Reset register form
      setRegisterForm({
        customer_name: '',
        mobile: '',
        email: '',
        password: '',
        confirmPassword: '',
        city: '',
        address: ''
      });
      // Switch tab to login
      setTimeout(() => {
        setActiveTab('login');
        setError('');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { identifier, newPassword, confirmNewPassword } = forgotForm;

    if (!identifier || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const storedUsers = JSON.parse(localStorage.getItem('tourism_registered_users') || '[]');
      const userIndex = storedUsers.findIndex(
        (u) => u.mobile === identifier || u.email === identifier
      );

      if (userIndex !== -1) {
        // Update user password
        storedUsers[userIndex].password = newPassword;
        localStorage.setItem('tourism_registered_users', JSON.stringify(storedUsers));
        
        setSuccess('Password updated successfully! Redirecting to login...');
        setForgotForm({ identifier: '', newPassword: '', confirmNewPassword: '' });
        
        setTimeout(() => {
          setActiveTab('login');
          setError('');
          setSuccess('');
        }, 1500);
      } else {
        setError('No registered account found with that mobile number or email.');
      }
    } catch (err) {
      setError('Password reset error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-secondary via-slate-900 to-primary/30 py-12 px-6 sm:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center">
          <span className="text-sm font-bold text-primary tracking-widest uppercase mb-1 block">
            Madhavan Tourism
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {activeTab === 'login' ? (translations.sign_in_title || 'Sign In') : activeTab === 'register' ? (translations.register_title || 'Create Account') : 'Reset Password'}
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            className={`w-1/2 pb-3 text-center font-bold border-b-2 text-sm transition-all duration-300 ${
              activeTab === 'login' 
                ? 'border-primary text-primary font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {translations.login_tab || 'Login'}
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            className={`w-1/2 pb-3 text-center font-bold border-b-2 text-sm transition-all duration-300 ${
              activeTab === 'register' 
                ? 'border-primary text-primary font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {translations.register_tab || 'Register'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold">
            {success}
          </div>
        )}

        {activeTab === 'login' ? (
          /* LOGIN FORM */
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {translations.username_mobile || 'Username or Mobile Number'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    className="input-field pl-10 h-12"
                    placeholder="Enter admin, mobile or email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {translations.password || 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="input-field pl-10 h-12"
                    placeholder="Enter password"
                  />
                </div>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); setError(''); setSuccess(''); }}
                  className="text-xs font-bold text-primary hover:text-primary-hover transition cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 flex justify-center items-center space-x-2 text-sm font-bold shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span>{translations.signing_in || 'Signing in...'}</span>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>{translations.sign_in || 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        ) : activeTab === 'register' ? (
          /* REGISTER FORM */
          <form className="mt-8 space-y-4" onSubmit={handleRegisterSubmit}>
            <div className="grid grid-cols-1 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {translations.full_name || 'Full Name *'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={registerForm.customer_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, customer_name: e.target.value })}
                    className="input-field pl-9 py-2 text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Mobile & Email in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {translations.mobile_number || 'Mobile Number *'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={registerForm.mobile}
                      onChange={(e) => setRegisterForm({ ...registerForm, mobile: e.target.value })}
                      className="input-field pl-9 py-2 text-sm"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {translations.email || 'Email'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="input-field pl-9 py-2 text-sm"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Passwords in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {translations.password || 'Password *'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="input-field pl-9 py-2 text-sm"
                      placeholder="Minimum 6 chars"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {translations.confirm_password || 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="input-field pl-9 py-2 text-sm"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {translations.city || 'City'}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                    className="input-field pl-9 py-2 text-sm"
                    placeholder="Ahmedabad"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {translations.address || 'Address'}
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    className="input-field pl-9 py-2 text-sm"
                    placeholder="Flat, Street, Area"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 mt-4 flex justify-center items-center space-x-2 text-sm font-bold shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span>{translations.creating_account || 'Creating account...'}</span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{translations.create_account || 'Create Account'}</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form className="mt-8 space-y-4" onSubmit={handleForgotSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={forgotForm.identifier}
                    onChange={(e) => setForgotForm({ ...forgotForm, identifier: e.target.value })}
                    className="input-field pl-10 h-12"
                    placeholder="Enter registered mobile or email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                    className="input-field pl-10 h-12"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={forgotForm.confirmNewPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, confirmNewPassword: e.target.value })}
                    className="input-field pl-10 h-12"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 flex justify-center items-center space-x-2 text-sm font-bold shadow-lg shadow-primary/20 mt-6"
            >
              {loading ? (
                <span>Resetting...</span>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;