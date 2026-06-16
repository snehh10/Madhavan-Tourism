import React, { useState } from 'react';
import { getBookings, updateBookingStatus } from '../api/api';
import { Search, Calendar, MapPin, Bus, IndianRupee, Clock, XCircle, CheckCircle } from 'lucide-react';

const MyBookings = ({ language, translations }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [bookings, setBookings] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchBookings = async () => {
    if (!mobileNumber) {
      alert('Please enter mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await getBookings(mobileNumber);
      if (response.data.success) {
        setBookings(response.data.data);
        setSearched(true);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      alert('Error fetching bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking? Please note that payments are non-refundable.")) {
      return;
    }
    const reason = prompt("Enter cancellation reason (optional):") || "Cancelled by customer";
    try {
      const response = await updateBookingStatus(bookingId, 'cancel', reason);
      if (response.data.success) {
        alert("Booking cancelled successfully.");
        searchBookings();
      } else {
        alert("Failed to cancel booking: " + response.data.error);
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Error cancelling booking. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'CONFIRMED': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 pb-20">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
            Tickets
          </span>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            {translations.my_bookings || 'My Bookings'}
          </h1>
          <p className="text-slate-400 text-sm font-semibold">
            Search and check the status of your booked tickets.
          </p>
        </div>
        
        {/* Search Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {translations.mobile_number || 'Mobile Number *'}
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="Enter registered mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="input-field pl-11 h-12"
                />
              </div>
            </div>
            <button 
              onClick={searchBookings}
              disabled={loading}
              className="btn-primary w-full md:w-auto h-12 flex items-center justify-center space-x-2 disabled:opacity-50 tracking-wide text-sm font-bold shadow-lg shadow-primary/10"
            >
              <span>{loading ? 'Searching...' : (translations.search || 'Search')}</span>
            </button>
          </div>
        </div>

        {/* Results Section */}
        {searched && (
          <div className="space-y-6">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-16 text-center">
                <Search className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-1">No Bookings Found</h3>
                <p className="text-slate-400 text-sm font-semibold">No bookings found for mobile number: <span className="font-bold text-slate-600">{mobileNumber}</span></p>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  Found {bookings.length} booking(s)
                </h2>
                
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-secondary to-slate-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">{translations.booking_id || 'Booking No'}</p>
                        <p className="font-black text-lg">{booking.booking_no}</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 border ${getStatusColor(booking.booking_status)}`}>
                        {getStatusIcon(booking.booking_status)}
                        <span className="uppercase">{booking.booking_status}</span>
                      </div>
                    </div>
                    
                    {/* Body Info */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.customer_name || 'Customer Name'}</p>
                        <p className="font-bold text-slate-700">{booking.customer_name}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase">{translations.mobile || 'Mobile'}</p>
                        <p className="font-bold text-slate-700">{booking.mobile}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase flex items-center">
                          <MapPin className="h-4 w-4 mr-1.5 text-primary" /> {translations.package || 'Package'}
                        </p>
                        <p className="font-bold text-slate-700">{booking.package_name}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase flex items-center">
                          <Calendar className="h-4 w-4 mr-1.5 text-primary" /> {translations.travel_date || 'Travel Date'}
                        </p>
                        <p className="font-bold text-slate-700">{new Date(booking.travel_date).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase flex items-center">
                          <Bus className="h-4 w-4 mr-1.5 text-primary" /> {translations.bus || 'Bus'}
                        </p>
                        <p className="font-bold text-slate-700">{booking.bus_name} ({booking.bus_number})</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase flex items-center">
                          <IndianRupee className="h-3.5 w-3.5 mr-1.5 text-primary" /> {translations.total_amount || 'Total Amount'}
                        </p>
                        <p className="font-black text-xl text-primary">₹{booking.total_amount}</p>
                      </div>
                    </div>

                    {/* Passengers List */}
                    {booking.passengers && booking.passengers.length > 0 && (
                      <div className="px-8 pb-4 border-t border-slate-50 pt-4">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-2">Travelers</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {booking.passengers.map((p, idx) => (
                            <div key={idx} className="bg-slate-50 px-3 py-2 rounded-xl text-xs flex justify-between items-center border border-slate-100">
                              <span className="font-semibold text-slate-700">{p.passenger_name || 'N/A'}</span>
                              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 font-black">
                                Seat {p.seat_no} ({parseInt(p.seat_no) && ((parseInt(p.seat_no) - 1) % 4 === 2 || (parseInt(p.seat_no) - 1) % 4 === 3) ? 'Driver' : 'Conductor'} Side) • {p.ticket_type === 'HALF' ? 'Half' : 'Full'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Cancellation & Pending Alerts */}
                    {booking.cancel_reason && (
                      <div className="bg-rose-50/50 p-4 border-t border-rose-100 flex items-start space-x-2.5">
                        <XCircle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-rose-800">
                          <strong>Cancellation Reason:</strong> {booking.cancel_reason}
                        </p>
                      </div>
                    )}
                    
                    {booking.booking_status === 'PENDING' && (
                      <div className="bg-yellow-50/50 p-4 border-t border-yellow-100 flex items-start space-x-2.5">
                        <Clock className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">
                          Your booking is pending confirmation. You will receive a notification once confirmed.
                        </p>
                      </div>
                    )}
                    
                    {booking.booking_status === 'CONFIRMED' && (
                      <div className="bg-emerald-50/50 p-4 border-t border-emerald-100 flex items-start space-x-2.5">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-800">
                          Your booking is confirmed! Please reach the boarding point on time.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {booking.booking_status !== 'CANCELLED' && (
                      <div className="bg-slate-50/50 px-8 py-3.5 border-t border-slate-100 flex justify-end">
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
        )}
      </div>
    </div>
  );
};

export default MyBookings;