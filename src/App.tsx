import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, ShieldCheck, Battery, Signal, Wifi, Laptop, Sparkles, Smartphone, 
  ArrowRight, Home, LayoutDashboard, Bike, HelpCircle, Eye, X, Store
} from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeView from './components/HomeView';
import MenuView from './components/MenuView';
import AboutView from './components/AboutView';
import ContactView from './components/ContactView';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import OrdersView from './components/OrdersView';
import ProfileView from './components/ProfileView';
import LegalViews from './components/LegalViews';
import DeliveryView from './components/DeliveryView';
import AdminView from './components/AdminView';
import { ErrorBoundary } from './components/ErrorBoundary';
import RestaurantsView from './components/RestaurantsView';
import RestaurantPortalView from './components/RestaurantPortalView';
import AuthModal from './components/AuthModal';
import { initializeDatabase, getCustomerOrders, getCustomNotifications, getRestaurants, getRestaurantSettings } from './services/dbSimulator';
import { Customer, CartItem, MenuItem, Coupon, Restaurant, RestaurantSettings } from './types';
import { getRestaurantStatus, getStoreStatus } from './utils/storeStatus';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { registerBackButtonHandler, handleBackPress } from './utils/backButton';

export default function App() {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing ArwalEats Engine...');
  const [currentView, setCurrentView] = useState<string>('home'); // home, menu, about, contact, cart, checkout, orders, profile, privacy, terms, admin, delivery
  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const [globalSettings, setGlobalSettings] = useState<RestaurantSettings | null>(null);
  const storeStatus = getStoreStatus(globalSettings);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('arwaeatsin_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingCartItem, setPendingCartItem] = useState<{ item: MenuItem; variant: string; price: number } | null>(null);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Live Real-Time Customer Notifications & Toasts
  const [customerNotifications, setCustomerNotifications] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('arwaeatsin_customer_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [toasts, setToasts] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const rests = await getRestaurants();
        setRestaurants(rests);
      } catch (err) {
        console.error('Failed to load restaurants in App.tsx', err);
      }
    }
    loadRestaurants();

    // Re-load on custom event triggers
    const handleSync = () => loadRestaurants();
    window.addEventListener('arwaeatsin_restaurants_updated', handleSync);
    window.addEventListener('arwaleats_restaurants_updated', handleSync);
    return () => {
      window.removeEventListener('arwaeatsin_restaurants_updated', handleSync);
      window.removeEventListener('arwaleats_restaurants_updated', handleSync);
    };
  }, [currentView]);

  useEffect(() => {
    async function loadGlobalSettings() {
      try {
        const sets = await getRestaurantSettings();
        setGlobalSettings(sets);
      } catch (err) {
        console.error('Failed to load settings in App.tsx', err);
      }
    }
    loadGlobalSettings();

    window.addEventListener('arwaleats_settings_updated', loadGlobalSettings);
    return () => {
      window.removeEventListener('arwaleats_settings_updated', loadGlobalSettings);
    };
  }, []);

  // Function to clear or mark as read
  const handleClearNotifications = () => {
    setCustomerNotifications([]);
    localStorage.removeItem('arwaeatsin_customer_notifications');
  };

  const handleMarkNotificationRead = (id: string) => {
    setCustomerNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('arwaeatsin_customer_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Dispatch a notification
  const triggerCustomerNotification = (title: string, message: string, type: 'status' | 'offer' | 'dish' | 'general') => {
    const id = 'CN-' + Math.floor(100000 + Math.random() * 900000);
    const newNotif = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };

    setCustomerNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem('arwaeatsin_customer_notifications', JSON.stringify(updated));
      return updated;
    });

    // Elegant Beep / Chime Sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        // Handle browser autoplay policy
        const resume = () => {
          ctx.resume();
          window.removeEventListener('click', resume);
        };
        window.addEventListener('click', resume);
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, ctx.currentTime); 
      osc.frequency.setValueAtTime(850, ctx.currentTime + 0.12); 
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Notification sound failed', e);
    }

    // Add toast banner
    const toastId = 'TOAST-' + Math.floor(100000 + Math.random() * 900000);
    setToasts(prev => [...prev, { id: toastId, title, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 6000);
  };

  // Background Tracker Refs
  const lastKnownStatuses = useRef<Record<string, string>>({});
  const initialLoadDone = useRef<boolean>(false);

  // Background Polling Loop for Order updates & Admin Campaigns
  useEffect(() => {
    let active = true;

    const pollUpdates = async () => {
      try {
        // 1. Check Customer Order Updates
        if (currentUser) {
          const orders = await getCustomerOrders(currentUser.customerId);
          if (orders && Array.isArray(orders) && active) {
            orders.forEach(order => {
              const prevStatus = lastKnownStatuses.current[order.orderId];
              
              if (prevStatus === undefined) {
                // Populate silently on startup
                lastKnownStatuses.current[order.orderId] = order.status;
              } else if (prevStatus !== order.status) {
                // Status changed! Trigger alert
                let typeEmoji = '🍛';
                if (order.status === 'Accepted') typeEmoji = '✅';
                if (order.status === 'Preparing') typeEmoji = '🔥';
                if (order.status === 'Out for Delivery') typeEmoji = '🚴';
                if (order.status === 'Delivered') typeEmoji = '🎉';
                if (order.status === 'Cancelled' || order.status === 'Rejected') typeEmoji = '❌';

                triggerCustomerNotification(
                  `Order Status Updated ${typeEmoji}`,
                  `Your order #${order.orderId.substring(0, 8)}... is now "${order.status}".`,
                  'status'
                );
                lastKnownStatuses.current[order.orderId] = order.status;
              }
            });
          }
        }

        // 2. Check Admin Notification Campaigns
        const adminNotifs = await getCustomNotifications();
        if (adminNotifs && Array.isArray(adminNotifs) && active) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const activeAndValidNotifs = adminNotifs.filter(notif => {
            if (String(notif.isActive) === 'false' || !notif.isActive) return false;
            
            if (notif.startDate) {
              const start = new Date(notif.startDate);
              start.setHours(0, 0, 0, 0);
              if (today < start) return false;
            }
            if (notif.endDate) {
              const end = new Date(notif.endDate);
              const endLimit = new Date(notif.endDate);
              endLimit.setHours(23, 59, 59, 999);
              if (today > endLimit) return false;
            }
            return true;
          });

          const rawSeen = localStorage.getItem('arwaeatsin_seen_admin_notifs');
          let seenIds: string[] = rawSeen ? JSON.parse(rawSeen) : [];
          
          let updated = false;

          activeAndValidNotifs.forEach(notif => {
            const notifId = notif.alertId || notif.id;
            const displayType = (notif.type === 'Offer' ? 'offer' : 'general') as 'offer' | 'dish' | 'status' | 'general';
            if (!seenIds.includes(notifId)) {
              // If it's the very first visit (no seen registry at all), we populate silently except the most recent one
              if (!rawSeen) {
                // Brand new user session, mark all seen except the very first one to welcome them
                seenIds.push(notifId);
                updated = true;
                if (activeAndValidNotifs[0] && (activeAndValidNotifs[0].alertId === notifId || activeAndValidNotifs[0].id === notifId)) {
                  // Trigger alert for the latest live one!
                  triggerCustomerNotification(notif.title, notif.message, displayType);
                }
              } else {
                // Real-time alert trigger!
                triggerCustomerNotification(notif.title, notif.message, displayType);
                seenIds.push(notifId);
                updated = true;
              }
            }
          });

          if (updated) {
            localStorage.setItem('arwaeatsin_seen_admin_notifs', JSON.stringify(seenIds));
          }
        }
      } catch (err) {
        console.error('Notification background poll failure:', err);
      }
    };

    // Quick initial check, then poll every 4 seconds
    pollUpdates();
    const intervalId = setInterval(pollUpdates, 4000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [currentUser]);

  const [loadingState, setLoadingState] = useState(true); // renaming variable or just matching original
  
  useEffect(() => {
    initializeDatabase();
    
    const steps = [
      'Establishing connection to secure local database...',
      'Mapping menu card items & coupon codes...',
      'Initializing real-time push alert engines...',
      'System check successful. Loading ArwalEats...',
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setStatusMessage(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('arwaeatsin_cart', JSON.stringify(cart));
  }, [cart]);

  const viewHistoryRef = useRef<string[]>([]);
  const currentViewRef = useRef<string>('home');

  useEffect(() => {
    viewHistoryRef.current = viewHistory;
  }, [viewHistory]);

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Setup Android Back Button Navigation
  useEffect(() => {
    // Push initial dummy state on startup
    window.history.pushState({ dummy: true }, '');

    let lastExitAttempt = 0;

    const handlePopState = (e: PopStateEvent) => {
      // 1. Try to handle back press via registered stack handlers
      const handled = handleBackPress();
      if (handled) {
        // Re-push dummy state to keep the interceptor active
        window.history.pushState({ dummy: true }, '');
        return;
      }

      // 2. No overlays were closed. Try to navigate to previous view
      const historyStack = viewHistoryRef.current;
      if (historyStack.length > 0) {
        const nextHistory = [...historyStack];
        const previousView = nextHistory.pop();
        if (previousView) {
          setViewHistory(nextHistory);
          setCurrentView(previousView);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // Re-push dummy state to keep interceptor active
        window.history.pushState({ dummy: true }, '');
      } else {
        // 3. We are on 'home' screen
        const now = Date.now();
        if (now - lastExitAttempt < 2000) {
          // Double click back to exit
          if ((window as any).navigator?.app?.exitApp) {
            (window as any).navigator.app.exitApp();
          } else {
            window.close();
          }
        } else {
          lastExitAttempt = now;
          // Show toast
          triggerCustomerNotification(
            'Exit App 🚪',
            'Press back again to exit.',
            'general'
          );
          // Re-push dummy state to keep interceptor active
          window.history.pushState({ dummy: true }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Register back handler for Auth Modal
  useEffect(() => {
    if (authModalOpen) {
      return registerBackButtonHandler(() => {
        setAuthModalOpen(false);
        return true;
      });
    }
  }, [authModalOpen]);

  const handleAddToCart = (item: MenuItem, variant: string, price: number) => {
    // 0. Check global store status first
    if (!storeStatus.isOpen) {
      triggerCustomerNotification(
        'Ordering Suspended 🕒',
        storeStatus.message || 'We are currently closed. Please check back during our opening hours!',
        'status'
      );
      return;
    }

    // 1. Check restaurant operational status before adding to cart
    const restId = item.restaurantId || 'rest1';

    // Check for multi-restaurant restriction: only one restaurant per order allowed
    if (cart.length > 0) {
      const activeRestId = cart[0].restaurantId || 'rest1';
      if (activeRestId !== restId) {
        setPendingCartItem({ item, variant, price });
        return;
      }
    }
    
    const restaurantObj = restaurants.find(r => r.id === restId);
    if (restaurantObj) {
      const status = getRestaurantStatus(restaurantObj);
      if (!restaurantObj.active || !status.isOpen) {
        triggerCustomerNotification(
          'Store Closed Now 🕒',
          `${restaurantObj.name} is currently closed. ${status.message || 'Please order during business hours!'}`,
          'status'
        );
        return;
      }
    }

    const cartItemId = `${item.id}-${variant}`;
    setCart((prev) => {
      const exists = prev.find((i) => i.id === cartItemId);
      if (exists) {
        return prev.map((i) => (i.id === cartItemId ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          id: cartItemId,
          itemId: item.id,
          menuId: item.id,
          restaurantId: item.restaurantId || 'rest1',
          name: item.name,
          category: item.category,
          variant,
          price,
          qty: 1,
          image: item.image,
        },
      ];
    });
  };

  const handleConfirmReplaceCart = () => {
    if (!pendingCartItem) return;
    const { item, variant, price } = pendingCartItem;
    const cartItemId = `${item.id}-${variant}`;
    
    setCart([
      {
        id: cartItemId,
        itemId: item.id,
        menuId: item.id,
        restaurantId: item.restaurantId || 'rest1',
        name: item.name,
        category: item.category,
        variant,
        price,
        qty: 1,
        image: item.image,
      }
    ]);
    
    setPendingCartItem(null);
  };

  const handleUpdateQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = (coupon: Coupon | null, discount: number) => {
    const closedRestaurant = cart.find(item => {
      const rest = restaurants.find(r => r.id === item.restaurantId);
      if (rest) {
        const status = getRestaurantStatus(rest);
        return !rest.active || !status.isOpen;
      }
      return false;
    });

    if (closedRestaurant) {
      const rest = restaurants.find(r => r.id === closedRestaurant.restaurantId);
      triggerCustomerNotification(
        'Restaurant Closed Now 🕒',
        `${rest?.name || 'The restaurant'} is currently closed. Please remove their dishes to proceed.`,
        'status'
      );
      return;
    }

    setAppliedCoupon(coupon);
    setCouponDiscount(discount);
    navigateToView('checkout');
  };

  const handleOrderSuccess = (orderId: string) => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
    localStorage.removeItem('arwaeatsin_cart');
    navigateToView('orders');
  };

  const { updateProfile: authUpdateProfile } = useAuth();

  const handleProfileUpdateSuccess = async (updatedCustomer: Customer) => {
    try {
      await authUpdateProfile(updatedCustomer);
    } catch (e) {
      console.error("Failed to sync profile update with context:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigateToView('home');
    } catch (e) {
      console.error("Failed to logout via useAuth:", e);
    }
  };

  // Switcher Helper
  const navigateToView = (view: string, pushToHistory = true) => {
    if (pushToHistory && view !== currentView) {
      setViewHistory(prev => [...prev, currentView]);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            setCurrentView={navigateToView}
            setSearchQuery={setSearchQuery}
            setSelectedCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            cart={cart}
            currentUser={currentUser}
            setAuthModalOpen={setAuthModalOpen}
            storeStatus={storeStatus}
          />
        );
      case 'restaurants':
        return (
          <RestaurantsView
            onAddToCart={handleAddToCart}
            cart={cart}
            setCurrentView={navigateToView}
          />
        );
      case 'menu':
        return (
          <MenuView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            cart={cart}
          />
        );
      case 'about':
        return <AboutView setCurrentView={navigateToView} />;
      case 'contact':
        return <ContactView />;
      case 'cart':
        return (
          <CartView
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            setCurrentView={navigateToView}
            storeStatus={storeStatus}
            restaurants={restaurants}
          />
        );
      case 'checkout':
        return (
          <ProtectedRoute onOpenAuth={() => setAuthModalOpen(true)}>
            <CheckoutView
              cart={cart}
              currentUser={currentUser}
              appliedCoupon={appliedCoupon}
              couponDiscount={couponDiscount}
              onOrderSuccess={handleOrderSuccess}
              setCurrentView={navigateToView}
              onProfileUpdateSuccess={handleProfileUpdateSuccess}
              storeStatus={storeStatus}
            />
          </ProtectedRoute>
        );
      case 'orders':
        return (
          <ProtectedRoute onOpenAuth={() => setAuthModalOpen(true)}>
            <OrdersView
              currentUser={currentUser!}
              setCurrentView={navigateToView}
            />
          </ProtectedRoute>
        );
      case 'profile':
        return (
          <ProtectedRoute onOpenAuth={() => setAuthModalOpen(true)}>
            <ProfileView
              currentUser={currentUser!}
              onLogout={handleLogout}
              onProfileUpdateSuccess={handleProfileUpdateSuccess}
              setCurrentView={navigateToView}
              setSelectedCategory={setSelectedCategory}
            />
          </ProtectedRoute>
        );
      case 'privacy':
        return <LegalViews type="privacy" />;
      case 'terms':
        return <LegalViews type="terms" />;
      case 'delivery':
        return <DeliveryView setCurrentView={navigateToView} />;
      case 'restaurant-portal':
        return <RestaurantPortalView setCurrentView={navigateToView} />;
      case 'admin':
        return (
          <div className="flex-grow flex flex-col bg-[#0d1117] min-h-screen">
            {/* Immersive Mobile Header for Admin Portal */}
            <div className="w-full bg-[#161b22] border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between text-[11px] font-black tracking-wider text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider font-black text-white">ArwalEats Admin Live</span>
              </div>
              <div className="flex items-center gap-2.5 font-mono select-none">
                <Signal size={12} className="text-emerald-400" />
                <span className="text-[9px] bg-emerald-400/10 text-emerald-400 px-1 rounded border border-emerald-500/20 font-black">5G LTE</span>
                <Wifi size={12} className="text-emerald-400" />
                <div className="flex items-center gap-0.5 text-emerald-400">
                  <Battery size={13} />
                  <span className="text-[9px]">100%</span>
                </div>
              </div>
            </div>
            <main className="flex-grow flex flex-col relative bg-brand-bg text-brand-text">
              <ErrorBoundary fallbackTitle="Admin Portal Error Recovered">
                <AdminView setCurrentView={navigateToView} />
              </ErrorBoundary>
            </main>
          </div>
        );
      default:
        return (
          <HomeView
            setCurrentView={navigateToView}
            setSearchQuery={setSearchQuery}
            setSelectedCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            cart={cart}
            currentUser={currentUser}
            setAuthModalOpen={setAuthModalOpen}
            storeStatus={storeStatus}
          />
        );
    }
  };

  // Determine if we should show standard header/footer
  const showStandardLayout = currentView !== 'admin';

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans overflow-x-hidden selection:bg-brand-accent selection:text-white relative pb-16">
      <AnimatePresence mode="wait">
        {(loading || authLoading) ? (
          /* ANDROID APP NATIVE SPLASH LOADING SCREEN */
          <motion.div
            key="android-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 bg-[#0d1117] z-50 flex flex-col items-center justify-between py-12 px-6 text-center select-none"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ArwalEats Engine v3.0</span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#ef4444] to-[#f43f5e] flex items-center justify-center shadow-2xl shadow-rose-500/20 border border-rose-500/30 relative"
              >
                <Bell size={36} className="text-white animate-pulse" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#ef4444] rounded-full flex items-center justify-center border-2 border-[#ef4444] text-[9px] font-black">
                  1
                </div>
              </motion.div>
              
              <div className="space-y-1">
                <h1 className="font-display text-3xl font-black tracking-tight text-white">
                  Arwal<span className="text-[#ef4444]">Eats</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Hot Food Delivery & Live Admin Hub</p>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-gray-800 border-t-[#ef4444] rounded-full animate-spin" />
              </div>

              <p className="text-[11px] font-mono font-semibold text-gray-400 h-4">
                {statusMessage}
              </p>

              <div className="flex items-center justify-center gap-1.5 text-gray-500 text-[10px] font-bold">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>Encrypted Sandbox Environment</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col w-full"
          >
            {/* Conditionally Render Customer Header */}
            {showStandardLayout && (
              <Header
                currentView={currentView}
                setCurrentView={navigateToView}
                currentUser={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
                onLogout={handleLogout}
                cart={cart}
                notifications={customerNotifications}
                onClearNotifications={handleClearNotifications}
                onMarkRead={handleMarkNotificationRead}
                storeStatus={storeStatus}
              />
            )}

            {/* View Container */}
            <main className={`flex-grow flex flex-col ${showStandardLayout ? 'pb-16 md:pb-0' : ''}`}>
              {renderActiveView()}
            </main>

            {/* Conditionally Render Customer Footer */}
            {showStandardLayout && (
              <Footer setCurrentView={navigateToView} />
            )}

            {/* Live Floating Notifications Toast Channel */}
            <div className="fixed top-24 right-4 z-50 flex flex-col gap-3 max-w-sm w-[90%] pointer-events-none">
              <AnimatePresence>
                {toasts.map((toast) => (
                  <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, x: 50, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 select-none"
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      toast.type === 'offer' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35' 
                        : toast.type === 'dish'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/35'
                        : toast.type === 'status'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/35'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/35'
                    }`}>
                      <Bell size={18} className={toast.type === 'status' ? 'animate-bounce' : 'animate-pulse'} />
                    </div>
                    
                    <div className="flex-grow space-y-1">
                      <h4 className="text-xs font-black tracking-wide flex items-center gap-1.5">
                        {toast.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium leading-normal">
                        {toast.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/40 cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(customer) => {
          setAuthModalOpen(false);
        }}
      />

      {/* Multi-Restaurant Mismatch Warning Modal */}
      <AnimatePresence>
        {pendingCartItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingCartItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              id="multi-restaurant-overlay"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-brand-card p-6 shadow-2xl space-y-6 z-10"
              id="multi-restaurant-modal"
            >
              <div className="flex items-start gap-4" id="multi-restaurant-content">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl shrink-0 border border-rose-100" id="multi-restaurant-icon-container">
                  <Store size={24} className="animate-pulse" id="multi-restaurant-store-icon" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-brand-text tracking-tight" id="multi-restaurant-title">
                    Order from One Restaurant Only
                  </h3>
                  <p className="text-xs text-brand-text-sec font-semibold leading-relaxed" id="multi-restaurant-description">
                    You already have items from another restaurant in your cart. To add <span className="text-brand-accent">"{pendingCartItem.item.name}"</span>, you'll need to clear your current cart.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3" id="multi-restaurant-actions">
                <button
                  type="button"
                  id="multi-restaurant-btn-cancel"
                  onClick={() => setPendingCartItem(null)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-brand-bg text-brand-text border border-brand-card hover:bg-brand-card/35 transition-all cursor-pointer text-center"
                >
                  Keep Existing Cart
                </button>
                <button
                  type="button"
                  id="multi-restaurant-btn-confirm"
                  onClick={handleConfirmReplaceCart}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-brand-accent text-white hover:bg-opacity-90 transition-all cursor-pointer shadow-lg shadow-brand-accent/25 text-center"
                >
                  Start New Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
