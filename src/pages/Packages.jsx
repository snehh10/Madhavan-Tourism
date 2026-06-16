import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPackages } from '../api/api';
import { MapPin, Calendar, Search, Filter } from 'lucide-react';

const Packages = ({ language, translations }) => {
  const location = useLocation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDestination, setFilterDestination] = useState('');

  useEffect(() => {
    if (location.state && location.state.search) {
      setSearchTerm(location.state.search);
    }
    fetchPackages();
  }, [location]);

  const fetchPackages = async () => {
    try {
      const response = await getPackages();
      if (response.data.success) {
        setPackages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const destinations = [...new Set(packages.map(pkg => pkg.destination))];

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pkg.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDestination = !filterDestination || pkg.destination === filterDestination;
    return matchesSearch && matchesDestination;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 pb-20">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
        <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
          Catalog
        </span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
          {translations.our_tour_packages || 'Our Tour Packages'}
        </h1>
        <p className="text-slate-400 text-sm font-semibold">
          {translations.discover_destinations || 'Discover amazing destinations with our exclusive packages'}
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto mb-16 bg-white p-4 rounded-2xl border border-slate-100 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder={translations.search_packages_placeholder || 'Search by package name or destination...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <div className="md:w-64 relative">
            <Filter className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
            <select 
              value={filterDestination} 
              onChange={(e) => setFilterDestination(e.target.value)}
              className="input-field pl-11 appearance-none cursor-pointer text-sm font-bold text-slate-600 pr-10"
            >
              <option value="">{translations.all_destinations || 'All Destinations'}</option>
              {destinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-4.5 pointer-events-none border-solid border-slate-400 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4"></div>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
          <p className="text-slate-400 font-bold text-lg">{translations.no_packages_found || 'No packages found matching your criteria.'}</p>
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
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-slate-800 px-3.5 py-1.5 rounded-xl text-sm font-black shadow-md border border-slate-100">
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
                    <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1 text-primary" /> {pkg.days}D / {pkg.nights}N</span>
                  </div>
                </div>
                
                <p className="text-slate-400 text-xs font-semibold line-clamp-2 leading-relaxed">
                  {pkg.description}
                </p>

                <Link to={`/packages/${pkg.package_id}`} className="btn-primary block text-center w-full text-sm py-2.5 shadow-md shadow-primary/10">
                  {translations.view_details || 'View Details'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Packages;