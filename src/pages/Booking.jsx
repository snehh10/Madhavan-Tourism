import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeats, createBooking, getScheduleById } from '../api/api';
import { ArrowLeft, ArrowRight, CreditCard, User, Phone, Mail, MapPin, Home as HomeIcon, CheckCircle, Clock, Info, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';

const Booking = ({ language, translations, currentUser, userRole }) => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [successBookingData, setSuccessBookingData] = useState(null);
  
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    mobile: '',
    email: '',
    city: '',
    address: ''
  });

  // Prefill details if user is logged in
  useEffect(() => {
    if (currentUser && currentUser.customer_name) {
      setCustomerInfo({
        customer_name: currentUser.customer_name || '',
        mobile: currentUser.mobile || '',
        email: currentUser.email || '',
        city: currentUser.city || '',
        address: currentUser.address || ''
      });
    }
  }, [currentUser]);

  // Breakdown tickets (Full price vs Half price)
  const [passengers, setPassengers] = useState([]);
  const fullTickets = passengers.filter(p => p.type === 'FULL').length;
  const halfTickets = passengers.filter(p => p.type === 'HALF').length;
  
  // Extra room
  const [addExtraRoom, setAddExtraRoom] = useState(false);
  const [extraRoomsCount, setExtraRoomsCount] = useState(1);
  const ROOM_PRICE = 1500;

  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(1); // 1: Seat, 2: Details/Counters, 3: Summary/Payment App, 4: QR/Simulate

  // UPI payment apps
  const [selectedPaymentApp, setSelectedPaymentApp] = useState('gpay');
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    const customerUser = localStorage.getItem('customer_user');
    if (!adminToken && !customerUser) {
      alert('Please log in or register to book a tour.');
      navigate('/login', { state: { from: `/booking/${scheduleId}` } });
      return;
    }
    fetchData();
  }, [scheduleId, navigate]);

  // Update passengers list whenever selected seats or customer name changes
  useEffect(() => {
    setPassengers(prev => {
      return selectedSeats.map((seatId, idx) => {
        const existing = prev.find(p => p.seat_id === seatId);
        const seatObj = seats.find(s => s.seat_id === seatId);
        const seatNo = seatObj ? seatObj.seat_no : '';
        return existing || {
          seat_id: seatId,
          seat_no: seatNo,
          name: idx === 0 ? (customerInfo.customer_name || '') : '',
          type: 'FULL'
        };
      });
    });
  }, [selectedSeats, seats, customerInfo.customer_name]);

  // Alert admin if bus is full
  useEffect(() => {
    if (schedule && seats.length > 0) {
      const available = seats.length - seats.filter(s => s.is_booked).length;
      if (available <= 0 && userRole === 'admin') {
        alert('Bus was full');
      }
    }
  }, [schedule, seats, userRole]);

  const fetchData = async () => {
    try {
      const [seatsResponse, scheduleResponse] = await Promise.all([
        getSeats(scheduleId),
        getScheduleById(scheduleId)
      ]);
      
      if (seatsResponse.data.success) {
        setSeats(seatsResponse.data.data);
      }
      if (scheduleResponse.data.success && scheduleResponse.data.data.length > 0) {
        setSchedule(scheduleResponse.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeatSelection = (seatId) => {
    const seat = seats.find(s => s.seat_id === seatId);
    if (seat.is_booked && userRole !== 'admin') return;
    
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  const calculateFullTicketsCost = () => {
    if (!schedule) return 0;
    return schedule.price * fullTickets;
  };

  const calculateHalfTicketsCost = () => {
    if (!schedule) return 0;
    return (schedule.price * 0.5) * halfTickets;
  };

  const calculateRoomsCost = () => {
    return addExtraRoom ? extraRoomsCount * ROOM_PRICE : 0;
  };

  const calculateTotalAmount = () => {
    return calculateFullTicketsCost() + calculateHalfTicketsCost() + calculateRoomsCost();
  };

  const calculateAdvanceAmount = () => {
    return calculateTotalAmount() * 0.3;
  };

  const getSelectedSeatNumbers = () => {
    return selectedSeats.map(id => {
      const s = seats.find(seat => seat.seat_id === id);
      if (s) {
        const num = parseInt(s.seat_no);
        const side = (!isNaN(num) && ((num - 1) % 4 === 2 || (num - 1) % 4 === 3)) ? 'Driver' : 'Conductor';
        return `${s.seat_no} (${side} Side)`;
      }
      return id;
    }).join(', ');
  };

  const downloadPDFReceipt = (booking) => {
    const doc = new jsPDF();
    
    // Header section decoration
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text("MADHAVAN TOURISM", 15, 25);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text("Premium Travels & Tours", 15, 32);
    doc.text(`Booking Invoice: ${booking.booking_no}`, 135, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 135, 32);
    
    doc.setTextColor(51, 65, 85); // Slate-700
    
    // Customer Info
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text("Customer & Booking Information", 15, 55);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Customer Name: ${booking.customer_name}`, 15, 65);
    doc.text(`Mobile: ${booking.mobile}`, 15, 72);
    doc.text(`Email: ${booking.email || 'N/A'}`, 15, 79);
    doc.text(`Address: ${booking.address || 'N/A'}, ${booking.city || ''}`, 15, 86);
    
    doc.text(`Package: ${schedule?.package_name}`, 110, 65);
    doc.text(`Destination: ${schedule?.destination}`, 110, 72);
    doc.text(`Travel Date: ${new Date(schedule?.travel_date).toLocaleDateString()}`, 110, 79);
    doc.text(`Bus: ${schedule?.bus_name} (${schedule?.bus_number})`, 110, 86);
    doc.text(`Selected Seats: ${getSelectedSeatNumbers()}`, 110, 93);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(15, 100, 195, 100);
    
    let currentY = 110;
    
    // Traveler details list
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text("Traveler Details", 15, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    const passengersArray = booking.passengers || passengers || [];
    passengersArray.forEach((p, idx) => {
      const passengerName = p.passenger_name || p.name || 'N/A';
      const tType = p.ticket_type || p.type;
      const tText = tType === 'HALF' ? 'Half/Child (Age 5-11)' : 'Full/Adult (Age 12+)';
      
      const num = parseInt(p.seat_no);
      let sideText = '';
      if (!isNaN(num)) {
        const col = (num - 1) % 4;
        sideText = (col === 0 || col === 1) ? ' - Conductor Side' : ' - Driver Side';
      }

      doc.text(`Seat ${p.seat_no}${sideText}: ${passengerName} (${tText})`, 15, currentY);
      currentY += 7;
    });
    
    currentY += 3;
    doc.line(15, currentY, 195, currentY);
    currentY += 10;
    
    // Charges Breakdown
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text("Fare Details", 15, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text("Item Description", 15, currentY);
    doc.text("Qty", 120, currentY);
    doc.text("Rate", 150, currentY);
    doc.text("Amount", 180, currentY);
    currentY += 3;
    
    doc.line(15, currentY, 195, currentY);
    currentY += 7;
    
    doc.text(`Adult Ticket (Full Fare)`, 15, currentY);
    doc.text(`${fullTickets}`, 120, currentY);
    doc.text(`Rs. ${schedule?.price}`, 150, currentY);
    doc.text(`Rs. ${calculateFullTicketsCost()}`, 180, currentY);
    currentY += 8;
    
    if (halfTickets > 0) {
      doc.text(`Child Ticket (Half Fare)`, 15, currentY);
      doc.text(`${halfTickets}`, 120, currentY);
      doc.text(`Rs. ${(schedule?.price * 0.5)}`, 150, currentY);
      doc.text(`Rs. ${calculateHalfTicketsCost()}`, 180, currentY);
      currentY += 8;
    }
    
    if (addExtraRoom) {
      doc.text(`Extra Hotel Room`, 15, currentY);
      doc.text(`${extraRoomsCount}`, 120, currentY);
      doc.text(`Rs. ${ROOM_PRICE}`, 150, currentY);
      doc.text(`Rs. ${calculateRoomsCost()}`, 180, currentY);
      currentY += 8;
    }
    
    doc.line(15, currentY, 195, currentY);
    currentY += 8;
    
    doc.setFont('Helvetica', 'bold');
    doc.text("Total Booking Amount:", 15, currentY);
    doc.text(`Rs. ${calculateTotalAmount()}`, 180, currentY);
    currentY += 8;
    
    doc.setTextColor(239, 111, 38); // orange
    doc.text("Advance Paid (30%):", 15, currentY);
    doc.text(`Rs. ${calculateAdvanceAmount()}`, 180, currentY);
    currentY += 8;
    
    doc.setTextColor(51, 65, 85);
    doc.text("Balance Amount to Pay:", 15, currentY);
    doc.text(`Rs. ${(calculateTotalAmount() - calculateAdvanceAmount())}`, 180, currentY);
    currentY += 15;
    
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'oblique');
    doc.text("Thank you for booking with Madhavan Tourism! Please carry a copy of this ticket during travel.", 15, currentY);
    doc.text("Note: Advance booking deposit is non-refundable upon cancellation.", 15, currentY + 5);
    
    doc.save(`Ticket_${booking.booking_no}.pdf`);
  };

  const handleBooking = async (statusSimulation = 'SUCCESS') => {
    if (statusSimulation === 'FAILURE') {
      alert('Payment failed. Booking cancelled.');
      setShowSimulateModal(false);
      setBookingStep(3);
      return;
    }

    const isBusFull = availableSeats <= 0;
    if (isBusFull && userRole === 'admin') {
      alert('bus was full');
    }

    const bookingData = {
      ...customerInfo,
      package_id: schedule.package_id,
      schedule_id: parseInt(scheduleId),
      selected_seats: selectedSeats,
      passengers: passengers.map(p => ({
        seat_id: p.seat_id,
        name: p.name,
        type: p.type
      })),
      total_amount: calculateTotalAmount(),
      advance_amount: calculateAdvanceAmount(),
      balance_amount: calculateTotalAmount() - calculateAdvanceAmount(),
      payment_mode: selectedPaymentApp.toUpperCase()
    };
    
    try {
      const response = await createBooking(bookingData);
      if (response.data.success) {
        const fullBookingInfo = {
          booking_no: response.data.booking_no,
          ...bookingData
        };
        setSuccessBookingData(fullBookingInfo);
        setShowSimulateModal(false);
        setBookingStep(4);
        
        // Auto trigger download
        setTimeout(() => {
          try {
            downloadPDFReceipt(fullBookingInfo);
          } catch (err) {
            console.error("Auto PDF print error:", err);
          }
        }, 800);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Booking failed. Please try again.');
    }
  };

  const getSeatStatus = (seat) => {
    if (selectedSeats.includes(seat.seat_id)) return 'selected';
    if (seat.is_booked) return 'booked';
    return 'available';
  };

  const getSeatColor = (status) => {
    switch(status) {
      case 'available': return 'bg-[#00bda5] hover:bg-emerald-600 shadow-md shadow-emerald-500/10 text-white cursor-pointer';
      case 'selected': return 'bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 text-white cursor-pointer';
      case 'booked': return 'bg-slate-200 text-white font-black cursor-not-allowed';
      default: return 'bg-slate-300 text-white cursor-pointer';
    }
  };

  // Counters no longer needed as they are derived from passengers list.

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalSeats = seats.length;
  const bookedSeats = seats.filter(s => s.is_booked).length;
  const availableSeats = totalSeats - bookedSeats;

  // Generate simulated UPI payment link
  const upiString = `upi://pay?pa=madhavantourism@upi&pn=Madhavan%20Tourism&am=${calculateAdvanceAmount().toFixed(2)}&cu=INR&tn=Booking_${schedule?.package_name.replace(/\s+/g, '')}`;

  const paymentApps = [
    { id: 'gpay', name: 'Google Pay', color: 'from-[#4285F4] to-[#34A853]' },
    { id: 'paytm', name: 'Paytm', color: 'from-[#00b9f5] to-[#002e6e]' },
    { id: 'phonepe', name: 'PhonePe', color: 'from-[#5f259f] to-[#7f39d1]' },
    { id: 'bhim', name: 'BHIM UPI', color: 'from-[#ef7f1a] to-[#128a42]' }
  ];

  const currentApp = paymentApps.find(app => app.id === selectedPaymentApp) || paymentApps[0];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden relative">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary to-slate-800 text-white p-8">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {bookingStep === 4 ? (translations.booking_confirmed || 'Booking Confirmed!') : (translations.book_your_tour || 'Book Your Tour')}
            </h1>
            
            {/* Steps Progress */}
            {bookingStep < 4 && (
              <div className="flex justify-between items-center mt-8 max-w-xl mx-auto">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${bookingStep >= 1 ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-slate-700 text-slate-400'}`}>
                    1
                  </div>
                  <span className="text-xs font-semibold mt-2">{translations.select_seats || 'Select Seats'}</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-700 mx-2 -mt-4"></div>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${bookingStep >= 2 ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-slate-700 text-slate-400'}`}>
                    2
                  </div>
                  <span className="text-xs font-semibold mt-2">{translations.details || 'Details'}</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-700 mx-2 -mt-4"></div>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${bookingStep >= 3 ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 'bg-slate-700 text-slate-400'}`}>
                    3
                  </div>
                  <span className="text-xs font-semibold mt-2">{translations.payment || 'Payment'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            
            {/* Package Summary Box */}
            {bookingStep < 4 && (
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-xl text-slate-800 mb-1">{schedule?.package_name}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-semibold">
                    <span>📍 {schedule?.destination}</span>
                    <span>📅 {new Date(schedule?.travel_date).toLocaleDateString()}</span>
                    <span>🚌 {schedule?.bus_name} ({schedule?.bus_number})</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  availableSeats === 0 ? 'bg-red-100 text-red-700 border border-red-200' : 
                  availableSeats <= 10 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {availableSeats === 0 ? (translations.full || 'FULL') : availableSeats <= 10 ? `${availableSeats} ${translations.seats_left || 'seats left'}` : `${availableSeats} ${translations.seats_available || 'seats available'}`}
                </div>
              </div>
            )}

            {bookingStep < 4 && availableSeats <= 0 && userRole === 'admin' && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 text-sm text-red-800 font-bold">
                ⚠️ Warning: The bus is fully booked! Admin overbooking mode active.
              </div>
            )}

            {/* STEP 1: SEAT SELECTION */}
            {bookingStep === 1 && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">{translations.select_seats || 'Select Seats'}</h3>
                  {selectedSeats.length > 0 && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold">
                      {selectedSeats.length} Selected
                    </span>
                  )}
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-2xl mb-8">
                  {/* Bus Grid Layout Simulation */}
                  <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    {/* Front Wheel / Driver Area */}
                    <div className="flex justify-between items-center border-b pb-4 mb-6">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Front / Entry</div>
                      <div className="w-9 h-9 rounded-xl border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-50">
                        D
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {seats.map(seat => {
                        const status = getSeatStatus(seat);
                        return (
                          <button
                            key={seat.seat_id}
                            onClick={() => handleSeatSelection(seat.seat_id)}
                            disabled={seat.is_booked && userRole !== 'admin'}
                            className={`h-11 rounded-lg text-xs font-black transition-all flex items-center justify-center ${getSeatColor(status)}`}
                          >
                            {seat.seat_no}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status Legend */}
                <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-6 gap-4">
                  <div className="flex space-x-6 text-sm font-semibold">
                    <div className="flex items-center"><div className="w-3.5 h-3.5 bg-emerald-500 rounded mr-2"></div><span>{translations.available || 'Available'}</span></div>
                    <div className="flex items-center"><div className="w-3.5 h-3.5 bg-primary rounded mr-2"></div><span>{translations.selected || 'Selected'}</span></div>
                    <div className="flex items-center"><div className="w-3.5 h-3.5 bg-slate-200 rounded mr-2"></div><span>{translations.booked || 'Booked'}</span></div>
                  </div>
                  
                  <button 
                    onClick={() => selectedSeats.length > 0 && setBookingStep(2)}
                    disabled={selectedSeats.length === 0}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span>{translations.next || 'Next'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CUSTOMER DETAILS & BREAKDOWNS */}
            {bookingStep === 2 && (
              <div className="animate-fade-in space-y-8">
                
                {/* Information Fields */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4">{translations.customer_info || 'Customer Information'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={translations.full_name || 'Full Name *'}
                        value={customerInfo.customer_name}
                        onChange={(e) => setCustomerInfo({...customerInfo, customer_name: e.target.value})}
                        className="input-field pl-11"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder={translations.mobile_number || 'Mobile Number *'}
                        value={customerInfo.mobile}
                        onChange={(e) => setCustomerInfo({...customerInfo, mobile: e.target.value})}
                        className="input-field pl-11"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="email"
                        placeholder={translations.email || 'Email'}
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="input-field pl-11"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={translations.city || 'City'}
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                        className="input-field pl-11"
                      />
                    </div>
                    <div className="relative md:col-span-2">
                      <HomeIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                      <textarea
                        placeholder={translations.address || 'Address'}
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                        className="input-field pl-11"
                        rows="2"
                      />
                    </div>
                  </div>
                           {/* Passengers Name & Ticket Type inputs */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Info className="h-4.5 w-4.5 text-primary" />
                    <span>{translations.passengers_breakdown || 'Passengers Breakdown'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold mb-4">
                    Enter the name and configure ticket type for each of your {selectedSeats.length} travelers.
                  </p>
                  
                  <div className="space-y-4">
                    {passengers.map((passenger, index) => (
                      <div key={passenger.seat_id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-black">
                            Seat {passenger.seat_no}
                          </span>
                          <div className="relative mt-2">
                            <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              placeholder={`Traveler ${index + 1} Full Name *`}
                              value={passenger.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setPassengers(prev => prev.map(p => p.seat_id === passenger.seat_id ? { ...p, name: newName } : p));
                              }}
                              className="input-field pl-11"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 md:pt-6">
                          <button
                            type="button"
                            onClick={() => {
                              setPassengers(prev => prev.map(p => p.seat_id === passenger.seat_id ? { ...p, type: 'FULL' } : p));
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              passenger.type === 'FULL'
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Full Ticket (Age 12+)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPassengers(prev => prev.map(p => p.seat_id === passenger.seat_id ? { ...p, type: 'HALF' } : p));
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              passenger.type === 'HALF'
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/15'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Half Ticket (Age 5-11)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>           </div>

                {/* Extra Room Config */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800">{translations.room_options || 'Room Options'}</h4>
                    <p className="text-xs text-slate-400 font-semibold">{translations.room_charge_note || 'Extra Hotel Room Charge: ₹1,500 per room'}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={addExtraRoom} 
                        onChange={(e) => setAddExtraRoom(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4.5 h-4.5"
                      />
                      <span className="text-sm font-bold text-slate-700">{translations.extra_hotel_room || 'Need extra hotel room?'}</span>
                    </label>
                    
                    {addExtraRoom && (
                      <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-100">
                        <button 
                          type="button"
                          onClick={() => setExtraRoomsCount(Math.max(1, extraRoomsCount - 1))}
                          className="w-7 h-7 rounded bg-slate-100 font-bold text-xs"
                        >-</button>
                        <span className="font-bold text-sm w-4 text-center">{extraRoomsCount}</span>
                        <button 
                          type="button"
                          onClick={() => setExtraRoomsCount(extraRoomsCount + 1)}
                          className="w-7 h-7 rounded bg-slate-100 font-bold text-xs"
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nav buttons */}
                <div className="flex justify-between border-t pt-6">
                  <button onClick={() => setBookingStep(1)} className="btn-secondary flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{translations.back || 'Back'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (!customerInfo.customer_name || !customerInfo.mobile) {
                        alert('Please enter Name and Mobile number');
                        return;
                      }
                      
                      // Validate customer name
                      const nameRegex = /^[a-zA-Z\s]{3,}$/;
                      if (!nameRegex.test(customerInfo.customer_name.trim())) {
                        alert('Customer Name must contain only alphabets and spaces, and be at least 3 characters long.');
                        return;
                      }

                      // Validate customer mobile
                      const mobileRegex = /^\d{10}$/;
                      if (!mobileRegex.test(customerInfo.mobile)) {
                        alert('Mobile number must be exactly 10 digits.');
                        return;
                      }

                      // Validate email if entered
                      if (customerInfo.email) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(customerInfo.email)) {
                          alert('Please enter a valid email address.');
                          return;
                        }
                      }

                      // Validate all passenger names
                      for (let i = 0; i < passengers.length; i++) {
                        const p = passengers[i];
                        if (!p.name || !p.name.trim()) {
                          alert(`Please enter a name for Traveler in Seat ${p.seat_no}.`);
                          return;
                        }
                        if (!nameRegex.test(p.name.trim())) {
                          alert(`Name for Traveler in Seat ${p.seat_no} must contain only alphabets and spaces, and be at least 3 characters long.`);
                          return;
                        }
                      }

                      setBookingStep(3);
                    }} 
                    className="btn-primary flex items-center space-x-2"
                  >
                    <span>{translations.next || 'Next'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT SUMMARY & UPI SELECTION */}
            {bookingStep === 3 && (
              <div className="animate-fade-in space-y-8">
                <h3 className="font-bold text-lg text-slate-800">{translations.payment_summary || 'Payment Summary'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Pricing breakdown list */}
                  <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-500">
                      <span>{translations.number_of_seats || 'Number of Seats'}:</span>
                      <span className="font-black text-slate-700">{selectedSeats.length}</span>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-semibold">{translations.full_tickets || 'Full Tickets'} ({fullTickets} x ₹{schedule?.price}):</span>
                        <span className="font-bold text-slate-700">₹{calculateFullTicketsCost()}</span>
                      </div>
                      
                      {halfTickets > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-semibold">{translations.half_tickets || 'Half Tickets'} ({halfTickets} x ₹{(schedule?.price * 0.5)}):</span>
                          <span className="font-bold text-slate-700">₹{calculateHalfTicketsCost()}</span>
                        </div>
                      )}

                      {addExtraRoom && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-semibold">{translations.extra_rooms || 'Extra Rooms'} ({extraRoomsCount} x ₹{ROOM_PRICE}):</span>
                          <span className="font-bold text-slate-700">₹{calculateRoomsCost()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t pt-4">
                      <span className="text-slate-800 font-black text-lg">{translations.total_amount || 'Total Amount'}:</span>
                      <span className="font-black text-2xl text-slate-800">₹{calculateTotalAmount()}</span>
                    </div>

                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl">
                      <span className="text-primary font-bold text-sm">{translations.advance_payment || 'Advance Booking Deposit (30%)'}:</span>
                      <span className="font-black text-lg text-primary">₹{calculateAdvanceAmount()}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-500 font-semibold">
                      <span>{translations.balance_to_pay || 'Balance Amount to Pay'}:</span>
                      <span>₹{calculateTotalAmount() - calculateAdvanceAmount()}</span>
                    </div>

                    <p className="text-xs text-orange-600 bg-orange-50 p-2.5 rounded-lg font-bold border border-orange-100">
                      ⚠️ {translations.advance_non_refundable_note || 'Note: Advance booking deposit is non-refundable upon cancellation'}
                    </p>
                  </div>

                  {/* UPI Selector Column */}
                  <div className="md:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-500 uppercase tracking-widest mb-4">
                        {translations.select_payment_app || 'Select Payment App'}
                      </h4>
                      <div className="space-y-3">
                        {paymentApps.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedPaymentApp(app.id)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm ${
                              selectedPaymentApp === app.id
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{app.name}</span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedPaymentApp === app.id ? 'border-primary' : 'border-slate-300'
                            }`}>
                              {selectedPaymentApp === app.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t pt-6">
                  <button onClick={() => setBookingStep(2)} className="btn-secondary flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{translations.back || 'Back'}</span>
                  </button>
                  <button 
                    onClick={() => setShowSimulateModal(true)} 
                    className="btn-primary flex items-center space-x-2 bg-primary font-bold shadow-lg shadow-primary/20"
                  >
                    <CreditCard className="h-4.5 w-4.5" />
                    <span>{translations.confirm_booking_pay || 'Pay Advance & Confirm'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: BOOKING CONFIRMATION & BILL / PDF DOWNLOAD */}
            {bookingStep === 4 && successBookingData && (
              <div className="animate-fade-in text-center space-y-8 py-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {translations.booking_confirmed || 'Booking Confirmed!'}
                  </h2>
                  <p className="text-slate-500 font-semibold text-sm max-w-md mx-auto">
                    {translations.booking_success_msg || 'Your booking has been successfully confirmed! The PDF receipt has been saved to your device. You can also manually download it below.'}
                  </p>
                </div>

                {/* Booking summary card */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left max-w-xl mx-auto space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-xs text-slate-400 font-black uppercase tracking-wider">{translations.booking_no || 'Booking No'}</span>
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-lg">
                      {successBookingData.booking_no}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.customer_name || 'Customer Name'}</p>
                      <p className="text-slate-800 font-extrabold">{successBookingData.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.mobile || 'Mobile'}</p>
                      <p className="text-slate-800 font-extrabold">{successBookingData.mobile}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.package || 'Package'}</p>
                      <p className="text-slate-800 font-extrabold">{schedule?.package_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.travel_date || 'Travel Date'}</p>
                      <p className="text-slate-800 font-extrabold">{new Date(schedule?.travel_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.bus || 'Bus'}</p>
                      <p className="text-slate-800 font-extrabold">{schedule?.bus_name} ({schedule?.bus_number})</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-0.5">{translations.selected || 'Selected Seats'}</p>
                      <p className="text-slate-800 font-extrabold">{getSelectedSeatNumbers()}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>{translations.full_tickets || 'Full Tickets'} ({fullTickets})</span>
                      <span>₹{calculateFullTicketsCost()}</span>
                    </div>
                    {halfTickets > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>{translations.half_tickets || 'Half Tickets'} ({halfTickets})</span>
                        <span>₹{calculateHalfTicketsCost()}</span>
                      </div>
                    )}
                    {addExtraRoom && (
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>{translations.extra_rooms || 'Extra Rooms'} ({extraRoomsCount})</span>
                        <span>₹{calculateRoomsCost()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-black text-slate-800 border-t pt-2">
                      <span>{translations.total_amount || 'Total Amount'}</span>
                      <span>₹{calculateTotalAmount()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-primary bg-primary/5 p-2.5 rounded-xl">
                      <span>{translations.paid_amount || 'Amount Paid (Advance)'}</span>
                      <span>₹{successBookingData.advance_amount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => downloadPDFReceipt(successBookingData)}
                    className="w-full btn-primary py-3.5 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    <span>{translations.download_receipt || 'Download Ticket PDF'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (currentUser) {
                        navigate('/profile');
                      } else {
                        navigate('/my-bookings');
                      }
                    }}
                    className="w-full btn-secondary py-3.5 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{translations.go_to_bookings || 'Go to My Bookings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UPI SIMULATOR / QR MODAL OVERLAY */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-slate-100 animate-slide-in">
            
            {/* Header branding */}
            <div className={`bg-gradient-to-r ${currentApp.color} text-white p-5 rounded-2xl text-center mb-6`}>
              <h3 className="font-extrabold text-lg flex items-center justify-center space-x-1.5">
                <ShieldCheck className="h-5.5 w-5.5" />
                <span>Secure UPI Redirect via {currentApp.name}</span>
              </h3>
            </div>

            <div className="space-y-6 text-center">
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Amount to Pay</p>
                <p className="text-3xl font-black text-[#ff6b35] mt-1">₹{calculateAdvanceAmount().toFixed(2)}</p>
              </div>

              {/* Vector QR Code */}
              <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-100">
                <svg className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200/50 shadow-sm" viewBox="0 0 100 100">
                  <rect x="10" y="10" width="25" height="25" fill="none" stroke="#0f172a" stroke-width="4"/>
                  <rect x="15" y="15" width="15" height="15" fill="#0f172a"/>
                  <rect x="65" y="10" width="25" height="25" fill="none" stroke="#0f172a" stroke-width="4"/>
                  <rect x="70" y="15" width="15" height="15" fill="#0f172a"/>
                  <rect x="10" y="65" width="25" height="25" fill="none" stroke="#0f172a" stroke-width="4"/>
                  <rect x="15" y="70" width="15" height="15" fill="#0f172a"/>
                  <rect x="42" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="52" y="18" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="28" width="6" height="6" fill="#0f172a"/>
                  <rect x="12" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="22" y="48" width="6" height="6" fill="#0f172a"/>
                  <rect x="28" y="52" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="42" width="12" height="12" fill="#0f172a"/>
                  <rect x="58" y="48" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="58" width="6" height="6" fill="#0f172a"/>
                  <rect x="68" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="78" y="48" width="6" height="6" fill="#0f172a"/>
                  <rect x="82" y="52" width="6" height="12" fill="#0f172a"/>
                  <rect x="42" y="68" width="6" height="6" fill="#0f172a"/>
                  <rect x="52" y="74" width="6" height="6" fill="#0f172a"/>
                  <rect x="48" y="82" width="12" height="6" fill="#0f172a"/>
                  <rect x="68" y="68" width="12" height="6" fill="#0f172a"/>
                  <rect x="82" y="74" width="6" height="6" fill="#0f172a"/>
                  <rect x="74" y="82" width="6" height="12" fill="#0f172a"/>
                </svg>
              </div>

              {/* Mobile payment launcher deep link button */}
              <div>
                <a 
                  href={upiString} 
                  className="inline-flex items-center space-x-2 text-white bg-slate-800 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-700 text-sm transition-colors shadow-md shadow-slate-900/10"
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>Open {currentApp.name}</span>
                </a>
                <p className="text-xs text-slate-400 mt-2 font-semibold">
                  (UPI Intent links work on mobile devices with installed apps)
                </p>
              </div>

              <div className="border-t pt-5">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Simulation Controls</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleBooking('FAILURE')}
                    className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl border border-red-200 transition-colors text-sm"
                  >
                    Simulate Failure
                  </button>
                  <button
                    onClick={() => handleBooking('SUCCESS')}
                    className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 font-bold py-3 rounded-xl border border-green-200 transition-colors text-sm"
                  >
                    Simulate Success
                  </button>
                </div>
              </div>
            </div>

            {/* Close modal */}
            <button 
              onClick={() => setShowSimulateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;