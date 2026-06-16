import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getDashboardStats, getPackages, getBookings, updateBookingStatus, createPackage, updatePackage, deletePackage, getBuses, getNotifications } from '../api/api';
import { Package, Calendar, DollarSign, CheckCircle, XCircle, Clock, RefreshCw, Plus, Edit, Trash2, Upload, X, Bell } from 'lucide-react';

const AdminDashboard = ({ notificationsList, setNotificationsList, unreadCount, onMarkAsRead, onMarkAllAsRead, onRefreshNotifications }) => {
  const [stats, setStats] = useState({
    total_bookings: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    cancelled_bookings: 0,
    total_revenue: 0,
    available_packages: 0,
    recent_bookings: []
  });
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [buses, setBuses] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);

  // Form state
  const [packageForm, setPackageForm] = useState({
    package_name: '',
    destination: '',
    days: '',
    nights: '',
    price: '',
    description: '',
    bus_id: '',
    travel_date: '',
    return_date: '',
    image: null
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsRes = await getDashboardStats();
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      // Fetch packages
      const packagesRes = await getPackages();
      if (packagesRes.data.success) {
        setPackages(packagesRes.data.data || []);
      }

      // Fetch bookings
      const bookingsRes = await getBookings();
      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data || []);
      }

      // Fetch buses
      const busesRes = await getBuses();
      if (busesRes.data.success) {
        setBuses(busesRes.data.data || []);
      }

      // Fetch notifications via prop
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Please upload a valid image file');
        return;
      }

      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPackageForm({ ...packageForm, image: reader.result });
        setImagePreview(reader.result);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setFormError('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPackageForm({ ...packageForm, image: null });
    setImagePreview(null);
  };

  // Handle package operations
  const handleAddPackage = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const { package_name, destination, days, nights, price, description, bus_id, travel_date, return_date, image } = packageForm;

    if (!package_name || !destination || !days || !nights || !price || !bus_id || !travel_date || !return_date) {
      setFormError('Please fill in all required fields');
      setFormLoading(false);
      return;
    }

    if (!image) {
      setFormError('Please upload a package image');
      setFormLoading(false);
      return;
    }

    // Frontend date validation
    const todayStr = new Date().toISOString().split('T')[0];
    if (travel_date < todayStr) {
      setFormError('Travel date cannot be in the past');
      setFormLoading(false);
      return;
    }
    if (return_date < travel_date) {
      setFormError('Return date must be on or after travel date');
      setFormLoading(false);
      return;
    }

    try {
      const response = await createPackage({
        package_name,
        destination,
        days: parseInt(days),
        nights: parseInt(nights),
        price: parseFloat(price),
        description: description || '',
        bus_id: parseInt(bus_id),
        travel_date,
        return_date,
        image_url: image
      });

      if (response.data.success) {
        alert('Package created successfully!');
        setIsAddModalOpen(false);
        resetForm();
        fetchAllData();
      } else {
        setFormError(response.data.error || 'Failed to create package');
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create package');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditPackage = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const { package_name, destination, days, nights, price, description, bus_id, travel_date, return_date } = packageForm;

    if (!package_name || !destination || !days || !nights || !price || !bus_id || !travel_date || !return_date) {
      setFormError('Please fill in all required fields');
      setFormLoading(false);
      return;
    }

    if (!packageForm.image) {
      setFormError('Please upload a package image');
      setFormLoading(false);
      return;
    }

    // Frontend date validation
    const todayStr = new Date().toISOString().split('T')[0];
    if (travel_date < todayStr) {
      setFormError('Travel date cannot be in the past');
      setFormLoading(false);
      return;
    }
    if (return_date < travel_date) {
      setFormError('Return date must be on or after travel date');
      setFormLoading(false);
      return;
    }

    try {
      const response = await updatePackage(editingPackageId, {
        package_name,
        destination,
        days: parseInt(days),
        nights: parseInt(nights),
        price: parseFloat(price),
        description: description || '',
        bus_id: parseInt(bus_id),
        travel_date,
        return_date,
        image_url: packageForm.image
      });

      if (response.data.success) {
        alert('Package updated successfully!');
        setIsEditModalOpen(false);
        resetForm();
        fetchAllData();
      } else {
        setFormError(response.data.error || 'Failed to update package');
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update package');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePackage = async (packageId, packageName) => {
    if (window.confirm(`Are you sure you want to delete "${packageName}"?`)) {
      try {
        const response = await deletePackage(packageId);
        if (response.data.success) {
          alert('Package deleted successfully');
          fetchAllData();
        } else {
          alert(response.data.error || 'Failed to delete package');
        }
      } catch (err) {
        alert('Failed to delete package');
      }
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    if (action === 'cancel') {
      const reason = prompt('Enter cancellation reason:');
      if (!reason) return;
      try {
        await updateBookingStatus(bookingId, action, reason);
        alert('Booking cancelled successfully');
        fetchAllData();
      } catch (error) {
        alert('Error cancelling booking');
      }
    } else {
      try {
        await updateBookingStatus(bookingId, action);
        alert(`Booking ${action}ed successfully`);
        fetchAllData();
      } catch (error) {
        alert(`Error ${action}ing booking`);
      }
    }
  };

  const openEditModal = (pkg) => {
    setEditingPackageId(pkg.package_id);
    setPackageForm({
      package_name: pkg.package_name,
      destination: pkg.destination,
      days: pkg.days,
      nights: pkg.nights,
      price: pkg.price,
      description: pkg.description || '',
      bus_id: pkg.bus_id ? pkg.bus_id.toString() : '',
      travel_date: pkg.travel_date ? pkg.travel_date.split(' ')[0] : '',
      return_date: pkg.return_date ? pkg.return_date.split(' ')[0] : '',
      image: pkg.image_url
    });
    setImagePreview(pkg.image_url);
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setPackageForm({
      package_name: '',
      destination: '',
      days: '',
      nights: '',
      price: '',
      description: '',
      bus_id: '',
      travel_date: '',
      return_date: '',
      image: null
    });
    setImagePreview(null);
    setFormError('');
  };

  const statCards = [
    { title: 'Total Bookings', value: stats.total_bookings || 0, icon: Calendar, color: 'bg-blue-500', targetTab: 'bookings' },
    { title: 'Pending Bookings', value: stats.pending_bookings || 0, icon: Clock, color: 'bg-yellow-500', targetTab: 'bookings' },
    { title: 'Confirmed Bookings', value: stats.confirmed_bookings || 0, icon: CheckCircle, color: 'bg-green-500', targetTab: 'bookings' },
    { title: 'Total Revenue', value: `₹${stats.total_revenue || 0}`, icon: DollarSign, color: 'bg-purple-500', targetTab: 'bookings' },
    { title: 'Active Packages', value: stats.available_packages || 0, icon: Package, color: 'bg-indigo-500', targetTab: 'packages' },
    { title: 'Cancelled Bookings', value: stats.cancelled_bookings || 0, icon: XCircle, color: 'bg-red-500', targetTab: 'bookings' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-secondary via-slate-800 to-slate-900 text-white relative overflow-hidden py-10 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <span className="text-primary font-black uppercase tracking-widest text-[10px] bg-primary/20 px-3 py-1 rounded-full border border-primary/20">
              Control Center
            </span>
            <h1 className="text-3xl font-black tracking-tight mt-2.5">Madhavan Tourism Control Panel</h1>
            <p className="text-slate-400 text-xs font-semibold mt-1">Real-time stats monitor, tour packages seeding, and customer bookings analytics.</p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-primary/20 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex space-x-2 py-4">
            {['dashboard', 'packages', 'bookings', 'notifications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div 
                  key={index} 
                  onClick={() => stat.targetTab && setActiveTab(stat.targetTab)}
                  className={`bg-white rounded-lg shadow-md p-6 ${stat.targetTab ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all duration-200' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-full`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">Recent Bookings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Booking No</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Package</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
                      stats.recent_bookings.map((booking) => (
                        <tr key={booking.booking_id} className="border-t">
                          <td className="px-4 py-2 font-medium">{booking.booking_no}</td>
                          <td className="px-4 py-2">{booking.customer_name}</td>
                          <td className="px-4 py-2">{booking.package_name}</td>
                          <td className="px-4 py-2">₹{booking.total_amount}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${booking.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                booking.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {booking.booking_status}
                            </span>
                          </td>
                          <td className="px-4 py-2">{new Date(booking.booking_date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-gray-500">No recent bookings</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Tour Packages</h2>
              <button
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
                className="flex items-center space-x-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                <span>Add Package</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Destination</th>
                    <th className="px-4 py-2 text-left">Duration</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Bus & Seats</th>
                    <th className="px-4 py-2 text-left">Travel Dates</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages && packages.length > 0 ? (
                    packages.map((pkg) => (
                      <tr key={pkg.package_id} className="border-t">
                        <td className="px-4 py-2">#{pkg.package_id}</td>
                        <td className="px-4 py-2 font-medium">{pkg.package_name}</td>
                        <td className="px-4 py-2">{pkg.destination}</td>
                        <td className="px-4 py-2">{pkg.days}D / {pkg.nights}N</td>
                        <td className="px-4 py-2 text-primary font-bold">₹{pkg.price}</td>
                        <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                          {pkg.bus_name ? `${pkg.bus_name} (${pkg.total_seats} seats)` : <span className="text-slate-400 italic">No Bus</span>}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-600 font-semibold">
                          {pkg.travel_date ? (
                            <div>
                              <div>{new Date(pkg.travel_date).toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-400">to {new Date(pkg.return_date).toLocaleDateString()}</div>
                            </div>
                          ) : <span className="text-slate-400 italic">No Dates</span>}
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{pkg.status}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => openEditModal(pkg)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded mx-1"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.package_id, pkg.package_name)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded mx-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-gray-500">No packages found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">All Bookings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Booking No</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Package</th>
                    <th className="px-4 py-2 text-left">Travel Date</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings && bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <tr key={booking.booking_id} className="border-t">
                        <td className="px-4 py-2 font-medium">{booking.booking_no}</td>
                        <td className="px-4 py-2">{booking.customer_name}</td>
                        <td className="px-4 py-2">{booking.package_name}</td>
                        <td className="px-4 py-2">{new Date(booking.travel_date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-primary font-bold">₹{booking.total_amount}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${booking.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                              booking.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {booking.booking_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">No bookings found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Activity & Audit Logs</h2>
                <p className="text-gray-500 text-xs mt-1">Real-time system events, bookings, package, and bus operations audit trail</p>
              </div>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white hover:bg-orange-600 rounded-lg text-xs font-bold transition cursor-pointer border-none"
                  >
                    <span>Mark All as Read</span>
                  </button>
                )}
                <button
                  onClick={fetchAllData}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition cursor-pointer border-none"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh Logs</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {notificationsList && notificationsList.length > 0 ? (
                <div className="relative border-l-2 border-gray-100 ml-4 pl-6 space-y-6">
                  {notificationsList.map((notif) => {
                    let Icon = Bell;
                    let iconBg = 'bg-blue-50 text-blue-600';
                    if (notif.notification_type === 'PACKAGE') {
                      Icon = Package;
                      iconBg = 'bg-indigo-50 text-indigo-600';
                    } else if (notif.notification_type === 'BUS') {
                      Icon = Clock;
                      iconBg = 'bg-purple-50 text-purple-600';
                    } else if (notif.notification_type === 'SCHEDULE') {
                      Icon = Calendar;
                      iconBg = 'bg-yellow-50 text-yellow-600';
                    } else if (notif.notification_type === 'BOOKING') {
                      if (notif.title.includes('Cancel')) {
                        Icon = XCircle;
                        iconBg = 'bg-rose-50 text-rose-600';
                      } else {
                        Icon = CheckCircle;
                        iconBg = 'bg-emerald-50 text-emerald-600';
                      }
                    }
                    
                    return (
                      <div key={notif.notification_id || notif.id} className="relative">
                        <div className={`absolute -left-[35px] top-0.5 rounded-full p-1.5 border-2 border-white ${iconBg}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        
                        <div className={`border rounded-xl p-4 transition duration-200 ${
                          !notif.is_read 
                            ? 'bg-primary/5 border-primary border-l-4' 
                            : 'bg-gray-50/70 hover:bg-gray-50 border-gray-100'
                        }`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-gray-800 flex items-center space-x-2">
                                <span>{notif.title}</span>
                                {!notif.is_read && (
                                  <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">
                                    New
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed font-semibold">{notif.message}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className="text-[10px] text-gray-400 font-semibold whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100">
                                {new Date(notif.created_at).toLocaleString()}
                              </span>
                              {!notif.is_read && (
                                <button
                                  onClick={() => onMarkAsRead(notif.notification_id)}
                                  className="text-[10px] bg-white hover:bg-gray-100 text-gray-600 hover:text-slate-900 border px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 shadow-sm cursor-pointer"
                                >
                                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                                  <span>Mark as Read</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {notif.reference_id && (
                            <div className="mt-2 text-[10px] text-gray-400 font-medium">
                              Ref ID: <span className="font-bold">#{notif.reference_id}</span> • Type: <span className="uppercase tracking-wider font-bold">{notif.notification_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                  <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-500">No activity logs recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Package Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Package</h3>

            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddPackage}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Package Name *"
                  value={packageForm.package_name}
                  onChange={(e) => setPackageForm({ ...packageForm, package_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <input
                  type="text"
                  placeholder="Destination *"
                  value={packageForm.destination}
                  onChange={(e) => setPackageForm({ ...packageForm, destination: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Days *"
                    value={packageForm.days}
                    onChange={(e) => setPackageForm({ ...packageForm, days: e.target.value })}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Nights *"
                    value={packageForm.nights}
                    onChange={(e) => setPackageForm({ ...packageForm, nights: e.target.value })}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <input
                  type="number"
                  placeholder="Price *"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <select
                  value={packageForm.bus_id}
                  onChange={(e) => setPackageForm({ ...packageForm, bus_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 bg-white"
                  required
                >
                  <option value="">Select Bus *</option>
                  {buses.map(bus => (
                    <option key={bus.bus_id} value={bus.bus_id}>
                      {bus.bus_name} ({bus.bus_number}) - {bus.total_seats} seats
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Travel Date *</label>
                    <input
                      type="date"
                      value={packageForm.travel_date}
                      onChange={(e) => setPackageForm({ ...packageForm, travel_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Return Date *</label>
                    <input
                      type="date"
                      value={packageForm.return_date}
                      onChange={(e) => setPackageForm({ ...packageForm, return_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700"
                      required
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Description"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />

                {/* Image Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-gray-600 text-sm">Click to upload image</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || uploadingImage}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Package</h3>

            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditPackage}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Package Name *"
                  value={packageForm.package_name}
                  onChange={(e) => setPackageForm({ ...packageForm, package_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <input
                  type="text"
                  placeholder="Destination *"
                  value={packageForm.destination}
                  onChange={(e) => setPackageForm({ ...packageForm, destination: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Days *"
                    value={packageForm.days}
                    onChange={(e) => setPackageForm({ ...packageForm, days: e.target.value })}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Nights *"
                    value={packageForm.nights}
                    onChange={(e) => setPackageForm({ ...packageForm, nights: e.target.value })}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <input
                  type="number"
                  placeholder="Price *"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                <select
                  value={packageForm.bus_id}
                  onChange={(e) => setPackageForm({ ...packageForm, bus_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 bg-white"
                  required
                >
                  <option value="">Select Bus *</option>
                  {buses.map(bus => (
                    <option key={bus.bus_id} value={bus.bus_id}>
                      {bus.bus_name} ({bus.bus_number}) - {bus.total_seats} seats
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Travel Date *</label>
                    <input
                      type="date"
                      value={packageForm.travel_date}
                      onChange={(e) => setPackageForm({ ...packageForm, travel_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Return Date *</label>
                    <input
                      type="date"
                      value={packageForm.return_date}
                      onChange={(e) => setPackageForm({ ...packageForm, return_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700"
                      required
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Description"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />

                {/* Image Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-gray-600 text-sm">Click to upload image</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;