import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, LogIn, CheckCircle, XCircle, Clock, MapPin, User, Phone, CreditCard, ShoppingBag, LogOut, RefreshCw } from 'lucide-react';
import { getAdminOrders, updateOrderStatus, merchantLogin, getRestaurants } from '../services/dbSimulator';
import { Restaurant, Order } from '../types';

interface RestaurantPortalViewProps {
  setCurrentView: (view: string) => void;
}

export default function RestaurantPortalView({ setCurrentView }: RestaurantPortalViewProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeRestaurant, setActiveRestaurant] = useState<Restaurant | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    let restaurant = null;
    const sessionRestStr = sessionStorage.getItem('arwaleats_current_restaurant');
    if (sessionRestStr && sessionRestStr !== 'undefined') {
      try {
        restaurant = JSON.parse(sessionRestStr);
      } catch (e) {
        console.error(e);
      }
    }

    const remember = localStorage.getItem('arwaleats_restaurant_remember') === 'true';
    if (!restaurant && remember) {
      const localRestStr = localStorage.getItem('arwaleats_current_restaurant');
      if (localRestStr && localRestStr !== 'undefined') {
        try {
          restaurant = JSON.parse(localRestStr);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (restaurant) {
      setActiveRestaurant(restaurant);
      setIsLoggedIn(true);
      if (remember) {
        setRememberMe(true);
      }
    } else {
      setIsLoggedIn(false);
      setActiveRestaurant(null);
      const savedUser = localStorage.getItem('arwaleats_restaurant_remember_username') || '';
      const savedPass = localStorage.getItem('arwaleats_restaurant_remember_password') || '';
      if (savedUser) {
        setUsernameInput(savedUser);
        setPasswordInput(savedPass);
        setRememberMe(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const rests = await getRestaurants();
        setRestaurants(rests);
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
      }
    };
    fetchRestaurants();

    window.addEventListener('arwaeatsin_restaurants_updated', fetchRestaurants);
    window.addEventListener('arwaleats_restaurants_updated', fetchRestaurants);
    return () => {
      window.removeEventListener('arwaeatsin_restaurants_updated', fetchRestaurants);
      window.removeEventListener('arwaleats_restaurants_updated', fetchRestaurants);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const res = await merchantLogin(usernameInput, passwordInput);
      if (res.success && res.restaurant) {
        setActiveRestaurant(res.restaurant);
        setIsLoggedIn(true);
        if (rememberMe) {
          localStorage.setItem('arwaleats_current_restaurant', JSON.stringify(res.restaurant));
          localStorage.setItem('arwaleats_restaurant_remember', 'true');
          localStorage.setItem('arwaleats_restaurant_remember_username', usernameInput);
          localStorage.setItem('arwaleats_restaurant_remember_password', passwordInput);
        } else {
          sessionStorage.setItem('arwaleats_current_restaurant', JSON.stringify(res.restaurant));
          localStorage.removeItem('arwaleats_current_restaurant');
          localStorage.setItem('arwaleats_restaurant_remember', 'false');
          localStorage.removeItem('arwaleats_restaurant_remember_username');
          localStorage.removeItem('arwaleats_restaurant_remember_password');
        }
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setLoginError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Authentication failed. Check your connection to Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveRestaurant(null);
    setPendingOrders([]);
    sessionStorage.removeItem('arwaleats_current_restaurant');
    localStorage.removeItem('arwaleats_current_restaurant');
    localStorage.removeItem('arwaleats_restaurant_remember');
    localStorage.removeItem('arwaleats_restaurant_remember_username');
    localStorage.removeItem('arwaleats_restaurant_remember_password');
  };

  const fetchPendingOrders = async (showSpinner = false) => {
    if (!activeRestaurant) return;
    if (showSpinner) setIsRefreshing(true);
    
    try {
      const allOrders = await getAdminOrders();
      
      const filtered = allOrders.filter(order => {
        const orderRestId = order.restaurantId;
        const matchesRest = orderRestId === activeRestaurant.id;
        return matchesRest && order.status === 'Pending';
      });
      
      setPendingOrders(filtered);
    } catch (err) {
      console.error('Failed to fetch pending orders:', err);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeRestaurant) {
      fetchPendingOrders(true);
      const interval = setInterval(() => fetchPendingOrders(false), 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, activeRestaurant]);

  const handleAction = async (orderId: string, status: 'Accepted' | 'Rejected') => {
    try {
      // Optimistic update
      setPendingOrders(prev => prev.filter(o => o.orderId !== orderId));
      await updateOrderStatus(orderId, status);
      fetchPendingOrders();
    } catch (err) {
      alert('Failed to update order status.');
      fetchPendingOrders();
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg pt-24 pb-12 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-brand-card shadow-xl"
            >
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent mb-4">
                  <Store size={32} />
                </div>
                <h1 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight">Restaurant Portal</h1>
                <p className="text-xs text-brand-text-sec mt-2 font-semibold">Sign in to manage incoming orders</p>
              </div>

              {loginError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                  <XCircle size={16} /> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-brand-text uppercase tracking-wider block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-card focus:outline-none focus:border-brand-accent text-sm font-semibold"
                    placeholder="e.g. zaika"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-text uppercase tracking-wider block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-card focus:outline-none focus:border-brand-accent text-sm font-semibold"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center py-1">
                  <input 
                    type="checkbox" 
                    id="rememberMeMerchant" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-card text-brand-accent focus:ring-brand-accent cursor-pointer"
                  />
                  <label htmlFor="rememberMeMerchant" className="ml-2 text-xs font-bold text-brand-text-sec select-none cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-zinc-300 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><LogIn size={18} /> Sign In</>}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="portal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="bg-brand-text text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <img src={activeRestaurant?.image} alt="" className="w-full h-full object-cover blur-sm" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                  <img src={activeRestaurant?.image} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
                  <div>
                    <span className="text-[10px] bg-brand-accent px-2 py-0.5 rounded uppercase tracking-wider font-black mb-1 inline-block">Live Portal</span>
                    <h2 className="text-2xl font-display font-black uppercase">{activeRestaurant?.name}</h2>
                    <p className="text-xs text-white/70 font-semibold">{activeRestaurant?.address}</p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  <button onClick={() => fetchPendingOrders(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                    <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>

              {/* Orders List */}
              <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xl font-display font-black text-brand-text flex items-center gap-2">
                  <Clock size={24} className="text-yellow-500" /> New Pending Orders
                </h3>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 font-black text-xs uppercase tracking-widest rounded-lg">
                  {pendingOrders.length} {pendingOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-brand-card">
                  <ShoppingBag size={48} className="mx-auto text-zinc-200 mb-4" />
                  <p className="text-lg font-black text-brand-text mb-2">No New Orders</p>
                  <p className="text-sm font-semibold text-brand-text-sec">Listening for incoming orders...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {pendingOrders.map(order => (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className="bg-white rounded-3xl border-2 border-yellow-400 shadow-lg overflow-hidden flex flex-col"
                      >
                        <div className="bg-yellow-50 p-4 border-b border-yellow-200 flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-yellow-700 bg-yellow-200 px-2 py-1 rounded mb-2 inline-block">New Order</span>
                            <h4 className="font-display font-black text-lg text-brand-text">{order.orderId}</h4>
                            <p className="text-xs font-bold text-brand-text-sec">{new Date(order.date).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest block mb-1">Order Value</span>
                            <span className="font-display font-black text-2xl text-brand-accent">₹{order.total}</span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-black uppercase tracking-widest text-brand-text-sec flex items-center gap-1.5"><User size={12}/> Customer</h5>
                            <p className="text-sm font-bold text-brand-text">{order.customerName || 'N/A'}</p>
                            <p className="text-xs font-semibold text-brand-text-sec flex items-center gap-1.5"><Phone size={14}/> {order.phone || 'N/A'}</p>
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-black uppercase tracking-widest text-brand-text-sec flex items-center gap-1.5"><CreditCard size={12}/> Payment</h5>
                            <p className="text-sm font-bold text-brand-text uppercase">{order.paymentMethod || 'N/A'}</p>
                            <p className="text-xs font-semibold text-brand-text-sec">{order.paymentStatus || 'Pending'}</p>
                          </div>

                          <div className="col-span-2 space-y-3 pt-4 border-t border-brand-card">
                            <h5 className="text-[9px] font-black uppercase tracking-widest text-brand-text-sec flex items-center gap-1.5"><MapPin size={12}/> Delivery Address</h5>
                            <p className="text-sm font-semibold text-brand-text leading-relaxed">{order.address || 'N/A'}</p>
                          </div>

                          <div className="col-span-2 space-y-4 pt-4 border-t border-brand-card">
                            {(() => {
                              const myItems = order.items || [];
                              const otherItems: any[] = [];
                              const mySubtotal = myItems.reduce((acc: number, item: any) => acc + (parseFloat(item.price) || 0) * item.qty, 0);

                              return (
                                <div className="space-y-4">
                                  {/* Title and breakdown */}
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[9px] font-black uppercase tracking-widest text-brand-text-sec flex items-center gap-1.5">
                                      <ShoppingBag size={12}/> Items Ordered
                                    </h5>
                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200/50 px-2.5 py-1 rounded uppercase tracking-wider shrink-0">
                                      Your Share: ₹{mySubtotal}
                                    </span>
                                  </div>

                                  {/* My Items list */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                                      <span>Items to Prepare (Your Restaurant):</span>
                                    </p>
                                    <ul className="space-y-1.5 pl-2 border-l-2 border-emerald-400">
                                      {myItems.map((item: any, idx: number) => (
                                        <li key={idx} className="flex justify-between items-start text-sm bg-emerald-50/30 p-1.5 rounded-lg border border-emerald-100/30">
                                          <span className="font-bold text-brand-text">
                                            <span className="text-emerald-600 mr-2">[{item.qty}x]</span>
                                            {item.name} {item.variant && <span className="text-xs text-brand-text-sec ml-1">({item.variant})</span>}
                                          </span>
                                          <span className="font-bold text-brand-text">₹{item.price * item.qty}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Other Items list */}
                                  {otherItems.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-dashed border-brand-card/60">
                                      <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
                                        <span>⚠️ Items from Other Restaurants (Do NOT Prepare):</span>
                                      </p>
                                      <ul className="space-y-1.5 pl-2 border-l-2 border-amber-300 opacity-75">
                                        {otherItems.map((item: any, idx: number) => {
                                          const otherRestId = item.restaurantId || order.restaurantId || 'rest1';
                                          const otherRest = restaurants.find(r => r.id === otherRestId);
                                          return (
                                            <li key={idx} className="flex justify-between items-start text-xs text-zinc-500 bg-amber-50/10 p-1.5 rounded-lg border border-amber-100/10">
                                              <span className="font-semibold flex flex-wrap items-center gap-1.5">
                                                <span>{item.qty}x {item.name} {item.variant && `(${item.variant})`}</span>
                                                {otherRest && (
                                                  <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none">
                                                    {otherRest.name}
                                                  </span>
                                                )}
                                              </span>
                                              <span className="font-semibold text-zinc-500">₹{item.price * item.qty}</span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="p-4 bg-zinc-50 border-t border-brand-card flex gap-3">
                          <button
                            onClick={() => handleAction(order.orderId, 'Rejected')}
                            className="flex-1 py-3.5 bg-white border-2 border-red-100 hover:bg-red-50 hover:border-red-200 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle size={18} /> Reject
                          </button>
                          <button
                            onClick={() => handleAction(order.orderId, 'Accepted')}
                            className="flex-[2] py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={18} /> Accept Order
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
