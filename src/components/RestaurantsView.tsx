import React, { useState, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Star, MapPin, Phone, Clock, ArrowLeft, 
  ShoppingCart, Heart, Store, ChevronRight, Check, Sparkles
} from 'lucide-react';
import { MenuItem, Restaurant, CartItem, getDietType } from '../types';
import { getRestaurants, getMenuItems } from '../services/dbSimulator';
import { getRestaurantStatus } from '../utils/storeStatus';
import { categories } from '../data/menu';

interface RestaurantsViewProps {
  onAddToCart: (item: MenuItem, variant: string, price: number) => void;
  cart: CartItem[];
  setCurrentView: (view: string) => void;
}

export default function RestaurantsView({
  onAddToCart,
  cart,
  setCurrentView
}: RestaurantsViewProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('arwaleats_restaurant_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [cardStates, setCardStates] = useState<Record<string, { variant: string; price: number }>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [brokenRestaurantImages, setBrokenRestaurantImages] = useState<Record<string, boolean>>({});
  const [brokenFoodImages, setBrokenFoodImages] = useState<Record<string, boolean>>({});

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const rests = await getRestaurants();
        setRestaurants(rests);
        const items = await getMenuItems();
        setMenuItems(items);

        // Check for initially selected restaurant passed from Home View
        const preselectedId = localStorage.getItem('arwaleats_selected_restaurant_id');
        if (preselectedId) {
          const matched = rests.find(r => r.id === preselectedId);
          if (matched) {
            setSelectedRestaurant(matched);
            setActiveCategoryFilter('All');
          }
          localStorage.removeItem('arwaleats_selected_restaurant_id');
        }

        // Initialize state for item card variants
        const states: Record<string, { variant: string; price: number }> = {};
        items.forEach((item) => {
          const variants = String(item.variant || '').split(',').map((v) => v.trim()).filter(Boolean);
          const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
          states[item.id] = {
            variant: variants[0] || 'Regular',
            price: prices[0] || 0,
          };
        });
        setCardStates(states);
      } catch (err) {
        console.error('Failed to load restaurants/menu items', err);
      }
    }
    loadData();

    // Setup update listeners
    const handleMenuUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MenuItem[]>;
      if (customEvent.detail) {
        setMenuItems(customEvent.detail);
      }
    };
    window.addEventListener('arwaleats_menu_updated', handleMenuUpdate);
    return () => {
      window.removeEventListener('arwaleats_menu_updated', handleMenuUpdate);
    };
  }, []);

  const toggleFavorite = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('arwaleats_restaurant_favorites', JSON.stringify(updated));
  };

  const handleVariantChange = (itemId: string, variantIndex: number, item: MenuItem) => {
    const variants = String(item.variant || '').split(',').map((v) => v.trim());
    const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
    setCardStates((prev) => ({
      ...prev,
      [itemId]: {
        variant: variants[variantIndex],
        price: prices[variantIndex],
      }
    }));
  };

  // Filtered Restaurants list
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get food items for selected restaurant
  const getRestaurantItems = (restaurantId: string) => {
    return menuItems.filter((item) => {
      const matchesRest = item.restaurantId === restaurantId || 
                          (!item.restaurantId && restaurantId === 'rest1');
      if (!matchesRest) return false;

      if (activeCategoryFilter === 'All') return true;
      if (activeCategoryFilter === 'ArwalEats Special') {
        return item.featured || (item.category && (item.category.toLowerCase() === 'arwal eats special' || item.category.toLowerCase() === 'arwal eat special'));
      }
      return item.category === activeCategoryFilter;
    });
  };

  // Get categories that actually exist in the selected restaurant's menu
  const getRestaurantCategories = (restaurantId: string) => {
    const restaurantItems = menuItems.filter((item) => {
      return item.restaurantId === restaurantId || (!item.restaurantId && restaurantId === 'rest1');
    });

    const hasSpecials = restaurantItems.some(item => item.featured || (item.category && (item.category.toLowerCase() === 'arwal eats special' || item.category.toLowerCase() === 'arwal eat special')));

    // Dynamically build categories list to include custom ones
    const activeCats = [...categories];
    restaurantItems.forEach((item) => {
      if (item.category && !activeCats.some((c) => c.category.toLowerCase() === item.category.toLowerCase())) {
        activeCats.push({
          category: item.category,
          displayName: item.category,
          image: '',
        });
      }
    });

    const filtered = activeCats.filter(c => {
      const isArwalSpecial = c.category.toLowerCase() === 'arwal eat special' || c.category.toLowerCase() === 'arwal eats special';
      if (isArwalSpecial) return false; // Avoid duplicates since we have a dedicated Special filter
      return restaurantItems.some(it => it.category && it.category.toLowerCase() === c.category.toLowerCase());
    });

    if (hasSpecials) {
      return [
        {
          category: 'ArwalEats Special',
          displayName: '★ ArwalEats Specials',
          image: '',
        },
        ...filtered
      ];
    }
    return filtered;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 pb-24 md:pb-16 animate-fadeIn">
      <AnimatePresence mode="wait">
        {!selectedRestaurant ? (
          /* LIST VIEW */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-5 sm:space-y-6"
          >
            {/* Header section */}
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-brand-text leading-tight">Restaurants Hub</h1>
                <p className="text-xs text-brand-text-sec font-semibold mt-0.5">Choose your preferred outlet and order premium local specialties in Arwal</p>
              </div>

              {/* Live search input — full width on mobile */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-sec" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search restaurants, cuisines..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-brand-card bg-white focus:outline-none focus:border-brand-accent text-xs font-semibold"
                />
              </div>
            </div>

            {filteredRestaurants.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-brand-card space-y-4">
                <Store size={48} className="mx-auto text-brand-text-sec/60" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-brand-text">No Restaurants Found</h3>
                  <p className="text-xs text-brand-text-sec max-w-xs mx-auto px-4">We couldn't find any registered food outlets matching "{searchQuery}" in Arwal.</p>
                </div>
              </div>
            ) : (
              /* Restaurants Grid — single column on mobile, 2-col on md, 3-col on lg */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredRestaurants.map((r) => {
                  const itemsCount = menuItems.filter(item => (item.restaurantId === r.id || (!item.restaurantId && r.id === 'rest1'))).length;
                  const isFavorite = favorites.includes(r.id);
                  const status = getRestaurantStatus(r);
                  const isOpen = r.active && status.isOpen;

                  return (
                    <motion.div
                      key={r.id}
                      onClick={() => {
                        setSelectedRestaurant(r);
                        setActiveCategoryFilter('All');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group bg-white rounded-3xl border border-brand-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                    >
                      {/* Banner Image — aspect ratio instead of fixed height */}
                      <div className="relative aspect-[16/9] bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {brokenRestaurantImages[r.id] || !r.image ? (
                          <div className="h-full w-full bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex flex-col items-center justify-center p-4 text-center">
                            <Store size={36} className="text-brand-accent/60 mb-1" />
                            <span className="text-[10px] font-black uppercase text-brand-text/60 tracking-wider font-display">{r.name}</span>
                          </div>
                        ) : (
                          <img
                            referrerPolicy="no-referrer"
                            src={r.image}
                            alt={r.name}
                            loading="lazy"
                            onError={() => setBrokenRestaurantImages(prev => ({ ...prev, [r.id]: true }))}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-brand-accent flex items-center gap-0.5 shadow-sm">
                          <Star size={10} className="fill-brand-accent text-brand-accent" />
                          {r.rating || '4.5'}
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(r.id, e)}
                          className="absolute top-3 left-3 p-2.5 rounded-full bg-white/95 backdrop-blur-md border border-brand-card text-brand-text hover:text-brand-accent transition-colors shadow-sm focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Heart size={14} className={isFavorite ? 'fill-brand-accent text-brand-accent' : ''} />
                        </button>

                        {!isOpen && (
                          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white p-4 text-center">
                            <span className="bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md animate-pulse">
                              {status.isManuallyClosed ? 'Temporarily Closed' : 'Closed'}
                            </span>
                            <span className="text-[10px] text-zinc-300 mt-2 font-bold max-w-[200px] leading-relaxed">
                              {status.message || 'Please check back later during opening hours!'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info & stats */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2 min-w-0">
                            <h3 className="font-bold text-sm text-brand-text group-hover:text-brand-accent transition-colors leading-snug line-clamp-1 min-w-0 flex-1">{r.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-text-sec line-clamp-2 leading-relaxed">{r.address}</p>
                        </div>

                        {/* Badges row — wraps naturally */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-brand-card/50 text-[10px] text-brand-text-sec font-semibold">
                          <div className="flex items-center gap-1 shrink-0">
                            <Clock size={11} className="text-brand-accent" />
                            <span>{r.deliveryTime || '25-35 mins'}</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-brand-card shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            <Store size={11} className="text-brand-accent" />
                            <span>{itemsCount} Options</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-brand-card shrink-0" />
                          <div className="flex items-center gap-1 min-w-0">
                            <Phone size={11} className="text-brand-accent shrink-0" />
                            <span className="truncate">{r.phone || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <button className="w-full py-3 bg-brand-bg hover:bg-brand-accent hover:text-white border border-brand-card hover:border-brand-accent text-brand-text text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[44px]">
                            Explore Menu
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* RESTAURANT DETAILED MENU VIEW */
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Navigation back and active brand banner */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="flex items-center gap-2 text-xs font-black text-brand-text-sec hover:text-brand-accent transition-colors self-start cursor-pointer uppercase tracking-wider min-h-[44px]"
              >
                <ArrowLeft size={14} />
                Back to All Outlets
              </button>

              {/* Epic banner board — responsive padding and flex direction */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-brand-text text-white p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl">
                {/* Background blurred image */}
                <div className="absolute inset-0 z-0 opacity-20">
                  <img
                    referrerPolicy="no-referrer"
                    src={selectedRestaurant.image}
                    alt={selectedRestaurant.name}
                    loading="lazy"
                    className="w-full h-full object-cover filter blur-sm"
                  />
                </div>

                {/* Text content */}
                <div className="relative z-10 space-y-3 text-center sm:text-left w-full sm:w-auto min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-1 bg-brand-accent text-white text-[9px] font-black uppercase rounded-lg tracking-wider">Premium Outlet</span>
                    <span className="px-2.5 py-1 bg-white/10 text-white text-[9px] font-black uppercase rounded-lg tracking-wider flex items-center gap-0.5">
                      <Star size={10} className="fill-brand-accent text-brand-accent" />
                      {selectedRestaurant.rating || '4.5'}
                    </span>
                  </div>

                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none uppercase break-words">
                    {selectedRestaurant.name}
                  </h2>

                  {/* Contact info — wraps gracefully on small screens */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-[11px] text-white/70 font-semibold pt-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={12} className="text-brand-accent shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{selectedRestaurant.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Phone size={12} className="text-brand-accent shrink-0" />
                      <span>{selectedRestaurant.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={12} className="text-brand-accent shrink-0" />
                      <span>{selectedRestaurant.deliveryTime || '25-35 mins'}</span>
                    </div>
                  </div>
                </div>

                {/* Thumbnail — responsive sizing */}
                <div className="relative z-10 h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20 shrink-0">
                  <img
                    referrerPolicy="no-referrer"
                    src={selectedRestaurant.image}
                    alt={selectedRestaurant.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Closed restaurant warning */}
            {(() => {
              const selectedStatus = getRestaurantStatus(selectedRestaurant);
              const isSelectedOpen = selectedRestaurant.active && selectedStatus.isOpen;
              if (isSelectedOpen) return null;
              return (
                <div className="bg-red-50 border border-red-200/60 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                  <Clock className="text-red-600 shrink-0 mt-0.5 animate-pulse" size={18} />
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-black text-xs uppercase tracking-wider">Ordering is currently suspended</h4>
                    <p className="text-[11px] text-red-700/90 font-bold">
                      {selectedRestaurant.name} is currently closed.
                      {selectedStatus.message ? ` ${selectedStatus.message}` : ` Standard hours are ${selectedRestaurant.openingTime || '11:00 AM'} to ${selectedRestaurant.closingTime || '11:00 PM'}.`}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Category selection bar inside selected restaurant */}
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between border-b border-brand-card pb-3 gap-2 min-w-0">
                <h3 className="font-display font-black text-sm text-brand-text uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Sparkles size={16} className="text-brand-accent animate-pulse" />
                  <span className="hidden sm:inline">Available Food Options</span>
                  <span className="sm:hidden">Food Options</span>
                </h3>
                <span className="text-[10px] bg-brand-accent/5 text-brand-accent px-2.5 py-1 rounded-full font-black uppercase tracking-wider shrink-0">
                  {getRestaurantItems(selectedRestaurant.id).length} Dishes
                </span>
              </div>

              {/* Pill categories filters — horizontally scrollable */}
              <div
                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  onClick={() => setActiveCategoryFilter('All')}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer min-h-[40px] shrink-0 ${
                    activeCategoryFilter === 'All'
                      ? 'bg-brand-accent border-brand-accent text-white shadow-md'
                      : 'bg-white border-brand-card text-brand-text-sec hover:border-brand-accent'
                  }`}
                >
                  All Sections
                </button>
                {getRestaurantCategories(selectedRestaurant.id).map((c) => (
                  <button
                    key={c.category}
                    onClick={() => setActiveCategoryFilter(c.category)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer min-h-[40px] shrink-0 ${
                      activeCategoryFilter === c.category
                        ? 'bg-brand-accent border-brand-accent text-white shadow-md'
                        : 'bg-white border-brand-card text-brand-text-sec hover:border-brand-accent'
                    }`}
                  >
                    {c.displayName}
                  </button>
                ))}
              </div>

              {/* Dynamic menu items grid */}
              {getRestaurantItems(selectedRestaurant.id).length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-brand-card space-y-3">
                  <Store size={36} className="mx-auto text-brand-text-sec/60" />
                  <div className="space-y-1 px-4">
                    <h4 className="font-bold text-xs text-brand-text">No Food Items Available</h4>
                    <p className="text-[10px] text-brand-text-sec max-w-xs mx-auto">This section is currently empty. Try clearing category filters or check back later!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {getRestaurantItems(selectedRestaurant.id).map((item) => {
                    const isNonVeg = getDietType(item) === 'non-veg';
                    const variants = String(item.variant || '').split(',').map((v) => v.trim()).filter(Boolean);
                    
                    const state = cardStates[item.id] || {
                      variant: variants[0] || 'Regular',
                      price: parseFloat(String(item.price || '').split(',')[0].trim()) || 0
                    };

                    const activeVariant = state.variant;
                    const activePrice = state.price;

                    return (
                      <div 
                        key={item.id} 
                        className="group relative bg-white rounded-3xl border border-brand-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between w-full"
                      >
                        {/* Diet sign */}
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-sm border border-brand-card shadow-sm text-[8px] font-black uppercase">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${isNonVeg ? 'bg-red-500' : 'bg-green-500'}`} />
                          <span className="text-brand-text">{isNonVeg ? 'Non-Veg' : 'Veg'}</span>
                        </div>

                        {/* Image banner — 16:9 aspect ratio, no fixed heights */}
                        <div className="relative aspect-[16/9] bg-zinc-100 overflow-hidden flex items-center justify-center">
                          {brokenFoodImages[item.id] || !item.image ? (
                            <div className="h-full w-full bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex flex-col items-center justify-center p-4 text-center">
                              <span className="text-2xl mb-1">🍔</span>
                              <span className="text-[9px] font-black uppercase text-brand-text/60 tracking-wider font-display max-w-[80%] truncate">{item.name}</span>
                            </div>
                          ) : (
                            <img
                              referrerPolicy="no-referrer"
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              onError={() => setBrokenFoodImages(prev => ({ ...prev, [item.id]: true }))}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}

                          {item.featured && (
                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-brand-accent text-white text-[8px] font-black uppercase tracking-wider">
                              Chef Special
                            </span>
                          )}

                          {!item.available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                              <span className="px-2.5 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contents description */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[8px] font-black text-brand-accent uppercase bg-brand-accent/5 px-2 py-0.5 rounded inline-block max-w-full truncate">
                              {item.category}
                            </span>
                            <h4 className="font-bold text-xs text-brand-text line-clamp-2 leading-snug">{item.name}</h4>
                            {item.description && (
                              <p className="text-[10px] text-brand-text-sec line-clamp-2 leading-snug">{item.description}</p>
                            )}
                          </div>

                          {/* Variant Selector */}
                          {variants.length > 1 ? (
                            <div className="space-y-1 pt-1">
                              <span className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Portion / Variant</span>
                              <div className="flex flex-wrap gap-1">
                                {variants.map((v, idx) => (
                                  <button
                                    key={v}
                                    onClick={() => handleVariantChange(item.id, idx, item)}
                                    className={`px-2.5 py-2 rounded text-[9px] font-black border transition-colors cursor-pointer min-h-[44px] flex items-center justify-center ${
                                      activeVariant === v
                                        ? 'bg-brand-card border-brand-accent text-brand-accent'
                                        : 'bg-white border-brand-card text-brand-text-sec hover:border-brand-accent'
                                    }`}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] font-bold text-brand-text-sec italic">
                              Standard Portion: {variants[0] || 'Regular'}
                            </div>
                          )}

                          {/* Bottom pricing section */}
                          <div className="flex items-center justify-between pt-2 border-t border-brand-card/50 gap-2">
                            <div className="min-w-0">
                              <span className="text-[8px] text-brand-text-sec font-bold uppercase tracking-wider">Price</span>
                              <p className="font-display text-sm font-black text-brand-text">₹{activePrice}</p>
                            </div>

                            {!item.available ? (
                              <button
                                disabled
                                className="px-3 py-2.5 bg-zinc-100 text-zinc-400 text-[10px] font-black uppercase rounded-lg border border-zinc-200 cursor-not-allowed min-h-[44px] shrink-0"
                              >
                                Sold Out
                              </button>
                            ) : (
                              <button
                                onClick={() => onAddToCart(item, activeVariant, activePrice)}
                                className="px-3 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1 min-h-[44px] shrink-0"
                              >
                                <ShoppingCart size={12} />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
