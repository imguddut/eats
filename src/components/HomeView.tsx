import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Compass, ChevronLeft, ChevronRight, Zap, Flame, Award, Clock, Star, Copy, Check, Moon, Coffee, Store } from 'lucide-react';
import { initialMenu, categories } from '../data/menu';
import { CartItem, MenuItem, Customer, Restaurant, Banner } from '../types';
import { getMenuItems, getCustomerReviews, CustomerReview, getRestaurants, getBanners } from '../services/dbSimulator';
import { StoreStatus, getRestaurantStatus } from '../utils/storeStatus';
import BannerSlider from './BannerSlider';

interface HomeViewProps {
  setCurrentView: (view: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  onAddToCart: (item: MenuItem, variant: string, price: number) => void;
  cart: CartItem[];
  currentUser?: Customer | null;
  setAuthModalOpen?: (open: boolean) => void;
  storeStatus?: StoreStatus;
}

export default function HomeView({
  setCurrentView,
  setSearchQuery,
  setSelectedCategory,
  onAddToCart,
  cart,
  currentUser,
  setAuthModalOpen,
  storeStatus,
}: HomeViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [brokenFoodImages, setBrokenFoodImages] = useState<Record<string, boolean>>({});
  const [brokenRestaurantImages, setBrokenRestaurantImages] = useState<Record<string, boolean>>({});
  const [cardStates, setCardStates] = useState<Record<string, { variant: string; price: number }>>({});
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  const handleRestaurantClick = (restaurant: Restaurant) => {
    localStorage.setItem('arwaleats_selected_restaurant_id', restaurant.id);
    setCurrentView('restaurants');
  };

  const featuredRestaurants = restaurants
    .filter(r => Boolean(r.featured));

  // Dynamically build the categories list to capture any custom categories in the active menuItems
  const getActiveCategories = () => {
    const activeCats = [...categories];
    menuItems.forEach((item) => {
      if (item.category && !activeCats.some((c) => c.category.toLowerCase() === item.category.toLowerCase())) {
        activeCats.push({
          category: item.category,
          displayName: item.category,
          image: '', // fallback
        });
      }
    });
    return activeCats.filter((c) => 
      c.category.toLowerCase() !== 'arwal eat special' && 
      c.category.toLowerCase() !== 'arwal eats special'
    );
  };

  const activeCategories = getActiveCategories();

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 350;
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Fetch dynamic menu items, reviews, and promotional banners
  useEffect(() => {
    async function loadAllHomeData() {
      try {
        setBannersLoading(true);
        const [items, revs, rests, bannerList] = await Promise.all([
          getMenuItems(),
          getCustomerReviews(),
          getRestaurants(),
          getBanners()
        ]);
        handleNewItems(items);
        setReviews(revs);
        setRestaurants(rests);
        setBanners(bannerList);
      } catch (e) {
        console.error(e);
      } finally {
        setBannersLoading(false);
      }
    }

    function handleNewItems(items: MenuItem[]) {
      setMenuItems(items);

      // Initialize selected variants and prices for each menu item
      const states: Record<string, { variant: string; price: number }> = {};
      items.forEach((item) => {
        const variants = String(item.variant || '').split(',').map((v) => v.trim()).filter(Boolean);
        const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
        states[item.id] = {
          variant: variants[0] || 'Regular',
          price: prices[0] || 0,
        };
      });
      setCardStates((prev) => ({ ...states, ...prev }));
    }

    loadAllHomeData();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MenuItem[]>;
      if (customEvent.detail) {
        handleNewItems(customEvent.detail);
      }
    };

    const handleRestaurantsUpdate = async () => {
      try {
        const rests = await getRestaurants();
        setRestaurants(rests);
      } catch (err) {
        console.error('Failed to update restaurants on event in HomeView', err);
      }
    };

    const handleBannersUpdate = async () => {
      try {
        const bannerList = await getBanners(true);
        setBanners(bannerList);
      } catch (err) {
        console.error('Failed to update banners on event in HomeView', err);
      }
    };

    window.addEventListener('arwaleats_menu_updated', handleUpdate);
    window.addEventListener('arwaeatsin_restaurants_updated', handleRestaurantsUpdate);
    window.addEventListener('arwaleats_restaurants_updated', handleRestaurantsUpdate);
    window.addEventListener('arwaleats_banners_updated', handleBannersUpdate);

    return () => {
      window.removeEventListener('arwaleats_menu_updated', handleUpdate);
      window.removeEventListener('arwaeatsin_restaurants_updated', handleRestaurantsUpdate);
      window.removeEventListener('arwaleats_restaurants_updated', handleRestaurantsUpdate);
      window.removeEventListener('arwaleats_banners_updated', handleBannersUpdate);
    };
  }, []);

