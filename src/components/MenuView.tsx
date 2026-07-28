import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, Heart, ShoppingCart, Check, Star, ArrowUpDown, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { initialMenu, categories } from '../data/menu';
import { MenuItem, CartItem, getDietType, Restaurant, Category } from '../types';
import { getMenuItems, getRestaurants } from '../services/dbSimulator';
import { registerBackButtonHandler } from '../utils/backButton';
import { getRestaurantStatus } from '../utils/storeStatus';

interface MenuViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onAddToCart: (item: MenuItem, variant: string, price: number) => void;
  cart: CartItem[];
}

export default function MenuView({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onAddToCart,
  cart,
}: MenuViewProps) {
  const [priceRange, setPriceRange] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<string>('popular'); // popular, low-high, high-low
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('arwaleats_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [cardStates, setCardStates] = useState<Record<string, { variant: string; price: number }>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dietFilter, setDietFilter] = useState<'both' | 'veg' | 'non-veg'>('both');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const pillsRef = useRef<HTMLDivElement>(null);

  const scrollPills = (direction: 'left' | 'right') => {
    if (pillsRef.current) {
      const scrollAmount = 250;
      pillsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Synchronize favorites with localStorage
  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('arwaleats_favorites', JSON.stringify(updated));
  };

  // Handle back button to close filters
  useEffect(() => {
    if (showFilters) {
      return registerBackButtonHandler(() => {
        setShowFilters(false);
        return true;
      });
    }
  }, [showFilters]);

  // Initialize selected variants and prices for each menu item
  useEffect(() => {
    async function loadMenu() {
      try {
        const [items, rests] = await Promise.all([getMenuItems(), getRestaurants()]);
        setRestaurants(rests);
        handleNewItems(items);
      } catch (e) {
        console.error(e);
      }
    }

    function handleNewItems(items: MenuItem[]) {
      setMenuItems(items);
      const states: Record<string, { variant: string; price: number }> = {};
      items.forEach((item) => {
        const variants = String(item.variant || '').split(',').map((v) => v.trim());
        const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
        states[item.id] = {
          variant: variants[0],
          price: prices[0],
        };
      });
      setCardStates((prev) => ({ ...states, ...prev }));
    }

    loadMenu();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MenuItem[]>;
      if (customEvent.detail) {
        handleNewItems(customEvent.detail);
      }
    };

    window.addEventListener('arwaleats_menu_updated', handleUpdate);
    return () => {
      window.removeEventListener('arwaleats_menu_updated', handleUpdate);
    };
  }, []);

  const handleVariantChange = (id: string, variantIndex: number, item: MenuItem) => {
    const variants = String(item.variant || '').split(',').map((v) => v.trim());
    const prices = String(item.price || '').split(',').map((p) => parseFloat(p.trim()));
    setCardStates((prev) => ({
      ...prev,
      [id]: {
        variant: variants[variantIndex],
        price: prices[variantIndex],
      },
    }));
  };

  const isCategoryMatch = (catA: string, catB: string): boolean => {
    if (!catA || !catB) return false;
    const a = catA.toLowerCase().trim();
    const b = catB.toLowerCase().trim();
    if (a === b) return true;
    if ((a === 'biryani' || a === 'biriyani') && (b === 'biryani' || b === 'biriyani')) return true;
    if ((a === 'roll' || a === 'rolls') && (b === 'roll' || b === 'rolls')) return true;
    if ((a === 'dessert' || a === 'desserts' || a === 'desert') && (b === 'dessert' || b === 'desserts' || b === 'desert')) return true;
    if ((a === 'dal' || a === 'daal') && (b === 'dal' || b === 'daal')) return true;
    if ((a === 'burger' || a === 'burgers') && (b === 'burger' || b === 'burgers')) return true;
    if ((a === 'salad' || a === 'salads') && (b === 'salad' || b === 'salads')) return true;
    return false;
  };

  const parseItemPrice = (priceVal: any): number => {
    if (typeof priceVal === 'number') return priceVal;
    const str = String(priceVal || '').split(',')[0].trim();
    const cleaned = str.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Filter and sort food items
  const getFilteredItems = () => {
    return menuItems.filter((item) => {
      // 1. Category Filter
      if (selectedCategory && !isCategoryMatch(item.category, selectedCategory)) {
        return false;
      }
      // 2. Search query filter
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // 3. Price Filter
      const basePrice = parseItemPrice(item.price);
      if (basePrice > priceRange) {
        return false;
      }
      // 4. Diet Preference Filter (Veg / Non-Veg)
      if (dietFilter !== 'both') {
        if (getDietType(item) !== dietFilter) {
          return false;
        }
      }
      // 5. Restaurant Filter
      if (selectedRestaurantId) {
        const itemRestId = item.restaurantId || 'rest1';
        if (itemRestId !== selectedRestaurantId) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const priceA = cardStates[a.id] ? cardStates[a.id].price : parseItemPrice(a.price);
      const priceB = cardStates[b.id] ? cardStates[b.id].price : parseItemPrice(b.price);

      if (sortBy === 'low-high') {
        return priceA - priceB;
      } else if (sortBy === 'high-low') {
        return priceB - priceA;
      } else {
        // Popular/Featured first
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });
  };

  const filteredItems = getFilteredItems();

  // Dynamically build the active categories list from loaded menu items
  const getActiveCategories = () => {
    const activeCats: Category[] = [];
    menuItems.forEach((item) => {
      if (!item.category) return;
      const catName = item.category.trim();
      if (catName.toLowerCase() === 'arwal eat special' || catName.toLowerCase() === 'arwal eats special') return;

      const existingInActive = activeCats.find((c) => isCategoryMatch(c.category, catName));
      if (!existingInActive) {
        const predefined = categories.find((c) => isCategoryMatch(c.category, catName));
        activeCats.push(predefined || {
          category: catName,
          displayName: catName,
          image: '',
        });
      }
    });
    return activeCats;
  };

  const activeCategories = getActiveCategories();

  // Group filtered items by category if selectedCategory is empty
  const groupedItems: Record<string, MenuItem[]> = {};
  activeCategories.forEach((cat) => {
    groupedItems[cat.category] = filteredItems.filter((item) => item.category && isCategoryMatch(cat.category, item.category));
  });

  return (
    <div id="menu-view" className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 pb-24 md:pb-16">
      {/* Header & Search */}
      <div id="menu-header" className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-brand-text leading-tight">ArwalEats Menu</h1>
          <p className="text-xs text-brand-text-sec font-semibold mt-0.5">Freshly cooked meals on demand in Arwal</p>
        </div>

        <div className="flex items-center gap-2 w-full">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-sec" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-3 py-3 rounded-xl border border-brand-card bg-white focus:outline-none focus:border-brand-accent text-xs font-semibold"
            />
          </div>

          {/* Toggle Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer min-h-[44px] min-w-[44px] shrink-0 ${
              showFilters
                ? 'bg-brand-accent text-white border-brand-accent'
                : 'bg-white text-brand-text border-brand-card hover:border-brand-accent'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Options Expandable Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            id="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-brand-bg-sec rounded-2xl border border-brand-card"
          >
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {/* Diet Preference Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-brand-text">Diet Preference</label>
                <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-brand-card rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDietFilter('both')}
                    className={`py-1.5 rounded-lg text-center text-[10px] font-black uppercase transition-all cursor-pointer ${
                      dietFilter === 'both'
                        ? 'bg-brand-accent text-white shadow-xs'
                        : 'text-brand-text-sec hover:text-brand-text'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('veg')}
                    className={`py-1.5 rounded-lg text-center text-[10px] font-black uppercase transition-all cursor-pointer ${
                      dietFilter === 'veg'
                        ? 'bg-green-600 text-white shadow-xs'
                        : 'text-brand-text-sec hover:text-brand-text'
                    }`}
                  >
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('non-veg')}
                    className={`py-1.5 rounded-lg text-center text-[10px] font-black uppercase transition-all cursor-pointer ${
                      dietFilter === 'non-veg'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-brand-text-sec hover:text-brand-text'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-brand-text">Category Filter</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-brand-card text-xs font-semibold focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {activeCategories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Restaurant selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-brand-text">Restaurant Filter</label>
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-brand-card text-xs font-semibold focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="">All Restaurants</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-brand-text">
                  <label>Max Price</label>
                  <span className="text-brand-accent">₹{priceRange}</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="1000"
                  step="5"
                  value={priceRange}
                  onChange={(e) => setPriceRange(parseInt(e.target.value))}
                  className="w-full accent-brand-accent h-1.5 bg-brand-card rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-brand-text-sec font-bold">
                  <span>₹15</span>
                  <span>₹500</span>
                  <span>₹1000</span>
                </div>
              </div>

              {/* Sort By Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-brand-text">Sort By</label>
                <div className="relative">
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-sec" size={14} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2.5 pr-8 rounded-xl bg-white border border-brand-card text-xs font-semibold focus:outline-none focus:border-brand-accent appearance-none cursor-pointer"
                  >
                    <option value="popular">Popular / Today's Specials</option>
                    <option value="low-high">Price: Low to High</option>
                    <option value="high-low">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal Sticky Category Pills */}
      <div className="sticky top-[68px] z-20 bg-brand-bg py-2 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
        <div className="relative flex items-center">
          {/* Left Arrow Button — desktop only */}
          <button
            onClick={() => scrollPills('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/95 hover:bg-white text-brand-text border border-brand-card shadow-md hover:scale-105 active:scale-95 transition-all hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            ref={pillsRef}
            id="category-pills"
            className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth scrollbar-none w-full md:px-10"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shrink-0 border cursor-pointer transition-all min-h-[40px] ${
                selectedCategory === ''
                  ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                  : 'bg-white text-brand-text border-brand-card hover:border-brand-accent'
              }`}
            >
              All
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => {
                  setSelectedCategory(cat.category);
                  setTimeout(() => {
                    const element = document.getElementById(cat.category.replace(/\s+/g, '-').toLowerCase());
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold shrink-0 border cursor-pointer transition-all min-h-[40px] ${
                  isCategoryMatch(selectedCategory, cat.category)
                    ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                    : 'bg-white text-brand-text border-brand-card hover:border-brand-accent'
                }`}
              >
                {cat.displayName}
              </button>
            ))}
          </div>

          {/* Right Arrow Button — desktop only */}
          <button
            onClick={() => scrollPills('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/95 hover:bg-white text-brand-text border border-brand-card shadow-md hover:scale-105 active:scale-95 transition-all hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Scroll Right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Veg/Non-Veg/Both Diet Filter Row */}
      <div className="flex flex-col gap-3 border-b border-brand-card/40 pb-4">
        {/* Diet toggle — horizontally scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-brand-card/30 shadow-xs w-max min-w-full sm:w-auto sm:min-w-0 sm:inline-flex">
            <button
              onClick={() => setDietFilter('both')}
              className={`px-3 sm:px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
                dietFilter === 'both'
                  ? 'bg-brand-accent text-white shadow-sm font-black'
                  : 'text-brand-text-sec hover:text-brand-text font-bold'
              }`}
            >
              Show Both
            </button>
            <button
              onClick={() => setDietFilter('veg')}
              className={`px-3 sm:px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
                dietFilter === 'veg'
                  ? 'bg-green-600 text-white shadow-sm font-black'
                  : 'text-brand-text-sec hover:text-brand-text font-bold'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-600 border border-white shrink-0"></span>
              Veg Only
            </button>
            <button
              onClick={() => setDietFilter('non-veg')}
              className={`px-3 sm:px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
                dietFilter === 'non-veg'
                  ? 'bg-red-600 text-white shadow-sm font-black'
                  : 'text-brand-text-sec hover:text-brand-text font-bold'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 border border-white shrink-0"></span>
              Non-Veg Only
            </button>
          </div>
        </div>

        <div className="text-[11px] text-brand-text-sec font-bold">
          Showing <span className="text-brand-text font-black">{filteredItems.length}</span> mouth-watering dishes
        </div>
      </div>

      {/* Foods Grid Render */}
      <div id="foods-container" className="space-y-10 sm:space-y-12">
        {selectedCategory ? (
          // Single category render
          <div className="space-y-5 sm:space-y-6">
            <div className="border-b border-brand-card pb-2">
              <h2 className="font-display text-xl sm:text-2xl font-black text-brand-text">
                {activeCategories.find((c) => c.category.toLowerCase() === selectedCategory.toLowerCase())?.displayName || selectedCategory}
              </h2>
              <p className="text-xs text-brand-text-sec font-semibold">Delicacies crafted fresh on order</p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white border border-brand-card rounded-2xl">
                <p className="text-sm font-semibold text-brand-text-sec">No items found matching the selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredItems.map((item) => (
                  <FoodCard
                    key={item.id}
                    item={item}
                    cardState={cardStates[item.id]}
                    isFavorite={favorites.includes(item.id)}
                    toggleFavorite={toggleFavorite}
                    onVariantChange={(vIdx) => handleVariantChange(item.id, vIdx, item)}
                    onAddToCart={onAddToCart}
                    restaurant={restaurants.find((r) => r.id === (item.restaurantId || 'rest1'))}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Sectioned categories render
          activeCategories.map((cat) => {
            const items = groupedItems[cat.category];
            if (!items || items.length === 0) return null;

            return (
              <div key={cat.category} id={cat.category.replace(/\s+/g, '-').toLowerCase()} className="space-y-5 sm:space-y-6">
                <div className="border-b border-brand-card pb-2">
                  <h2 className="font-display text-xl sm:text-2xl font-black text-brand-text">{cat.displayName}</h2>
                  <p className="text-xs text-brand-text-sec font-semibold">Fresh {cat.displayName.toLowerCase()} specialties</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {items.map((item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      cardState={cardStates[item.id]}
                      isFavorite={favorites.includes(item.id)}
                      toggleFavorite={toggleFavorite}
                      onVariantChange={(vIdx) => handleVariantChange(item.id, vIdx, item)}
                      onAddToCart={onAddToCart}
                      restaurant={restaurants.find((r) => r.id === (item.restaurantId || 'rest1'))}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {filteredItems.length === 0 && !selectedCategory && (
          <div className="text-center py-12 bg-white border border-brand-card rounded-2xl">
            <p className="text-sm font-semibold text-brand-text-sec">No items found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Food Card Helper Component
interface FoodCardProps {
  key?: string;
  item: MenuItem;
  cardState?: { variant: string; price: number };
  isFavorite: boolean;
  toggleFavorite: (id: string) => void;
  onVariantChange: (variantIndex: number) => void;
  onAddToCart: (item: MenuItem, variant: string, price: number) => void;
  restaurant?: Restaurant;
}

function FoodCard({
  item,
  cardState,
  isFavorite,
  toggleFavorite,
  onVariantChange,
  onAddToCart,
  restaurant,
}: FoodCardProps) {
  const [imageError, setImageError] = useState(false);
  const isNonVeg = getDietType(item) === 'non-veg';
  const variants = String(item.variant || '').split(',').map((v) => v.trim());
  
  // Active state fallback if not initialized
  const activeVariant = cardState?.variant || variants[0];
  const activePrice = cardState?.price || parseFloat(String(item.price || '').split(',')[0].trim());
  const isRestaurantClosed = restaurant ? !getRestaurantStatus(restaurant).isOpen : false;

  return (
    <div className="group relative bg-white rounded-3xl border border-brand-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between w-full">
      {/* Top Badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm border border-brand-card shadow-sm">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isNonVeg ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className="text-[9px] font-bold text-brand-text tracking-wide uppercase">
          {isNonVeg ? 'Non-Veg' : 'Veg'}
        </span>
      </div>

      {/* Favorite Button */}
      <button
        onClick={() => toggleFavorite(item.id)}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/95 backdrop-blur-sm border border-brand-card text-brand-text hover:text-brand-accent transition-colors shadow-sm focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center"
      >
        <Heart size={14} className={isFavorite ? 'fill-brand-accent text-brand-accent' : ''} />
      </button>

      {/* Food Image — 16:9 on all screens for consistency */}
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-bg-sec flex items-center justify-center">
        {imageError || !item.image ? (
          <div className="h-full w-full bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-3xl mb-1">🍔</span>
            <span className="text-[10px] font-black uppercase text-brand-text/60 tracking-wider font-display max-w-[80%] truncate">{item.name}</span>
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.name}
            onError={() => setImageError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {item.featured && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-brand-accent text-white text-[9px] font-bold uppercase tracking-wider">
            Chef Special
          </span>
        )}
        {item.available === false && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md border border-red-500">
              Out of Stock
            </span>
          </div>
        )}
        {item.available !== false && isRestaurantClosed && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-10 animate-fadeIn">
            <span className="px-3.5 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md border border-zinc-600">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 pb-0.5 min-w-0">
            <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider bg-brand-accent/5 px-2 py-0.5 rounded-md truncate max-w-[60%]">
              {item.category}
            </span>
            {restaurant && (
              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded-md text-[9px] font-black shrink-0">
                <span>★</span>
                <span>{restaurant.rating || '4.5'}</span>
              </div>
            )}
          </div>
          <h3 className="font-display font-bold text-sm text-brand-text line-clamp-2 group-hover:text-brand-accent transition-colors leading-snug">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-[11px] text-brand-text-sec line-clamp-2 leading-tight italic font-normal pt-0.5">
              {item.description}
            </p>
          )}

          {/* Restaurant Identity Row */}
          {restaurant && (
            <div className="flex items-center gap-1.5 pt-1.5 pb-0.5 min-w-0">
              <span className="inline-flex items-center gap-1 bg-brand-bg-sec border border-brand-card/50 px-2 py-0.5 rounded-lg text-[10px] font-bold text-brand-text font-sans min-w-0">
                <Store size={10} className="text-brand-accent shrink-0 animate-pulse" />
                <span className="truncate max-w-[90px]" title={restaurant.name}>{restaurant.name}</span>
              </span>
              <span className="text-[10px] text-brand-text-sec font-bold shrink-0">
                🕒 {restaurant.deliveryTime || '25-35m'}
              </span>
            </div>
          )}
        </div>

        {/* Variant Selector */}
        {variants.length > 1 ? (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-text-sec">Select Variant</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {variants.map((v, idx) => (
                <button
                  key={v}
                  onClick={() => onVariantChange(idx)}
                  className={`px-2.5 sm:px-3 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
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
          <div className="text-[10px] font-bold text-brand-text-sec italic py-1">
            Standard Portion: {variants[0]}
          </div>
        )}

        {/* Bottom Section */}
        <div className="flex items-center justify-between pt-2 border-t border-brand-card/30 gap-2">
          <div className="min-w-0">
            <p className="text-[9px] text-brand-text-sec font-bold truncate">Price ({activeVariant})</p>
            <p className="font-display text-base font-black text-brand-text">₹{activePrice}</p>
          </div>
          {item.available === false ? (
            <button
              disabled
              className="px-3 py-3 rounded-xl bg-zinc-100 text-zinc-400 text-xs font-bold border border-zinc-200 cursor-not-allowed flex items-center gap-1.5 min-h-[44px] shrink-0"
            >
              Sold Out
            </button>
          ) : isRestaurantClosed ? (
            <button
              disabled
              className="px-4 py-3 rounded-xl bg-zinc-200 text-zinc-400 text-xs font-bold border border-zinc-300 cursor-not-allowed flex items-center gap-1.5 min-h-[44px] shrink-0"
            >
              Closed
            </button>
          ) : (
            <button
              onClick={() => onAddToCart(item, activeVariant, activePrice)}
              className="px-3 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold shadow-md shadow-brand-accent/10 hover:shadow-brand-accent/20 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 min-h-[44px] shrink-0"
            >
              <ShoppingCart size={14} />
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
