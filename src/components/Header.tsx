import { useState, useEffect, useRef } from 'react';
import { Home, Compass, ShoppingCart, User, ClipboardList, Menu, X, LogIn, PhoneCall, Info, Clock, Store, Bell, Trash2, Check, Sparkles, Lock } from 'lucide-react';
import { Customer, CartItem } from '../types';
import { registerBackButtonHandler } from '../utils/backButton';
import { StoreStatus } from '../utils/storeStatus';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentUser: Customer | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  cart: CartItem[];
  notifications?: any[];
  onClearNotifications?: () => void;
  onMarkRead?: (id: string) => void;
  storeStatus?: StoreStatus;
}

export default function Header({
  currentView,
  setCurrentView,
  currentUser,
  onOpenAuth,
  onLogout,
  cart,
  notifications = [],
  onClearNotifications,
  onMarkRead,
  storeStatus,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [istTime, setIstTime] = useState<string>('');
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close notification tray on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [notifOpen]);

  // Handle Back Button to close Drawer or Notification Tray
  useEffect(() => {
    if (drawerOpen || notifOpen) {
      return registerBackButtonHandler(() => {
        if (drawerOpen) {
          setDrawerOpen(false);
          return true;
        }
        if (notifOpen) {
          setNotifOpen(false);
          return true;
        }
        return false;
      });
    }
  }, [drawerOpen, notifOpen]);

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setIstTime(timeStr);
      } catch (err) {
        // Fallback calculation for safe offline standard IST timezone mapping
        const now = new Date();
        let h = now.getUTCHours() + 5;
        let m = now.getUTCMinutes() + 30;
        if (m >= 60) { h += 1; m -= 60; }
        if (h >= 24) { h -= 24; }
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = m.toString().padStart(2, '0');
        setIstTime(`${displayH}:${displayM} ${ampm}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'menu', label: 'Menu', icon: Compass },
    { id: 'orders', label: 'My Orders', icon: ClipboardList, private: true },
  ];

  const handleNavClick = (viewId: string) => {
    if (viewId === 'orders' && !currentUser) {
      onOpenAuth();
    } else {
      setCurrentView(viewId);
    }
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Admin Store Closed Notice Banner */}
      {storeStatus && !storeStatus.isOpen && (
        <div className="bg-rose-600 text-white text-[11px] font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm z-50">
          <Lock size={14} className="shrink-0 animate-bounce text-white" />
          <span className="truncate max-w-4xl">
            <strong className="font-black uppercase tracking-wider mr-1">Ordering Closed:</strong> 
            {storeStatus.message || 'We are currently closed for online orders. Please check back during opening hours!'}
          </span>
        </div>
      )}

      {/* Top Sticky Header */}
      <header
        id="app-header"
        className={`sticky top-0 z-50 transition-all duration-300 border-b border-brand-bg-sec bg-white/80 backdrop-blur-md ${
          scrolled ? 'py-3 shadow-sm' : 'py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          {/* Logo */}
          <button
            id="brand-logo"
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className="h-11 w-11 rounded-[14px] bg-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand-accent/25 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                className="w-7 h-7"
                fill="none"
              >
                {/* Dome knob / handle */}
                <circle cx="55" cy="22" r="3" fill="currentColor" />
                
                {/* Dome of the cloche */}
                <path
                  d="M 36 45 A 19 19 0 0 1 74 45 Z"
                  fill="currentColor"
                />
                
                {/* Shiny accent line inside dome */}
                <path
                  d="M 43 40 A 14 14 0 0 1 67 40"
                  stroke="#F62440"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Plate */}
                <rect x="29" y="46" width="52" height="4" rx="2" fill="currentColor" />

                {/* Drip shape */}
                <path
                  d="M 51 50 C 51 54, 52.5 56, 52.5 58 C 52.5 59.5, 53.5 61, 55 61 C 56.5 61, 57.5 59.5, 57.5 58 C 57.5 56, 59 54, 59 50 Z"
                  fill="currentColor"
                />

                {/* Small drop under the drip */}
                <circle cx="55" cy="66" r="2" fill="currentColor" />

                {/* Speed lines */}
                <rect x="21" y="38" width="6" height="2" rx="1" fill="currentColor" />
                <rect x="13" y="43" width="13" height="2" rx="1" fill="currentColor" />
                <rect x="17" y="48" width="8" height="2" rx="1" fill="currentColor" />
              </svg>
            </div>
            <div className="text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-brand-text leading-none">
                  Arwal<span className="text-brand-accent">Eats</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              </div>
              <p className="text-[10px] text-brand-text-sec tracking-widest uppercase font-extrabold mt-0.5 hidden sm:block">
                Good Food, Delivered Fast
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav id="desktop-nav" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-semibold transition-colors relative py-1 focus:outline-none cursor-pointer ${
                  currentView === item.id
                    ? 'text-brand-accent'
                    : 'text-brand-text-sec hover:text-brand-accent'
                }`}
              >
                {item.label}
                {currentView === item.id && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => setCurrentView('cart')}
              className="relative p-2.5 rounded-xl bg-brand-card hover:bg-brand-accent hover:text-white text-brand-text transition-all duration-200 cursor-pointer"
            >
              <ShoppingCart size={20} />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-accent text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-brand-bg-sec shadow-sm animate-bounce">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Live Notifications Bell Button & Popover */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="header-notif-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none ${
                  notifOpen 
                    ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/25' 
                    : 'bg-brand-card hover:bg-brand-accent hover:text-white text-brand-text'
                }`}
                title="Customer Live Notifications"
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[9px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-brand-bg-sec shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl border border-brand-card shadow-xl z-50 overflow-hidden animate-fadeIn">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-brand-accent animate-bounce" />
                      <span className="text-xs font-black tracking-wider uppercase">Live Alerts Feed</span>
                    </div>
                    {notifications.length > 0 && onClearNotifications && (
                      <button
                        onClick={() => {
                          onClearNotifications();
                          setNotifOpen(false);
                        }}
                        className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-brand-card/30">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2 select-none">
                        <div className="h-10 w-10 rounded-full bg-brand-bg flex items-center justify-center mx-auto text-brand-text-sec text-sm">🔔</div>
                        <p className="text-xs font-black text-brand-text">All Caught Up!</p>
                        <p className="text-[10px] text-brand-text-sec font-medium">When you place an order or admin sends fresh offers, alerts show up here.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3.5 flex gap-3 transition-colors ${
                            notif.read ? 'bg-white opacity-80' : 'bg-brand-accent/5'
                          }`}
                        >
                          <div className={`p-2 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            notif.type === 'offer' 
                              ? 'bg-amber-50 text-amber-700' 
                              : notif.type === 'dish'
                              ? 'bg-purple-50 text-purple-700'
                              : notif.type === 'status'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {notif.type === 'offer' ? <Sparkles size={14} /> : <Bell size={14} />}
                          </div>

                          <div className="flex-grow space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h5 className="text-[11px] font-black text-brand-text leading-tight">{notif.title}</h5>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[10px] text-brand-text-sec font-medium leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="text-[8px] font-mono font-bold text-brand-text-sec uppercase">
                                {new Date(notif.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {!notif.read && onMarkRead && (
                                <button
                                  onClick={() => onMarkRead(notif.id)}
                                  className="text-[9px] font-black uppercase text-brand-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Check size={10} />
                                  <span>Mark Read</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile / Auth Button */}
            {currentUser ? (
              <div className="hidden md:flex items-center gap-3">
                <button
                  id="header-profile-btn"
                  onClick={() => setCurrentView('profile')}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-brand-card hover:border-brand-accent transition-all cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-brand-text max-w-[100px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </button>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={onOpenAuth}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-semibold text-xs transition-all shadow-md shadow-brand-accent/10 cursor-pointer"
              >
                <LogIn size={14} />
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="md:hidden p-2.5 rounded-xl bg-brand-bg-sec text-brand-text border border-brand-card hover:bg-brand-card transition-colors cursor-pointer"
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar / Drawer Menu */}
      {drawerOpen && (
        <div id="mobile-drawer-overlay" className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-brand-bg-sec shadow-2xl p-6 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-brand-accent flex items-center justify-center text-white shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 100 100"
                      className="w-5 h-5"
                      fill="none"
                    >
                      {/* Dome knob / handle */}
                      <circle cx="55" cy="22" r="3" fill="currentColor" />
                      
                      {/* Dome of the cloche */}
                      <path
                        d="M 36 45 A 19 19 0 0 1 74 45 Z"
                        fill="currentColor"
                      />
                      
                      {/* Shiny accent line inside dome */}
                      <path
                        d="M 43 40 A 14 14 0 0 1 67 40"
                        stroke="#F62440"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Plate */}
                      <rect x="29" y="46" width="52" height="4" rx="2" fill="currentColor" />

                      {/* Drip shape */}
                      <path
                        d="M 51 50 C 51 54, 52.5 56, 52.5 58 C 52.5 59.5, 53.5 61, 55 61 C 56.5 61, 57.5 59.5, 57.5 58 C 57.5 56, 59 54, 59 50 Z"
                        fill="currentColor"
                      />

                      {/* Small drop under the drip */}
                      <circle cx="55" cy="66" r="2" fill="currentColor" />

                      {/* Speed lines */}
                      <rect x="21" y="38" width="6" height="2" rx="1" fill="currentColor" />
                      <rect x="13" y="43" width="13" height="2" rx="1" fill="currentColor" />
                      <rect x="17" y="48" width="8" height="2" rx="1" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="font-display text-lg font-black tracking-tight text-brand-text">
                    Arwal<span className="text-brand-accent">Eats</span>
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-brand-card text-brand-text"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Profile Summary */}
              {currentUser && (
                <div className="mb-6 p-4 rounded-xl bg-brand-card/40 border border-brand-card flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold text-lg">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-text">{currentUser.name}</h4>
                    <p className="text-[11px] text-brand-text-sec">{currentUser.email}</p>
                  </div>
                </div>
              )}

              {/* Nav Items */}
              <nav className="flex flex-col gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        currentView === item.id
                          ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/10'
                          : 'text-brand-text-sec hover:bg-brand-card hover:text-brand-text'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}

                {/* Mobile Profile Link */}
                {currentUser && (
                  <button
                    onClick={() => handleNavClick('profile')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      currentView === 'profile'
                        ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/10'
                        : 'text-brand-text-sec hover:bg-brand-card hover:text-brand-text'
                    }`}
                  >
                    <User size={18} />
                    My Profile
                  </button>
                )}
              </nav>
            </div>

            {/* Logout/Login Button at Bottom of Drawer */}
            <div className="pt-6 border-t border-brand-card/50">
              {currentUser ? (
                <button
                  onClick={() => {
                    onLogout();
                    setDrawerOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 font-bold text-sm transition-all text-center"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full py-3 rounded-xl bg-brand-accent text-white font-bold text-sm transition-all shadow-md shadow-brand-accent/20 text-center"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation (Native App Feel) */}
      <div
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-brand-card/50 px-4 py-2 flex items-center justify-around z-50 md:hidden shadow-lg"
      >
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-0.5 text-center focus:outline-none cursor-pointer ${
            currentView === 'home' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => setCurrentView('restaurants')}
          className={`flex flex-col items-center gap-0.5 text-center focus:outline-none cursor-pointer ${
            currentView === 'restaurants' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <Store size={20} />
          <span className="text-[10px] font-bold">Restaurants</span>
        </button>

        <button
          onClick={() => setCurrentView('menu')}
          className={`flex flex-col items-center gap-0.5 text-center focus:outline-none cursor-pointer ${
            currentView === 'menu' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <Compass size={20} />
          <span className="text-[10px] font-bold">Menu</span>
        </button>

        <button
          onClick={() => setCurrentView('cart')}
          className={`flex flex-col items-center gap-0.5 text-center relative focus:outline-none cursor-pointer ${
            currentView === 'cart' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <ShoppingCart size={20} />
          {totalCartItems > 0 && (
            <span className="absolute -top-1 -right-2.5 bg-brand-accent text-white font-bold text-[8px] h-4 w-4 rounded-full flex items-center justify-center border border-white">
              {totalCartItems}
            </span>
          )}
          <span className="text-[10px] font-bold">Cart</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setCurrentView('orders');
          }}
          className={`flex flex-col items-center gap-0.5 text-center focus:outline-none cursor-pointer ${
            currentView === 'orders' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <ClipboardList size={20} />
          <span className="text-[10px] font-bold">Orders</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setCurrentView('profile');
          }}
          className={`flex flex-col items-center gap-0.5 text-center focus:outline-none cursor-pointer ${
            currentView === 'profile' ? 'text-brand-accent' : 'text-brand-text-sec'
          }`}
        >
          <User size={20} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </>
  );
}
