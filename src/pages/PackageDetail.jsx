import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPackage, getPackageSchedules } from '../api/api';
import { MapPin, Calendar, Clock, Users, Bus, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const PackageDetail = ({ language, translations, userRole }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackageDetails();
  }, [id]);

  const fetchPackageDetails = async () => {
    try {
      const [pkgRes, schedulesRes] = await Promise.all([
        getPackage(id),
        getPackageSchedules(id)
      ]);
      
      if (pkgRes.data.success) {
        setPackageData(pkgRes.data.data);
      }
      if (schedulesRes.data.success) {
        setSchedules(schedulesRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching package details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (scheduleId) => {
    if (!userRole) {
      alert('Please log in or register to book a tour.');
      navigate('/login', { state: { from: `/booking/${scheduleId}` } });
      return;
    }
    navigate(`/booking/${scheduleId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="container mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Package not found</h2>
        <button onClick={() => navigate('/packages')} className="btn-primary flex items-center space-x-2 mx-auto">
          <ArrowLeft className="h-4 w-4" />
          <span>{translations.back || 'Back'}</span>
        </button>
      </div>
    );
  }

  const upcomingSchedules = schedules || [];
  const hasSchedules = upcomingSchedules.length > 0;
  const allFull = hasSchedules && upcomingSchedules.every(s => (s.total_seats - (s.booked_seats || 0)) <= 0);
  const totalAvailableSeats = upcomingSchedules.reduce((acc, s) => {
    const avail = s.total_seats - (s.booked_seats || 0);
    return acc + (avail > 0 ? avail : 0);
  }, 0);

  return (
    <div className="pb-20">
      
      {/* Hero Section */}
      <div className="relative h-[400px]">
        <img 
          src={packageData.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200'} 
          alt={packageData.package_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>

        {hasSchedules && (
          <div className="absolute top-6 right-6 z-10">
            {allFull ? (
              <span className="bg-rose-600/90 text-white font-black px-4 py-2 rounded-xl text-sm shadow-lg border border-rose-500/20 backdrop-blur-sm tracking-wider uppercase">
                🚌 {translations.full || 'Bus Full'}
              </span>
            ) : (
              <span className="bg-emerald-600/90 text-white font-black px-4 py-2 rounded-xl text-sm shadow-lg border border-emerald-500/20 backdrop-blur-sm tracking-wider">
                🚌 {totalAvailableSeats} {translations.seats_left || 'Seats Left'}
              </span>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <button 
              onClick={() => navigate('/packages')} 
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{translations.back || 'Back'}</span>
            </button>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-tight">{packageData.package_name}</h1>
            <p className="text-sm sm:text-base font-semibold text-slate-300 flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-primary" /> {packageData.destination}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-6">
                {translations.package_details || 'Package Details'}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{translations.duration || 'Duration'}</p>
                  <p className="font-bold text-slate-700 text-sm mt-1">{packageData.days}D / {packageData.nights}N</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{translations.group_size || 'Group Size'}</p>
                  <p className="font-bold text-slate-700 text-sm mt-1">{translations.min_persons || 'Min 2 Persons'}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{translations.destinations || 'Destination'}</p>
                  <p className="font-bold text-slate-700 text-sm mt-1 truncate">{packageData.destination}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold uppercase">{translations.best_time || 'Best Time'}</p>
                  <p className="font-bold text-slate-700 text-sm mt-1">{translations.all_year || 'All Year'}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-3">{translations.description || 'Description'}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">{packageData.description}</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 sticky top-24 space-y-6">
              <div className="text-center bg-slate-50 py-4 rounded-xl border border-slate-100">
                <p className="text-3xl font-black text-primary">₹{packageData.price}</p>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">{translations.per_person || 'per person'}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-2.5">{translations.inclusions || 'Inclusions'}:</h3>
                  <ul className="space-y-2 text-xs font-semibold text-slate-500">
                    <li className="flex items-center"><CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Accommodation</li>
                    <li className="flex items-center"><CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Meals (Breakfast & Dinner)</li>
                    <li className="flex items-center"><CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Transportation</li>
                  </ul>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="font-bold text-slate-800 text-sm mb-2.5">{translations.exclusions || 'Exclusions'}:</h3>
                  <ul className="space-y-2 text-xs font-semibold text-slate-500">
                    <li className="flex items-center"><XCircle className="h-4 w-4 text-rose-500 mr-2" /> Airfare</li>
                    <li className="flex items-center"><XCircle className="h-4 w-4 text-rose-500 mr-2" /> Personal expenses</li>
                    <li className="flex items-center"><XCircle className="h-4 w-4 text-rose-500 mr-2" /> Travel insurance</li>
                    <li className="flex items-center"><XCircle className="h-4 w-4 text-rose-500 mr-2" /> Sightseeing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Tours Section */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-100 shadow-xl p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-6">
            {translations.available_tours || 'Available Tours'}
          </h2>
          
          {schedules.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400 font-bold text-sm">
                {translations.no_upcoming_tours || 'No upcoming tours available for this package.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map(schedule => {
                const totalSeats = schedule.total_seats;
                const bookedSeats = schedule.booked_seats || 0;
                const availableSeats = totalSeats - bookedSeats;
                const isFull = availableSeats <= 0;
                const fewSeats = availableSeats <= 10 && availableSeats > 0;
                
                return (
                  <div 
                    key={schedule.schedule_id} 
                    className="border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center text-sm font-semibold text-slate-600">
                        <Calendar className="h-5 w-5 text-primary mr-2.5 flex-shrink-0" />
                        <span>{translations.travel_date || 'Travel Date'}:</span>
                        <span className="ml-1.5 font-bold text-slate-800">{new Date(schedule.travel_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm font-semibold text-slate-600">
                        <Calendar className="h-5 w-5 text-primary mr-2.5 flex-shrink-0" />
                        <span>{translations.return_date || 'Return Date'}:</span>
                        <span className="ml-1.5 font-bold text-slate-800">{new Date(schedule.return_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm font-semibold text-slate-600">
                        <Bus className="h-5 w-5 text-primary mr-2.5 flex-shrink-0" />
                        <span>{translations.bus || 'Bus'}:</span>
                        <span className="ml-1.5 font-bold text-slate-800">{schedule.bus_name} ({schedule.bus_number})</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                        isFull ? 'bg-red-50 text-red-600 border-red-100' : 
                        fewSeats ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {isFull ? (translations.full || 'FULL') : fewSeats ? `${availableSeats} ${translations.seats_left || 'seats left'}` : `${availableSeats} ${translations.seats_available || 'seats available'}`}
                      </div>
                    </div>
                    
                    <button 
                      className={`btn-primary px-8 ${isFull && userRole !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleBookNow(schedule.schedule_id)}
                      disabled={isFull && userRole !== 'admin'}
                    >
                      {isFull ? (userRole === 'admin' ? 'Book Tour (Full)' : (translations.fully_booked || 'Fully Booked')) : (translations.book_now || 'Book Now')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageDetail;