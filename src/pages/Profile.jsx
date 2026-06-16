import React, { useState, useEffect } from 'react';
import { getBookings, updateBookingStatus } from '../api/api';
import { User, Phone, Mail, MapPin, Home, Calendar, Bus, Clock, CheckCircle, XCircle, Edit, Save, RefreshCw } from 'lucide-react';

const Profile = ({ translations, currentUser, setCurrentUser, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ ...currentUser });
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserBookings();
  }, [currentUser]);

  const fetchUserBookings = async () => {
    if (!currentUser?.mobile) return;
    setLoadingBookings(true);
    try {
      const response = await getBookings(currentUser.mobile);
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    const reason = prompt("Enter cancellation reason (optional):") || "Cancelled by customer";
    try {
      const response = await updateBookingStatus(bookingId, 'cancel', reason);
      if (response.data.success) {
        alert("Booking cancelled successfully.");
        fetchUserBookings();
      } else {
        alert("Failed to cancel booking: " + response.data.error);
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Error cancelling booking. Please try again.");
    }
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileData.customer_name || !profileData.mobile) {
      setError('Name and Mobile Number are required.');
      return;
    }

    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    if (!nameRegex.test(profileData.customer_name.trim())) {
      setError('Name must contain only alphabets and spaces, and be at least 3 characters long.');
      return;
    }

    if (profileData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    try {
      const storedUsers = JSON.parse(localStorage.getItem('tourism_registered_users') || '[]');
      
      // Update in registered users array
      const updatedUsers = storedUsers.map((user) => {
        if (user.customer_id === currentUser.customer_id || user.mobile === currentUser.mobile) {
          return {
            ...user,
            ...profileData
          };
        }
        return user;
      });

      localStorage.setItem('tourism_registered_users', JSON.stringify(updatedUsers));
      
      // Update current user session
      const updatedUserSession = { ...currentUser, ...profileData };
      localStorage.setItem('customer_user', JSON.stringify(updatedUserSession));
      setCurrentUser(updatedUserSession);
      
      setSuccess(translations.profile_update_success || 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <span className="text-sm font-bold text-primary tracking-widest uppercase mb-1 block">
          {translations.user_dashboard || 'User Dashboard'}
        </span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
          {translations.my_profile || 'My Profile'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            {/* Gradient Header */}
            <div className="h-32 bg-gradient-to-r from-secondary to-slate-800 flex items-center justify-center relative">
              <div className="w-20 h-20 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center absolute -bottom-10">
                <User className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <div className="p-8 pt-14">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {success}
                </div>
              )}

              {!isEditing ? (
                /* Profile Display */
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800">{currentUser?.customer_name}</h3>
                    <p className="text-sm text-slate-400 font-semibold">{currentUser?.city || 'No City Specified'}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center space-x-3 text-slate-600">
                      <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.mobile || 'Mobile'}</p>
                        <p className="font-semibold text-slate-800">{currentUser?.mobile}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-600">
                      <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.email || 'Email'}</p>
                        <p className="font-semibold text-slate-800">{currentUser?.email || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-slate-600">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.city || 'City'}</p>
                        <p className="font-semibold text-slate-800">{currentUser?.city || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-slate-600">
                      <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.address || 'Address'}</p>
                        <p className="font-semibold text-slate-800">{currentUser?.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setIsEditing(true); setProfileData({ ...currentUser }); }}
                    className="btn-secondary w-full flex items-center justify-center space-x-2 text-sm mt-6"
                  >
                    <Edit className="h-4 w-4" />
                    <span>{translations.edit_profile || 'Edit Profile'}</span>
                  </button>
                </div>
              ) : (
                /* Profile Edit Form */
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {translations.full_name || 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.customer_name}
                      onChange={(e) => setProfileData({ ...profileData, customer_name: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {translations.mobile_number || 'Mobile Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={profileData.mobile}
                      onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                      className="input-field py-2 text-sm"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {translations.email || 'Email'}
                    </label>
                    <input
                      type="email"
                      value={profileData.email || ''}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {translations.city || 'City'}
                    </label>
                    <input
                      type="text"
                      value={profileData.city || ''}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      className="input-field py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {translations.address || 'Address'}
                    </label>
                    <textarea
                      value={profileData.address || ''}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="input-field py-2 text-sm"
                      rows="2"
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary w-1/2 text-xs py-2"
                    >
                      {translations.cancel || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary w-1/2 text-xs py-2 flex items-center justify-center space-x-1"
                    >
                      <Save className="h-4.5 w-4.5" />
                      <span>{translations.save_changes || 'Save'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: User Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">
                {translations.your_bookings || 'Your Bookings'}
              </h2>
              <button 
                onClick={fetchUserBookings} 
                className="text-primary hover:bg-primary/5 p-2 rounded-xl transition-all"
                title="Refresh Bookings"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {loadingBookings ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-semibold">{translations.no_bookings_yet || "You haven't booked any tours yet."}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {bookings.map((booking) => (
                  <div 
                    key={booking.booking_id} 
                    className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300"
                  >
                    {/* Header */}
                    <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">{translations.booking_id || 'Booking No'}</span>
                        <p className="font-bold text-slate-700">{booking.booking_no}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 border ${getStatusColor(booking.booking_status)}`}>
                        {getStatusIcon(booking.booking_status)}
                        <span>{booking.booking_status}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.package || 'Package'}</p>
                        <p className="font-semibold text-slate-800">{booking.package_name}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">{translations.travel_date || 'Travel Date'}</p>
                          <p className="font-semibold text-slate-800">{new Date(booking.travel_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Bus className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">{translations.bus || 'Bus'}</p>
                          <p className="font-semibold text-slate-800">{booking.bus_name} ({booking.bus_number})</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 p-1 rounded-lg text-primary flex-shrink-0 text-xs font-bold">₹</div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">{translations.total_amount || 'Total Amount'}</p>
                          <p className="font-semibold text-[#ff6b35]">₹{booking.total_amount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Passengers List */}
                    {booking.passengers && booking.passengers.length > 0 && (
                      <div className="px-6 pb-4 border-t border-slate-50 pt-4">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-2">Travelers</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {booking.passengers.map((p, idx) => (
                            <div key={idx} className="bg-slate-50 px-3 py-2 rounded-xl text-xs flex justify-between items-center border border-slate-100">
                              <span className="font-semibold text-slate-700">{p.passenger_name || 'N/A'}</span>
                              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 font-black">
                                Seat {p.seat_no} • {p.ticket_type === 'HALF' ? 'Half' : 'Full'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer notices */}
                    {booking.cancel_reason && (
                      <div className="bg-red-50/50 px-6 py-3 border-t border-red-100 flex items-start space-x-2">
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-800">
                          <strong>Cancellation Reason:</strong> {booking.cancel_reason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {booking.booking_status !== 'CANCELLED' && (
                      <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking.booking_id)}
                          className="px-4 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all border border-rose-100 cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