  const handleVariantChange = (id: string, variantIndex: number, item: MenuItem) => {
    const variants = String(item.variant || '').split(',').map((v) => v.trim()).filter(Boolean);
    const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
    setCardStates((prev) => ({
      ...prev,
      [id]: {
        variant: variants[variantIndex] || variants[0] || 'Regular',
        price: prices[variantIndex] || prices[0] || 0,
      },
    }));
  };

  // Get Featured Items
  const featuredFoods = menuItems.filter((item) => item.featured).slice(0, 4);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentView('menu');
  };

  const handleCouponCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  // Banner Click Action Router
  const handleBannerClick = (banner: Banner) => {
    if (!banner || !banner.redirectType || banner.redirectType === 'none') return;

    if (banner.redirectType === 'restaurant' && banner.restaurantId) {
      setSelectedCategory('');
      setSearchQuery('');
      setCurrentView('restaurants');
    } else if (banner.redirectType === 'category' && banner.categoryId) {
      setSelectedCategory(banner.categoryId);
      setCurrentView('menu');
    } else if (banner.redirectType === 'coupon' && banner.couponCode) {
      handleCouponCopy(banner.couponCode);
    } else if (banner.redirectType === 'external' && (banner.buttonLink || banner.image)) {
      const targetUrl = banner.buttonLink || '#';
      if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Helper to parse first price and variant
  const getFirstPriceAndVariant = (item: MenuItem) => {
    const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
    const variants = String(item.variant || '').split(',').map((v) => v.trim());
    return { price: prices[0], variant: variants[0] };
  };

  return (
    <div id="home-view" className="space-y-12 pb-12">
      {/* Closed Notice Banner */}
      {storeStatus && !storeStatus.isOpen && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-rose-900 shadow-xs">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0 mt-0.5">
              <Moon size={20} className="animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-950 flex items-center gap-2">
                <span>Ordering Currently Closed</span>
                <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-extrabold">Notice</span>
              </h4>
              <p className="text-xs font-semibold text-rose-700/90 mt-1 leading-relaxed">
                {storeStatus.message || 'We are currently closed for online orders. Please check back during opening hours!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC PROMOTIONAL BANNER SLIDER */}
      <section id="promotional-banners-section" className="pt-4">
        <BannerSlider
          banners={banners}
          loading={bannersLoading}
          onBannerClick={handleBannerClick}
        />
      </section>

      {/* Swipeable / Scrollable Categories Section */}
      <section id="categories-section" className="max-w-7xl mx-auto px-4 md:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-black text-brand-text">What's on your mind?</h2>
            <p className="text-xs text-brand-text-sec font-semibold">Explore curated food collections in Arwal</p>
          </div>
          <button
            onClick={() => handleCategoryClick('')}
            className="text-xs font-bold text-brand-accent hover:underline cursor-pointer flex items-center gap-1"
          >
            View All Categories ➔
          </button>
        </div>

        {/* Scroll Controls & Container */}
        <div className="relative group">
          <button
            onClick={() => scrollCategories('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 p-2.5 rounded-full bg-white/90 shadow-lg border border-brand-card hover:bg-brand-accent hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={categoriesScrollRef}
            className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {activeCategories.map((cat, idx) => (
              <motion.div
                key={cat.category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryClick(cat.category)}
                className="flex-shrink-0 w-28 sm:w-32 flex flex-col items-center gap-2 p-3 rounded-2xl bg-brand-card/30 hover:bg-brand-card/70 border border-brand-card/50 transition-all cursor-pointer text-center group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-brand-card shadow-sm flex items-center justify-center p-1 group-hover:shadow-md transition-all">
                  <img
                    src={cat.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
                    alt={cat.displayName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300';
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-brand-text group-hover:text-brand-accent transition-colors line-clamp-1">
                  {cat.displayName}
                </span>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => scrollCategories('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 p-2.5 rounded-full bg-white/90 shadow-lg border border-brand-card hover:bg-brand-accent hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Featured Restaurants Section */}
      {featuredRestaurants.length > 0 && (
        <section id="featured-restaurants-section" className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-brand-accent font-bold text-xs uppercase tracking-wider mb-1">
                <Store size={14} className="text-brand-accent" />
                Top Outlets in Arwal
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-black text-brand-text">Featured Restaurants</h2>
            </div>
            <button
              onClick={() => setCurrentView('restaurants')}
              className="text-xs font-bold text-brand-accent hover:underline cursor-pointer flex items-center gap-1"
            >
              Explore All Restaurants ➔
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRestaurants.map((r) => {
              const status = getRestaurantStatus(r);
              const isOpen = r.active && status.isOpen;
              const itemsCount = menuItems.filter(item => (item.restaurantId === r.id || (!item.restaurantId && r.id === 'rest1'))).length;

              return (
                <motion.div
                  key={r.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleRestaurantClick(r)}
                  className="group bg-white rounded-3xl border border-brand-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative h-44 w-full bg-brand-card/20 overflow-hidden">
                    {brokenRestaurantImages[r.id] || !r.image ? (
                      <div className="h-full w-full bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex flex-col items-center justify-center p-4 text-center">
                        <Store size={36} className="text-brand-accent/60 mb-1" />
                        <span className="text-xs font-black uppercase text-brand-text/70 tracking-wider font-display">{r.name}</span>
                      </div>
                    ) : (
                      <img
                        src={r.image}
                        alt={r.name}
                        loading="lazy"
                        onError={() => setBrokenRestaurantImages(prev => ({ ...prev, [r.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    {/* Rating Tag */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-brand-accent flex items-center gap-1 shadow-sm">
                      <Star size={12} className="fill-brand-accent text-brand-accent" />
                      {r.rating || '4.5'}
                    </div>

                    {/* Featured Tag */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-accent text-white uppercase tracking-wider shadow-sm">
                      FEATURED
                    </span>

                    {!isOpen && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                        <span className="bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md animate-pulse">
                          {status.isManuallyClosed ? 'Temporarily Closed' : 'Closed'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-display font-bold text-base text-brand-text group-hover:text-brand-accent transition-colors line-clamp-1">
                          {r.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-xs text-brand-accent font-semibold line-clamp-1">{r.cuisine}</p>
                      <p className="text-[11px] text-brand-text-sec font-medium line-clamp-1 mt-0.5">{r.address}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-brand-card/60 text-xs font-semibold text-brand-text-sec">
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-brand-accent" />
                        <span>{r.deliveryTime || '25-35 mins'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Store size={13} className="text-brand-accent" />
                        <span>{itemsCount} Dishes</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Dishes Section */}
      <section id="featured-dishes-section" className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-brand-accent font-bold text-xs uppercase tracking-wider mb-1">
              <Zap size={14} className="fill-brand-accent" />
              Handpicked Specials
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-black text-brand-text">Featured Dishes</h2>
          </div>
          <button
            onClick={() => setCurrentView('menu')}
            className="text-xs font-bold text-brand-accent hover:underline cursor-pointer"
          >
            Explore Full Menu ➔
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredFoods.map((item) => {
            const { price, variant } = getFirstPriceAndVariant(item);
            const currentState = cardStates[item.id] || { variant, price };
            const variants = String(item.variant || '').split(',').map((v) => v.trim()).filter(Boolean);
            const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));

            const restId = item.restaurantId || 'rest1';
            const restaurant = restaurants.find((r) => r.id === restId);
            const isRestaurantClosed = restaurant ? !getRestaurantStatus(restaurant).isOpen : false;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -5 }}
                className="bg-brand-card/40 border border-brand-card/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative h-48 w-full overflow-hidden bg-brand-card/20">
                  <img
                    src={brokenFoodImages[item.id] ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' : item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={() => setBrokenFoodImages((prev) => ({ ...prev, [item.id]: true }))}
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-accent text-white uppercase tracking-wider shadow-sm">
                    FEATURED
                  </span>
                  {isRestaurantClosed && (
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-10 animate-fadeIn">
                      <span className="px-3.5 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md border border-zinc-600">
                        Restaurant Closed
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-brand-text-sec font-semibold mb-1">
                      <span>{item.category}</span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star size={12} className="fill-amber-500" /> 4.8
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm text-brand-text line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-brand-text-sec line-clamp-2 mt-1 font-medium">{item.description}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-brand-card/60">
                    {/* Variant Selector */}
                    {variants.length > 1 && (
                      <div className="flex flex-wrap gap-1">
                        {variants.map((v, vIdx) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleVariantChange(item.id, vIdx, item)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              currentState.variant === v
                                ? 'bg-brand-accent text-white shadow-xs'
                                : 'bg-brand-card/50 text-brand-text-sec hover:text-brand-text'
                            }`}
                          >
                            {v} - ₹{prices[vIdx]}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-display font-black text-lg text-brand-text">
                        ₹{currentState.price}
                      </span>
                      {isRestaurantClosed ? (
                        <button
                          disabled
                          className="py-2.5 px-4 bg-zinc-200 text-zinc-400 border border-zinc-300 rounded-xl text-xs font-bold cursor-not-allowed shadow-none"
                        >
                          Closed
                        </button>
                      ) : (
                        <button
                          onClick={() => onAddToCart(item, currentState.variant, currentState.price)}
                          className="py-2 px-4 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          + Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
