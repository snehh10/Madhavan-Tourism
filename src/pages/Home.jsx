import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPackages } from '../api/api';
import { MapPin, Calendar, Users, Award, Clock, Headphones, Star } from 'lucide-react';

const Home = ({ language, translations }) => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await getPackages();
      if (response.data.success) {
        setPackages(response.data.data.slice(0, 6));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    navigate('/packages', { state: { search: searchTerm } });
  };

  const features = [
    { icon: Calendar, title: translations.easy_booking || 'Easy Booking', desc: translations.easy_booking_desc || 'Simple and secure online booking' },
    { icon: Users, title: translations.expert_guides || 'Expert Guides', desc: translations.expert_guides_desc || 'Professional tour guides' },
    { icon: Award, title: translations.best_price || 'Best Price', desc: translations.best_price_desc || 'Competitive prices guaranteed' },
    { icon: Headphones, title: translations.support_24_7 || '24/7 Support', desc: translations.support_24_7_desc || 'Round the clock assistance' },
  ];

  const stats = [
    { number: '10K+', label: translations.happy_customers || 'Happy Customers' },
    { number: '50+', label: translations.destinations || 'Destinations' },
    { number: '5+', label: translations.years_experience || 'Years Experience' },
    { number: '100+', label: translations.tour_packages || 'Tour Packages' },
  ];

  const filteredPackages = packages.filter(pkg =>
    pkg.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.package_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <div className="relative h-[650px] bg-cover bg-center flex items-center" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1600)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/70 to-transparent"></div>
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center items-start text-left text-white max-w-5xl">
          <span className="text-primary font-black uppercase tracking-widest text-sm mb-3 bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 animate-pulse">
            Explore the World
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
            {translations.welcome || 'Welcome to Madhavan Tourism'}
          </h1>
          <p className="text-lg sm:text-xl text-slate-200 max-w-xl mb-10 leading-relaxed font-semibold">
            {translations.discover_destinations || 'Discover amazing destinations with our exclusive tour packages'}
          </p>
          
          <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-primary" />
              <input
                type="text"
                placeholder={translations.search_destination_placeholder || 'Search destination...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-slate-800 focus:outline-none text-sm font-semibold"
              />
            </div>
            <button 
              onClick={handleSearch}
              className="bg-primary hover:bg-primary-hover px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-md shadow-primary/20 text-sm cursor-pointer"
            >
              {translations.search || 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-6">
        <div className="bg-secondary text-white rounded-3xl p-10 md:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-1 relative z-10">
                <div className="text-4xl md:text-5xl font-black text-primary tracking-tight">{stat.number}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Packages */}
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
            Featured Tours
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            {translations.popular_packages || 'Popular Packages'}
          </h2>
          <p className="text-slate-400 text-sm font-semibold">
            Choose your next escape from our highest-rated travel bundles.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPackages.map(pkg => (
              <div key={pkg.package_id} className="card group">
                <div className="relative overflow-hidden h-60">
                  <img 
                    src={pkg.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600'} 
                    alt={pkg.package_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-slate-800 px-3 py-1.5 rounded-xl text-sm font-black shadow-md border border-slate-100">
                    ₹{pkg.price}
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-primary transition-colors">
                      {pkg.package_name}
                    </h3>
                    <div className="flex items-center text-slate-400 text-xs font-bold space-x-3">
                      <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1 text-primary" /> {pkg.destination}</span>
                      <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1 text-primary" /> {pkg.days} Days / {pkg.nights} Nights</span>
                    </div>
                  </div>
                  
                  <Link to={`/packages/${pkg.package_id}`} className="btn-primary block text-center w-full text-sm py-2.5 shadow-md shadow-primary/10">
                    {translations.view_details || 'View Details'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Why Choose Us */}
      <div className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
              Why Choose Us?
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
              {translations.why_choose_us || 'Why Choose Us?'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border border-slate-100/80 shadow-md text-center hover:shadow-lg transition-all duration-300">
                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-semibold">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;