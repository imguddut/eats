import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, ClipboardList, CheckCircle2, XCircle, LogOut, Lock, User, Phone, 
  MapPin, Clock, Calendar, Check, AlertCircle, Copy, ExternalLink, PhoneCall,
  Search, ShieldAlert, Navigation, ArrowRight, MessageSquare, Store
} from 'lucide-react';
import { 
  adminLogin, getCurrentAdmin, logoutAdmin, getAdminOrders, 
  assignDeliveryBoy, updateOrderStatus, rejectOrReleaseOrder, getRestaurants 
} from '../services/dbSimulator';
import { Order, OrderItem, OrderStatus } from '../types';
import { registerBackButtonHandler } from '../utils/backButton';

interface DeliveryViewProps {
  setCurrentView: (view: string) => void;
}

export default function DeliveryView({ setCurrentView }: DeliveryViewProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  
  // Login states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Core Data
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Accept Order Modal State
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState<Order | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [estTime, setEstTime] = useState('25-30 mins');
  const [riderNotesInput, setRiderNotesInput] = useState('');
  const [submittingAccept, setSubmittingAccept] = useState(false);

  // Copy helper
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Status Update Confirmation Modal State
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    orderId: string;
    newStatus: OrderStatus;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reject & Release Confirmation Modal State
  const [rejectConfirmOrderId, setRejectConfirmOrderId] = useState<string | null>(null);
  const [releasingOrder, setReleasingOrder] = useState(false);
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);

  // Declined/Rejected jobs list (hidden from available jobs feed)
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);

  // Load hidden/declined orders on mount or user change
  useEffect(() => {
    if (currentUser) {
      const usernameKey = currentUser.username.toLowerCase();
      const stored = JSON.parse(localStorage.getItem(`arwaleats_hidden_orders_${usernameKey}`) || '[]');
      setHiddenOrderIds(stored);
    } else {
      setHiddenOrderIds([]);
    }
  }, [currentUser]);

  // Handle Back Button inside Delivery Portal
  useEffect(() => {
    if (!isLoggedIn) return;

    return registerBackButtonHandler(() => {
      if (selectedOrderForAccept) {
        setSelectedOrderForAccept(null);
        return true;
      }
      if (statusConfirmModal) {
        setStatusConfirmModal(null);
        return true;
      }
      if (rejectConfirmOrderId) {
        setRejectConfirmOrderId(null);
        return true;
      }
      if (decliningOrderId) {
        setDecliningOrderId(null);
        return true;
      }

      if (activeTab !== 'available') {
        setActiveTab('available');
        return true;
      }

      return false;
    });
  }, [
    isLoggedIn, selectedOrderForAccept, statusConfirmModal, rejectConfirmOrderId,
    decliningOrderId, activeTab
  ]);

  // Check login on mount
  useEffect(() => {
    let rider = null;
    const sessionRiderStr = sessionStorage.getItem('arwaleats_current_delivery');
    if (sessionRiderStr && sessionRiderStr !== 'undefined') {
      try {
        rider = JSON.parse(sessionRiderStr);
      } catch (e) {
        console.error(e);
      }
    }

    const remember = localStorage.getItem('arwaleats_delivery_remember') === 'true';
    if (!rider && remember) {
      const localRiderStr = localStorage.getItem('arwaleats_current_delivery');
      if (localRiderStr && localRiderStr !== 'undefined') {
        try {
          rider = JSON.parse(localRiderStr);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (rider && rider.role === 'Delivery Boy') {
      setCurrentUser(rider);
      setIsLoggedIn(true);
      const formattedName = rider.username.charAt(0).toUpperCase() + rider.username.slice(1);
      setRiderName(formattedName);
      if (remember) {
        setRememberMe(true);
      }
    } else if (rider) {
      setLoginError('This portal is restricted to Delivery Partners. You are logged in as Admin.');
    } else {
      // Check if we have remembered username/password to prefill
      const savedUser = localStorage.getItem('arwaleats_delivery_remember_username') || '';
      const savedPass = localStorage.getItem('arwaleats_delivery_remember_password') || '';
      if (savedUser) {
        setUsernameInput(savedUser);
        setPasswordInput(savedPass);
        setRememberMe(true);
      }
    }
  }, []);

  // Fetch orders when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    async function fetchOrders() {
      try {
        const allOrders = await getAdminOrders();
        const rests = await getRestaurants();
        setOrders(allOrders);
        setRestaurants(rests);
      } catch (err) {
        console.error('Error fetching orders:', err);
      }
    }

    fetchOrders();

    // Auto refresh every 3 seconds to look for new orders (fast syncing)
    const interval = setInterval(fetchOrders, 3000);

    // Instant sync on custom events
    window.addEventListener('arwaeatsin_restaurants_updated', fetchOrders);
    window.addEventListener('arwaleats_restaurants_updated', fetchOrders);

    return () => {
      clearInterval(interval);
      window.removeEventListener('arwaeatsin_restaurants_updated', fetchOrders);
      window.removeEventListener('arwaleats_restaurants_updated', fetchOrders);
    };
  }, [isLoggedIn, refreshTrigger]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const res = await adminLogin(usernameInput, passwordInput);
      if (res.success && res.admin) {
        if (res.admin.role === 'Delivery Boy') {
          setCurrentUser(res.admin);
          setIsLoggedIn(true);
          const formattedName = res.admin.username.charAt(0).toUpperCase() + res.admin.username.slice(1);
          setRiderName(formattedName);
          setLoginError('');
          
          if (rememberMe) {
            localStorage.setItem('arwaleats_current_delivery', JSON.stringify(res.admin));
            localStorage.setItem('arwaleats_delivery_remember', 'true');
            localStorage.setItem('arwaleats_delivery_remember_username', usernameInput);
            localStorage.setItem('arwaleats_delivery_remember_password', passwordInput);
          } else {
            sessionStorage.setItem('arwaleats_current_delivery', JSON.stringify(res.admin));
            localStorage.removeItem('arwaleats_current_delivery');
            localStorage.setItem('arwaleats_delivery_remember', 'false');
            localStorage.removeItem('arwaleats_delivery_remember_username');
            localStorage.removeItem('arwaleats_delivery_remember_password');
          }
        } else {
          // It's a Super Admin, we log them out or warn them
          logoutAdmin();
          setLoginError('This portal is restricted to Delivery Partners. Use partner logins: (ujjwal / ujjwal123) or (sarvjit / sarvjit123).');
        }
      } else {
        setLoginError(res.message || 'Invalid delivery credentials. Use (ujjwal / ujjwal123) or (sarvjit / sarvjit123).');
      }
    } catch (err) {
      setLoginError('Authentication failed. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
    sessionStorage.removeItem('arwaleats_current_delivery');
    localStorage.removeItem('arwaleats_current_delivery');
    localStorage.removeItem('arwaleats_delivery_remember');
    localStorage.removeItem('arwaleats_delivery_remember_username');
    localStorage.removeItem('arwaleats_delivery_remember_password');
  };

  const openAcceptModal = (order: Order) => {
    setSelectedOrderForAccept(order);
    // Try to restore saved details or use defaults
    const usernameKey = currentUser?.username.toLowerCase() || '';
    const savedPhone = localStorage.getItem(`arwaleats_rider_phone_${usernameKey}`) 
      || localStorage.getItem('arwaleats_rider_phone') 
      || '8102123746';
    const savedVehicle = localStorage.getItem(`arwaleats_rider_vehicle_${usernameKey}`) 
      || localStorage.getItem('arwaleats_rider_vehicle') 
      || (usernameKey === 'ujjwal' ? 'BR-26A-1111' : usernameKey === 'sarvjit' ? 'BR-26A-2222' : 'BR-26A-1000');
    setRiderPhone(savedPhone);
    setVehicleNo(savedVehicle);
    setRiderNotesInput('Leaving the partner kitchen shortly!');
  };

  const closeAcceptModal = () => {
    setSelectedOrderForAccept(null);
  };

  const handleAcceptOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAccept) return;
    if (!riderName.trim() || !riderPhone.trim()) {
      alert('Rider Name and Phone Number are required to accept and share details!');
      return;
    }

    setSubmittingAccept(true);
    try {
      const usernameKey = currentUser?.username.toLowerCase() || '';
      localStorage.setItem(`arwaleats_rider_phone_${usernameKey}`, riderPhone.trim());
      localStorage.setItem(`arwaleats_rider_vehicle_${usernameKey}`, vehicleNo.trim());
      // Save rider phone & vehicle to localStorage for convenience
      localStorage.setItem('arwaleats_rider_phone', riderPhone.trim());
      localStorage.setItem('arwaleats_rider_vehicle', vehicleNo.trim());

      const success = await assignDeliveryBoy(selectedOrderForAccept.orderId, {
        deliveryBoyName: riderName.trim(),
        deliveryBoyPhone: riderPhone.trim(),
        vehicleNumber: vehicleNo.trim(),
        estimatedDeliveryTime: estTime,
        deliveryNotes: riderNotesInput.trim()
      });

      if (success) {
        // Force state update to 'Accepted' to ensure order lands on correct 'Accepted' stage
        // and overrides any potential stale or misconfigured web app behavior
        await updateOrderStatus(selectedOrderForAccept.orderId, 'Accepted');

        // Trigger status update notification
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = `🚴 Order #${selectedOrderForAccept.orderId} successfully accepted! Details shared with customer.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);

        closeAcceptModal();
        setRefreshTrigger(prev => prev + 1);
        setActiveTab('active');
      } else {
        alert('Failed to accept order. It might have already been taken.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order on Google Sheets.');
    } finally {
      setSubmittingAccept(false);
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setStatusConfirmModal({ orderId, newStatus });
  };

  const executeStatusUpdate = async () => {
    if (!statusConfirmModal) return;
    const { orderId, newStatus } = statusConfirmModal;
    setUpdatingStatus(true);

    try {
      const success = await updateOrderStatus(orderId, newStatus);
      if (success) {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] ${newStatus === 'Delivered' ? 'bg-green-600' : newStatus === 'Cancelled' ? 'bg-red-600' : 'bg-brand-accent'} text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce`;
        toast.innerHTML = newStatus === 'Delivered' 
          ? `🎉 Order #${orderId} delivered! Keep up the great work.` 
          : newStatus === 'Cancelled'
          ? `🛑 Order #${orderId} marked as Cancelled/Returned.`
          : `⚡ Order #${orderId} stage updated to "${newStatus}"!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        setRefreshTrigger(prev => prev + 1);
      } else {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = `⚠️ Failed to update order status. Please try again.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (err) {
      console.error(err);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
      toast.innerHTML = `⚠️ Error updating order status.`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setUpdatingStatus(false);
      setStatusConfirmModal(null);
    }
  };

  const handleRejectAndRelease = async (orderId: string) => {
    setReleasingOrder(true);
    try {
      const success = await rejectOrReleaseOrder(orderId, riderName || 'Delivery Boy');
      if (success) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = `🛑 Order #${orderId} has been rejected & released back to the open jobs feed.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to release order. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error releasing order.');
    } finally {
      setReleasingOrder(false);
      setRejectConfirmOrderId(null);
    }
  };

  const handleDeclineJob = async (orderId: string) => {
    setDecliningOrderId(orderId);
    try {
      const success = await updateOrderStatus(orderId, 'Rejected');
      if (success) {
        const usernameKey = currentUser?.username.toLowerCase() || 'default';
        const updated = [...hiddenOrderIds, orderId];
        setHiddenOrderIds(updated);
        localStorage.setItem(`arwaleats_hidden_orders_${usernameKey}`, JSON.stringify(updated));

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = `🛑 Job #${orderId} has been officially rejected. Status updated to customer.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to update status to Rejected. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error rejecting order.');
    } finally {
      setDecliningOrderId(null);
    }
  };

  const handleResetDeclined = () => {
    const usernameKey = currentUser?.username.toLowerCase() || 'default';
    setHiddenOrderIds([]);
    localStorage.removeItem(`arwaleats_hidden_orders_${usernameKey}`);

    const toast = document.createElement('div');
    toast.className = 'fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce';
    toast.innerHTML = `🔄 All declined jobs have been restored to your feed.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleCopy = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Filters
  const safeOrders = orders || [];
  const availableOrders = safeOrders.filter(
    o => (o.status === 'Pending' || o.status === 'Preparing' || o.status === 'Accepted') && 
         (!o.deliveryBoyName || o.deliveryBoyName.trim() === '') &&
         !hiddenOrderIds.includes(o.orderId)
  );

  const activeDeliveries = safeOrders.filter(
    o => (o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Rejected') && 
         o.deliveryBoyName?.toLowerCase() === currentUser?.username.toLowerCase()
  );

  const deliveryHistory = safeOrders.filter(
    o => (o.status === 'Delivered' || o.status === 'Cancelled') && 
         o.deliveryBoyName?.toLowerCase() === currentUser?.username.toLowerCase()
  );

  // Stats
  const activeCount = activeDeliveries.length;
  const historyCount = deliveryHistory.length;
  const completedCount = deliveryHistory.filter(o => o.status === 'Delivered').length;
  const totalEarnings = deliveryHistory
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + (parseFloat(o.deliveryFee) || 40), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6" id="delivery-partner-portal">
      
      {!isLoggedIn ? (
        /* LOGIN CARD */
        <div className="max-w-md mx-auto my-12" id="delivery-login-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-brand-card shadow-2xl p-8 overflow-hidden relative"
          >
            {/* Top decorative shape */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-accent to-orange-500"></div>

            <div className="text-center space-y-3 mb-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shadow-inner">
                <Bike className="h-9 w-9 animate-pulse" />
              </div>
              <h2 className="font-display text-2xl font-black text-brand-text tracking-tight">
                Delivery Partner Portal
              </h2>
              <p className="text-xs text-brand-text-sec font-semibold">
                Access your ArwalEats rider dashboard, accept deliveries & share tracking details.
              </p>
            </div>

            {loginError && (
              <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5 text-xs font-semibold leading-relaxed animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1.5 uppercase tracking-wider">
                  Partner Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-text-sec">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter rider username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none bg-brand-bg-sec/50 text-brand-text font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text mb-1.5 uppercase tracking-wider">
                  Secret PIN / Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-brand-text-sec">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none bg-brand-bg-sec/50 text-brand-text font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center py-1">
                <input 
                  type="checkbox" 
                  id="rememberMeDelivery" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-card text-brand-accent focus:ring-brand-accent cursor-pointer"
                />
                <label htmlFor="rememberMeDelivery" className="ml-2 text-xs font-bold text-brand-text-sec select-none cursor-pointer">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-brand-accent hover:bg-brand-accent-hover disabled:bg-brand-accent/60 text-white font-bold text-xs shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Enter Rider Dashboard</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>


          </motion.div>
        </div>
      ) : (
        /* DASHBOARD SECTION */
        <div className="space-y-6" id="delivery-dashboard">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-brand-card rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
                <Bike size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-black text-brand-text">
                    Welcome, {currentUser?.username}!
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-[10px] font-bold">
                    Delivery Partner
                  </span>
                </div>
                <p className="text-xs text-brand-text-sec font-semibold mt-0.5">
                  ArwalEats Active Delivery Team • Keep moving, keep delivering!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-brand-bg-sec hover:bg-brand-card border border-brand-card rounded-xl text-xs font-bold text-brand-text transition-colors cursor-pointer"
              >
                🔄 Refresh Feeds
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-brand-card rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase font-bold text-brand-text-sec tracking-wider">Available Runs</p>
              <h3 className="text-2xl font-black text-brand-text mt-1">{availableOrders.length}</h3>
              <p className="text-[10px] text-green-600 font-bold mt-1">● Live requests</p>
            </div>
            <div className="p-5 bg-white border border-brand-card rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase font-bold text-brand-text-sec tracking-wider">Active Deliveries</p>
              <h3 className="text-2xl font-black text-brand-accent mt-1">{activeCount}</h3>
              <p className="text-[10px] text-brand-text-sec font-semibold mt-1">In progress now</p>
            </div>
            <div className="p-5 bg-white border border-brand-card rounded-2xl shadow-sm">
              <p className="text-[10px] uppercase font-bold text-brand-text-sec tracking-wider">Completed Today</p>
              <h3 className="text-2xl font-black text-brand-text mt-1">{completedCount}</h3>
              <p className="text-[10px] text-brand-text-sec font-semibold mt-1">Out of {historyCount} total</p>
            </div>
            <div className="p-5 bg-gradient-to-br from-brand-accent to-orange-500 rounded-2xl shadow-md text-white">
              <p className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Rider Earnings</p>
              <h3 className="text-2xl font-black mt-1">₹{totalEarnings}</h3>
              <p className="text-[10px] text-white/90 font-semibold mt-1">₹40 delivery fee per order</p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-brand-card/70 bg-white p-1.5 rounded-2xl border">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/15'
                  : 'text-brand-text-sec hover:text-brand-text'
              }`}
            >
              <ClipboardList size={14} />
              <span>Available Jobs ({availableOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                activeTab === 'active'
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/15'
                  : 'text-brand-text-sec hover:text-brand-text'
              }`}
            >
              <Bike size={14} />
              <span>My Runs ({activeCount})</span>
              {activeCount > 0 && (
                <span className="absolute top-2 right-2 md:right-4 h-5 w-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/15'
                  : 'text-brand-text-sec hover:text-brand-text'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Completed ({historyCount})</span>
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div id="delivery-tab-content">
            <AnimatePresence mode="wait">
              
              {activeTab === 'available' && (
                /* AVAILABLE RUNS FEED */
                <motion.div
                  key="available-feed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-brand-text uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                      Open Deliveries Available
                    </h2>
                    <span className="text-[11px] text-brand-text-sec font-semibold">
                      Click to accept and start route
                    </span>
                  </div>

                  {availableOrders.length === 0 ? (
                    <div className="bg-white border border-brand-card rounded-3xl p-12 text-center space-y-4 shadow-sm">
                      <div className="mx-auto h-16 w-16 rounded-full bg-brand-bg-sec border border-brand-card flex items-center justify-center text-brand-text-sec">
                        <Bike size={28} className="text-brand-text-sec/50" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-brand-text">All Clear! No Available Orders</h3>
                        <p className="text-xs text-brand-text-sec font-semibold max-w-sm mx-auto">
                          Great job! No pending orders need to be assigned right now. Keep checking this page or tap refresh.
                        </p>
                      </div>
                      <button
                        onClick={() => setRefreshTrigger(prev => prev + 1)}
                        className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        🔄 Check Again
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableOrders.map((order) => (
                        <div
                          key={order.orderId}
                          className="bg-white border border-brand-card hover:border-brand-accent hover:shadow-md rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-brand-text">Order #{order.orderId}</span>
                                <button
                                  onClick={() => handleCopy(order.orderId)}
                                  className="text-brand-text-sec hover:text-brand-text"
                                  title="Copy Order ID"
                                >
                                  {copiedOrderId === order.orderId ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-brand-warning/10 text-brand-warning text-[9px] font-black uppercase">
                                {order.status}
                              </span>
                            </div>

                            <div className="space-y-1.5 border-t border-b border-brand-card/50 py-3 text-xs">
                              <div className="flex items-start gap-2">
                                <Store className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold text-brand-text">Pick Up From:</p>
                                  <p className="text-brand-text-sec font-bold leading-relaxed">
                                    {(() => {
                                      const restName = order.restaurantName;
                                      if (restName) return restName;
                                      const restId = order.restaurantId;
                                      if (restId) {
                                        const r = restaurants.find(res => res.id === restId);
                                        if (r) return r.name;
                                      }
                                      return 'Unknown Restaurant';
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 pt-1">
                                <MapPin className="h-3.5 w-3.5 text-brand-accent shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold text-brand-text">Deliver To:</p>
                                  <p className="text-brand-text-sec font-semibold leading-relaxed">
                                    {order.address || 'Address not listed'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <Clock className="h-3.5 w-3.5 text-brand-text-sec" />
                                <span className="font-semibold text-brand-text-sec">
                                  Placed on: {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(order.date).toLocaleDateString()})
                                </span>
                              </div>
                            </div>

                            {/* Items Preview */}
                            <div>
                              <p className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider mb-1">Items summary:</p>
                              <div className="text-xs font-bold text-brand-text">
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((item: any, i: number) => {
                                    const itemRestId = item.restaurantId || order.restaurantId || 'rest1';
                                    const itemRest = restaurants.find(r => r.id === itemRestId);
                                    return (
                                      <span key={i} className="inline-flex items-center gap-1 bg-brand-bg-sec border border-brand-card px-2 py-1 rounded-lg text-[10px] font-semibold mr-1.5 mb-1.5">
                                        <span>{item.qty}x {item.name} {item.variant ? `(${item.variant})` : ''}</span>
                                        {itemRest && (
                                          <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-1 py-0.5 rounded text-[8px] font-black tracking-wide leading-none">
                                            {itemRest.name}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-brand-text-sec text-[11px] italic font-semibold">Multiple Items</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-brand-card/40 pt-4 mt-2">
                            <div>
                              <p className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Fee & Earnings</p>
                              <p className="text-base font-black text-brand-text">
                                ₹{parseFloat(order.total) || 0}{' '}
                                <span className="text-[10px] text-green-600 font-extrabold font-sans">
                                  (+₹{(parseFloat(order.deliveryFee) || 40)} Rider Fee)
                                </span>
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={!!decliningOrderId || submittingAccept}
                                onClick={() => handleDeclineJob(order.orderId)}
                                className="px-3 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                title="Reject / Decline this job request"
                              >
                                {decliningOrderId === order.orderId ? (
                                  <div className="h-3 w-3 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                                ) : (
                                  <XCircle size={13} />
                                )}
                                <span>Reject</span>
                              </button>

                              <button
                                type="button"
                                disabled={!!decliningOrderId || submittingAccept}
                                onClick={() => openAcceptModal(order)}
                                className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-accent/15 transition-all cursor-pointer"
                              >
                                <Bike size={13} />
                                <span>Accept & Share Contact</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hiddenOrderIds.length > 0 && (
                    <div className="mt-6 p-4 bg-brand-bg-sec/50 border border-brand-card/70 rounded-2xl flex items-center justify-between text-xs text-brand-text-sec">
                      <span className="font-semibold">
                        ⚠️ You have declined and hidden <strong>{hiddenOrderIds.length}</strong> available jobs from your feed.
                      </span>
                      <button
                        onClick={handleResetDeclined}
                        className="px-3 py-1.5 bg-white hover:bg-brand-accent/10 hover:text-brand-accent text-brand-text border border-brand-card rounded-lg font-bold transition-all cursor-pointer text-[11px]"
                      >
                        🔄 Reset & Show All
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'active' && (
                /* ACTIVE RUNS LIST */
                <motion.div
                  key="active-feed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-brand-text uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse"></span>
                      My Active Deliveries
                    </h2>
                    <span className="text-xs text-brand-text-sec font-semibold">
                      Your current routes and customer contacts
                    </span>
                  </div>

                  {activeDeliveries.length === 0 ? (
                    <div className="bg-white border border-brand-card rounded-3xl p-12 text-center space-y-4 shadow-sm">
                      <div className="mx-auto h-16 w-16 rounded-full bg-brand-bg-sec border border-brand-card flex items-center justify-center text-brand-accent">
                        <Bike size={28} className="text-brand-accent" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-brand-text">No Active Deliveries</h3>
                        <p className="text-xs text-brand-text-sec font-semibold max-w-sm mx-auto">
                          You haven't accepted any orders yet! Head over to the "Available Jobs" tab to grab open requests and start earning.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('available')}
                        className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        📋 Browse Available Jobs
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeDeliveries.map((order) => (
                        <div
                          key={order.orderId}
                          className="bg-white border-2 border-brand-accent/45 rounded-3xl p-6 shadow-md flex flex-col lg:flex-row gap-6 justify-between relative overflow-hidden"
                        >
                          {/* Banner badge */}
                          <div className={`absolute top-0 right-0 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            order.status === 'Pending' ? 'bg-brand-warning' :
                            order.status === 'Accepted' ? 'bg-blue-600' :
                            order.status === 'Preparing' ? 'bg-purple-600' :
                            order.status === 'Out for Delivery' ? 'bg-brand-accent' :
                            'bg-brand-success'
                          }`}>
                            <Clock size={11} className={order.status !== 'Delivered' ? "animate-spin" : ""} />
                            <span>{order.status === 'Pending' ? 'Placed / In Progress' : order.status}</span>
                          </div>

                          {/* Left Column: Order & Customer Details */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-brand-text">Order #{order.orderId}</span>
                                <span className="text-xs text-brand-text-sec font-bold">({order.items?.length || 0} items)</span>
                              </div>
                              <p className="text-xs font-bold text-brand-accent">
                                {(() => {
                                  const rName = order.restaurantName;
                                  if (rName) return `Pick up from: ${rName}`;
                                  const rId = order.restaurantId;
                                  if (rId) {
                                    const r = restaurants.find(res => res.id === rId);
                                    if (r) return `Pick up from: ${r.name}`;
                                  }
                                  return 'Unknown Restaurant';
                                })()}
                              </p>
                              <p className="text-[10px] text-brand-text-sec font-semibold mt-0.5">
                                Accepted at: {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            {/* CUSTOMER SHARED CONTACT DETAILS (CRITICAL!) */}
                            <div className="bg-brand-accent/5 rounded-2xl border border-brand-accent/20 p-4 space-y-3">
                              <h4 className="text-xs font-black text-brand-accent uppercase tracking-wider flex items-center gap-1.5">
                                <User size={13} />
                                <span>Customer Shared Details</span>
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <p className="text-[10px] text-brand-text-sec font-bold uppercase tracking-wider">Customer Name</p>
                                  <p className="font-bold text-brand-text text-sm">
                                    {order.customerName || 'Arwal Customer'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-[10px] text-brand-text-sec font-bold uppercase tracking-wider">Customer Phone</p>
                                  <p className="font-bold text-brand-text text-sm flex items-center gap-2">
                                    <span>{order.phone || '+91 81021 23746'}</span>
                                    {order.phone && (
                                      <a
                                        href={`tel:${order.phone}`}
                                        className="h-6 w-6 rounded-lg bg-brand-accent text-white flex items-center justify-center hover:bg-brand-accent-hover transition-colors"
                                        title="Call Customer"
                                      >
                                        <PhoneCall size={12} />
                                      </a>
                                    )}
                                  </p>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-1 border-t border-brand-card/30 pt-2.5">
                                  <p className="text-[10px] text-brand-text-sec font-bold uppercase tracking-wider">Delivery Address</p>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="font-bold text-brand-text leading-relaxed">
                                      {order.address}
                                    </p>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(order.address || '');
                                        alert('Address copied to clipboard!');
                                      }}
                                      className="p-1.5 rounded bg-brand-bg-sec border border-brand-card hover:bg-brand-card text-brand-text-sec shrink-0"
                                      title="Copy Address"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-brand-card/30 flex flex-wrap gap-2">
                                {order.phone && (
                                  <>
                                    <a
                                      href={`tel:${order.phone}`}
                                      className="px-3 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                    >
                                      <Phone size={12} />
                                      <span>Call Customer</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/${String(order.phone).replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                    >
                                      <MessageSquare size={12} />
                                      <span>WhatsApp Customer</span>
                                    </a>
                                  </>
                                )}
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${order.restaurant_lat || 25.0143},${order.restaurant_lng || 84.6784}&destination=${order.customer_lat || 25.0143},${order.customer_lng || 84.6784}&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                >
                                  <Navigation size={12} />
                                  <span>Get Directions</span>
                                </a>
                              </div>
                            </div>

                            {/* Order Items List */}
                            <div>
                              <p className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider mb-2">Order Items:</p>
                              <div className="space-y-1.5">
                                {order.items && order.items.map((item: any, idx: number) => {
                                  const itemRestId = item.restaurantId || order.restaurantId || 'rest1';
                                  const itemRest = restaurants.find(r => r.id === itemRestId);
                                  return (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-brand-bg-sec border border-brand-card p-2 rounded-xl gap-1">
                                      <div className="font-bold text-brand-text flex flex-wrap items-center gap-1.5">
                                        <span className="text-brand-accent shrink-0">[{item.qty}x]</span>
                                        <span>{item.name}</span>
                                        {item.variant && <span className="text-brand-text-sec text-[10px] font-semibold">({item.variant})</span>}
                                        {itemRest && (
                                          <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded-lg text-[9px] font-bold tracking-wide shrink-0">
                                            {itemRest.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-brand-text font-black font-sans text-right">₹{(parseFloat(item.price) || 0) * item.qty}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Order Actions & Rider Info */}
                          <div className="w-full lg:w-80 bg-brand-bg-sec border border-brand-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Your Shared Details</h4>
                              
                              <div className="space-y-2 text-xs font-semibold text-brand-text-sec">
                                <div className="flex justify-between">
                                  <span>Vehicle:</span>
                                  <span className="text-brand-text font-bold">{order.vehicleNumber || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rider Phone:</span>
                                  <span className="text-brand-text font-bold">{order.deliveryBoyPhone}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Est. Time:</span>
                                  <span className="text-brand-accent font-black">{order.estimatedDeliveryTime}</span>
                                </div>
                                {order.deliveryNotes && (
                                  <div className="border-t border-brand-card/60 pt-2 text-[11px]">
                                    <span className="font-bold text-brand-text">Rider note shared:</span>
                                    <p className="italic text-brand-text-sec mt-0.5">"{order.deliveryNotes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-brand-card/60">
                              <p className="text-[10px] font-black text-brand-text-sec uppercase tracking-wider text-center mb-2">
                                📍 UPDATE DELIVERY STAGE (LIVE STATUS)
                              </p>
                              
                              <div className="space-y-2">
                                {[
                                  { status: 'Pending', label: '1. Order Placed / In Progress', desc: 'Awaiting kitchen partner confirmation', color: 'border-brand-warning hover:bg-brand-warning/5', activeColor: 'bg-brand-warning text-white border-brand-warning shadow-brand-warning/10' },
                                  { status: 'Accepted', label: '2. Accepted', desc: 'Partner kitchen confirmed order', color: 'border-blue-500 hover:bg-blue-50', activeColor: 'bg-blue-600 text-white border-blue-600 shadow-blue-500/10' },
                                  { status: 'Preparing', label: '3. Preparing', desc: 'Food is being freshly prepared', color: 'border-purple-500 hover:bg-purple-50', activeColor: 'bg-purple-600 text-white border-purple-600 shadow-purple-500/10 font-black' },
                                  { status: 'Out for Delivery', label: '4. Out for Delivery', desc: 'Rider is carrying your order', color: 'border-brand-accent hover:bg-brand-accent/5', activeColor: 'bg-brand-accent text-white border-brand-accent shadow-brand-accent/15' },
                                  { status: 'Delivered', label: '5. Delivered', desc: 'Customer received their food', color: 'border-green-600 hover:bg-green-50', activeColor: 'bg-green-600 text-white border-green-600 shadow-green-600/15' }
                                ].map((stage) => {
                                  const isActive = order.status === stage.status;
                                  return (
                                    <button
                                      key={stage.status}
                                      type="button"
                                      onClick={() => handleUpdateStatus(order.orderId, stage.status as OrderStatus)}
                                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs flex flex-col ${
                                        isActive 
                                          ? `${stage.activeColor} shadow-md border-transparent scale-[1.02]` 
                                          : `border-brand-card bg-white text-brand-text ${stage.color}`
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-bold">{stage.label}</span>
                                        {isActive && <Check size={12} className="shrink-0" />}
                                      </div>
                                      <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-white/90' : 'text-brand-text-sec'}`}>
                                        {stage.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="pt-2 border-t border-brand-card/60 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectConfirmOrderId(order.orderId)}
                                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider shadow-md shadow-red-600/15"
                                >
                                  <XCircle size={13} />
                                  <span>Reject & Release Order</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(order.orderId, 'Cancelled')}
                                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
                                >
                                  <AlertCircle size={12} />
                                  <span>Cancel Customer Order</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'history' && (
                /* DELIVERED HISTORY LIST */
                <motion.div
                  key="history-feed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-brand-text uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                      Completed Delivery History
                    </h2>
                    <span className="text-xs text-brand-text-sec font-semibold">
                      Your historical deliveries and total earnings
                    </span>
                  </div>

                  {deliveryHistory.length === 0 ? (
                    <div className="bg-white border border-brand-card rounded-3xl p-12 text-center space-y-4 shadow-sm">
                      <div className="mx-auto h-16 w-16 rounded-full bg-brand-bg-sec border border-brand-card flex items-center justify-center text-brand-text-sec">
                        <CheckCircle2 size={28} className="text-brand-text-sec/50" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-brand-text">No Delivery History Yet</h3>
                        <p className="text-xs text-brand-text-sec font-semibold max-w-sm mx-auto">
                          Completed or cancelled orders assigned to you will be recorded here. Start accepting requests to build your history!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-brand-card rounded-3xl p-2 md:p-6 shadow-sm overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                        <thead>
                          <tr className="border-b border-brand-card font-bold text-brand-text-sec uppercase tracking-wider bg-brand-bg-sec/50">
                            <th className="py-4 px-4 rounded-l-xl">Order ID</th>
                            <th className="py-4 px-4">Date</th>
                            <th className="py-4 px-4">Destination</th>
                            <th className="py-4 px-4">Customer Details</th>
                            <th className="py-4 px-4">Order Total</th>
                            <th className="py-4 px-4">Delivery Fee</th>
                            <th className="py-4 px-4 rounded-r-xl text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-card/55 font-semibold text-brand-text">
                          {deliveryHistory.map((order) => (
                            <tr key={order.orderId} className="hover:bg-brand-bg-sec/40 transition-colors">
                              <td className="py-4 px-4 font-black">#{order.orderId}</td>
                              <td className="py-4 px-4 text-brand-text-sec font-semibold">
                                {new Date(order.date).toLocaleDateString()}<br />
                                <span className="text-[10px] text-brand-text-sec/80">
                                  {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="py-4 px-4 max-w-xs truncate text-brand-text-sec font-semibold" title={order.address}>
                                {order.address}
                              </td>
                              <td className="py-4 px-4 font-bold text-brand-text">
                                {order.customerName || 'Arwal Customer'}<br />
                                <span className="text-[10px] text-brand-text-sec font-semibold">
                                  {order.phone || '+91 81021 23746'}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-black font-sans">₹{order.total}</td>
                              <td className="py-4 px-4 text-green-600 font-extrabold font-sans">
                                +₹{parseFloat(order.deliveryFee) || 40}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                  order.status === 'Delivered'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ACCEPT ORDER MODAL (SHARING CONTACT DETAILS) */}
      <AnimatePresence>
        {selectedOrderForAccept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAcceptModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl border border-brand-card shadow-2xl max-w-lg w-full p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                    <Bike size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black text-brand-text">Accept Delivery Run</h3>
                    <p className="text-[10px] text-brand-text-sec font-semibold">Order #{selectedOrderForAccept.orderId}</p>
                  </div>
                </div>
                <button
                  onClick={closeAcceptModal}
                  className="p-1.5 rounded-full hover:bg-brand-bg-sec text-brand-text"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Informative alert explaining what this action does */}
              <div className="p-4 mb-6 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 text-xs font-semibold text-brand-text leading-relaxed">
                📢 <span className="font-bold text-brand-accent">Acceptance Policy:</span> To ensure high quality customer service, accepting this order requires you to share your real-time contact details. Customers will see your Name, Phone Number, and Vehicle details in their "My Orders" panel.
              </div>

              <form onSubmit={handleAcceptOrderSubmit} className="space-y-4 text-xs font-semibold">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text mb-1 uppercase tracking-wider">
                      Rider / Delivery Boy Name *
                    </label>
                    <input
                      type="text"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3.5 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none text-brand-text font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-brand-text mb-1 uppercase tracking-wider">
                      Active Contact Phone *
                    </label>
                    <input
                      type="tel"
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3.5 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none text-brand-text font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-brand-text mb-1 uppercase tracking-wider">
                      Vehicle / Registration No.
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      placeholder="e.g. BR-01-AB-1234"
                      className="w-full px-3.5 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none text-brand-text font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-brand-text mb-1 uppercase tracking-wider">
                      Est. Delivery Time
                    </label>
                    <select
                      value={estTime}
                      onChange={(e) => setEstTime(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none text-brand-text font-bold bg-white"
                    >
                      <option value="15-20 mins">⚡ Express (15-20 mins)</option>
                      <option value="25-30 mins">🕒 Normal (25-30 mins)</option>
                      <option value="35-40 mins">🚗 Rush Hour (35-40 mins)</option>
                      <option value="45-50 mins">⛈️ Weather Delay (45-50 mins)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text mb-1 uppercase tracking-wider">
                    Rider Note to Customer
                  </label>
                  <textarea
                    rows={2}
                    value={riderNotesInput}
                    onChange={(e) => setRiderNotesInput(e.target.value)}
                    placeholder="e.g. Freshly packed, on my way!"
                    className="w-full px-3.5 py-3 rounded-xl border border-brand-card text-xs focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none text-brand-text font-semibold resize-none"
                  />
                </div>

                <div className="bg-brand-bg-sec border border-brand-card rounded-2xl p-4 mt-2">
                  <p className="text-[10px] text-brand-text-sec uppercase tracking-wider font-bold">Delivery Address Details</p>
                  <p className="text-xs text-brand-text font-bold mt-1.5 leading-relaxed flex items-start gap-1.5">
                    <MapPin className="text-brand-accent h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{selectedOrderForAccept.address}</span>
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-brand-card/50 mt-4">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="flex-1 py-3 bg-brand-bg-sec hover:bg-brand-card text-brand-text font-bold text-xs rounded-xl border border-brand-card transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAccept}
                    className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-brand-accent/70 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-accent/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submittingAccept ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm & Accept</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STATUS UPDATE CONFIRMATION MODAL */}
      <AnimatePresence>
        {statusConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !updatingStatus && setStatusConfirmModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl border border-brand-card shadow-2xl max-w-sm w-full p-6 text-center z-10"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-4">
                <AlertCircle size={24} className="animate-bounce" />
              </div>

              <h3 className="font-display text-base font-black text-brand-text mb-2">
                Update Order Stage?
              </h3>
              
              <p className="text-xs text-brand-text-sec font-semibold mb-6 leading-relaxed">
                Are you sure you want to change the status of Order <span className="font-mono font-bold text-brand-text">#{statusConfirmModal.orderId}</span> to <span className="px-2 py-0.5 rounded bg-brand-accent/10 text-brand-accent font-bold text-[11px]">{statusConfirmModal.newStatus}</span>? This live tracking update will be visible immediately to the customer.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => setStatusConfirmModal(null)}
                  className="flex-1 py-2.5 bg-brand-bg-sec hover:bg-brand-card disabled:opacity-55 text-brand-text font-bold text-xs rounded-xl border border-brand-card transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={executeStatusUpdate}
                  className="flex-1 py-2.5 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-brand-accent/60 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {updatingStatus ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT & RELEASE CONFIRMATION MODAL */}
      <AnimatePresence>
        {rejectConfirmOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !releasingOrder && setRejectConfirmOrderId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl border border-brand-card shadow-2xl max-w-sm w-full p-6 text-center z-10"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertCircle size={24} className="animate-pulse" />
              </div>

              <h3 className="font-display text-base font-black text-brand-text mb-2 text-red-600">
                Reject & Release Order?
              </h3>
              
              <p className="text-xs text-brand-text-sec font-semibold mb-6 leading-relaxed">
                Are you sure you want to reject Order <span className="font-mono font-bold text-brand-text">#{rejectConfirmOrderId}</span>? This will clear your rider details and release it back to the available jobs list so that the other delivery boy can accept it.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={releasingOrder}
                  onClick={() => setRejectConfirmOrderId(null)}
                  className="flex-1 py-2.5 bg-brand-bg-sec hover:bg-brand-card disabled:opacity-55 text-brand-text font-bold text-xs rounded-xl border border-brand-card transition-colors cursor-pointer"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  disabled={releasingOrder}
                  onClick={() => handleRejectAndRelease(rejectConfirmOrderId)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/60 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {releasingOrder ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Yes, Reject & Release</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
