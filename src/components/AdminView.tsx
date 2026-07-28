import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ShoppingBag, Users, Settings, LogOut, RefreshCw, 
  Search, ArrowUpDown, SlidersHorizontal, UserCheck, Truck, Phone, 
  MapPin, Calendar, DollarSign, AlertCircle, TrendingUp, PieChart, 
  Bell, FileText, Printer, Download, ChevronRight, X, Check, Clock, Sun, Moon, Plus, Trash2,
  CheckCircle2, HelpCircle, Copy, Database, MessageSquare, Mail, Edit, Star, Store, Lock, Navigation, Zap
} from 'lucide-react';
import { Order, OrderItem, Customer, RestaurantSettings, OrderStatus, MenuItem, getDietType, Restaurant } from '../types';
import { 
  adminLogin, getCurrentAdmin, logoutAdmin, getAdminDashboard, 
  getAdminOrders, updateOrderStatus, assignDeliveryBoy, getAdminCustomers,
  getRestaurantSettings, saveRestaurantSettings,
  getMenuItems, addMenuItem, deleteMenuItem, clearAllMenuItems, updateMenuItem, getContactMessages, deleteContactMessage,
  getCustomerReviews, deleteCustomerReview, saveCustomerReview, saveContactMessage,
  getRestaurants, addRestaurant, deleteRestaurant, updateRestaurant,
  getCustomNotifications, saveCustomNotification, deleteCustomNotification, CustomNotification,
  placeOrder
} from '../services/dbSimulator';
import BannerManager from './BannerManager';
import { categories } from '../data/menu';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { formatTimeTo12Hour } from '../utils/storeStatus';
import * as d3 from 'd3';
import { safeDispatchEvent } from '../utils/customEvent';
import { registerBackButtonHandler } from '../utils/backButton';

const convertTo24h = (timeStr: string): string => {
  if (!timeStr) return '11:00';
  
  if (timeStr.includes('T')) {
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        });
        const formatted = formatter.format(date);
        const parts = formatted.split(':');
        const h = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        return `${h}:${m}`;
      }
    } catch (e) {
      console.error('Error parsing ISO time:', e);
    }
  }

  try {
    const cleanStr = timeStr.trim().toUpperCase();
    const match = cleanStr.match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/);
    if (!match) return '11:00';

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];

    if (ampm) {
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (e) {
    return '11:00';
  }
};

const convert24hTo12h = (time24: string): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hDisplay = h.toString().padStart(2, '0');
  const mDisplay = m.toString().padStart(2, '0');
  return `${hDisplay}:${mDisplay} ${ampm}`;
};

interface AdminViewProps {
  setCurrentView: (view: string) => void;
}

export default function AdminView({ setCurrentView }: AdminViewProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);
  
  // Login fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // App UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'customers' | 'settings' | 'menu_mgmt' | 'messages' | 'reviews' | 'restaurants' | 'campaigns' | 'banners'>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'all'>('all');
  const safeOrders = orders || [];
  const safeCustomers = customers || [];
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const firstRender = useRef(true);

  // Hoisted state variables to resolve block-scope/hoisting issues in back button hook
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [showZoneCalculatorModal, setShowZoneCalculatorModal] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string } | null>(null);
  const [confirmingDeleteReviewId, setConfirmingDeleteReviewId] = useState<string | null>(null);
  const [confirmingClearAllReviews, setConfirmingClearAllReviews] = useState(false);
  const [confirmingClearAllMenuItems, setConfirmingClearAllMenuItems] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (settings) {
      saveRestaurantSettings(settings).then(success => {
        if (success) {
          safeDispatchEvent('arwaleats_settings_updated');
        }
      });
    }
  }, [settings?.isClosed]);

  // Handle Back Button inside Admin Panel
  useEffect(() => {
    if (!isAdmin) return;

    return registerBackButtonHandler(() => {
      if (showAddRestaurantModal) {
        setShowAddRestaurantModal(false);
        setEditingRestaurant(null);
        return true;
      }
      if (showZoneCalculatorModal) {
        setShowZoneCalculatorModal(false);
        return true;
      }
      if (showAddMenuModal) {
        setShowAddMenuModal(false);
        setEditingMenuItem(null);
        return true;
      }
      if (deletingRestaurant) {
        setDeletingRestaurant(null);
        return true;
      }
      if (deletingItem) {
        setDeletingItem(null);
        return true;
      }
      if (confirmingDeleteReviewId) {
        setConfirmingDeleteReviewId(null);
        return true;
      }
      if (confirmingClearAllReviews) {
        setConfirmingClearAllReviews(false);
        return true;
      }
      if (confirmingClearAllMenuItems) {
        setConfirmingClearAllMenuItems(false);
        return true;
      }
      if (selectedOrder) {
        setSelectedOrder(null);
        return true;
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        return true;
      }

      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }

      return false;
    });
  }, [
    isAdmin, showAddRestaurantModal, showZoneCalculatorModal, showAddMenuModal,
    deletingRestaurant, deletingItem, confirmingDeleteReviewId,
    confirmingClearAllReviews, confirmingClearAllMenuItems, selectedOrder,
    mobileMenuOpen, activeTab
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // Form states for Add/Edit Restaurant
  const [newRestName, setNewRestName] = useState('');
  const [newRestPhone, setNewRestPhone] = useState('');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestCuisine, setNewRestCuisine] = useState('');
  const [newRestImage, setNewRestImage] = useState('');
  const [newRestRating, setNewRestRating] = useState('4.5');
  const [newRestDeliveryTime, setNewRestDeliveryTime] = useState('25-35 mins');
  const [newRestActive, setNewRestActive] = useState(true);
  const [newRestFeatured, setNewRestFeatured] = useState(false);
  const [newRestLatitude, setNewRestLatitude] = useState('25.0143');
  const [newRestLongitude, setNewRestLongitude] = useState('84.6784');
  const [newRestUsername, setNewRestUsername] = useState('');
  const [newRestLogin, setNewRestLogin] = useState('');
  const [newRestPassword, setNewRestPassword] = useState('');
  const [newRestIsClosed, setNewRestIsClosed] = useState(false);
  const [newRestOpeningTime, setNewRestOpeningTime] = useState('11:00 AM');
  const [newRestClosingTime, setNewRestClosingTime] = useState('11:00 PM');
  const [newRestClosedMessage, setNewRestClosedMessage] = useState('We are currently closed. Please check back during our opening hours!');

  // Delivery Zone Calculator Modal States
  const [selectedZoneRestaurant, setSelectedZoneRestaurant] = useState<Restaurant | null>(null);
  const [zoneRadius, setZoneRadius] = useState<number>(5);
  const [zoneLat, setZoneLat] = useState<number>(25.0143);
  const [zoneLon, setZoneLon] = useState<number>(84.6784);
  const [zoneGridHovered, setZoneGridHovered] = useState<{ lat: number; lon: number } | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [testAddressQuery, setTestAddressQuery] = useState('');
  const [testAddressResult, setTestAddressResult] = useState<{ name: string; distance: number; inRange: boolean } | null>(null);
  const d3SvgRef = useRef<SVGSVGElement | null>(null);

  // GPS/Coordinate helper functions for Delivery Zone Calculator (calibrated to include Baidrabad, Bhadasi, and Koriam border)
  const minLat = 24.985;
  const maxLat = 25.055;
  const minLon = 84.630;
  const maxLon = 84.705;

  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  const gpsToPercent = (lat: number, lon: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return { x, y };
  };

  const percentToGps = (x: number, y: number) => {
    const lon = minLon + (x / 100) * (maxLon - minLon);
    const lat = minLat + (1 - (y / 100)) * (maxLat - minLat);
    return { lat, lon };
  };

  // D3 Drag-and-Drop resizing and relocating hook
  useEffect(() => {
    if (!showZoneCalculatorModal || !d3SvgRef.current) return;

    const svgElement = d3.select(d3SvgRef.current);

    // D3 Drag Behavior for Center Point (Relocating restaurant GPS coordinates)
    const dragCenter = d3.drag<SVGGElement, unknown>()
      .on('drag', (event) => {
        const dragX = Math.max(0, Math.min(100, event.x));
        const dragY = Math.max(0, Math.min(100, event.y));
        const gps = percentToGps(dragX, dragY);
        setZoneLat(parseFloat(gps.lat.toFixed(4)));
        setZoneLon(parseFloat(gps.lon.toFixed(4)));
        setTestAddressResult(null);
      });

    // D3 Drag Behavior for Perimeter Resize Handle
    const dragResize = d3.drag<SVGGElement, unknown>()
      .on('drag', (event) => {
        const dragX = Math.max(0, Math.min(100, event.x));
        const dragY = Math.max(0, Math.min(100, event.y));
        const dragGps = percentToGps(dragX, dragY);
        let dist = getHaversineDistance(zoneLat, zoneLon, dragGps.lat, dragGps.lon);
        dist = Math.max(1, Math.min(15, parseFloat(dist.toFixed(1))));
        setZoneRadius(dist);
        setTestAddressResult(null);
      });

    // Attach behaviors to specified selection classes
    svgElement.selectAll('.center-drag-target').call(dragCenter as any);
    svgElement.selectAll('.resize-drag-handle').call(dragResize as any);

  }, [showZoneCalculatorModal, zoneLat, zoneLon, zoneRadius]);

  // Form states for Add/Edit Menu Item
  const [newItemRestaurantId, setNewItemRestaurantId] = useState('rest1');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Biriyani');
  const [newItemVariant, setNewItemVariant] = useState('Regular, Large');
  const [newItemPrice, setNewItemPrice] = useState('150, 250');
  const [newItemProfitMargin, setNewItemProfitMargin] = useState('30');
  const [newItemImage, setNewItemImage] = useState('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60');
  const [newItemFeatured, setNewItemFeatured] = useState(false);
  const [newItemDietType, setNewItemDietType] = useState<'veg' | 'non-veg'>('veg');
  const [newItemDescription, setNewItemDescription] = useState('');

  // Notification Campaign States
  const [customNotifications, setCustomNotificationsList] = useState<CustomNotification[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignType, setCampaignType] = useState<'Offer' | 'Announcement' | 'Maintenance' | 'Information'>('Offer');
  const [campaignTargetAudience, setCampaignTargetAudience] = useState('All Customers');
  const [campaignStartDate, setCampaignStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [campaignEndDate, setCampaignEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [campaignPriority, setCampaignPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [campaignIsActive, setCampaignIsActive] = useState(true);
  const [campaignStatus, setCampaignStatus] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  // Dynamically build categories list to include any custom ones added to sheet
  const getActiveCategories = () => {
    const activeCats = [...categories];
    menuItems.forEach((item) => {
      if (item.category && !activeCats.some((c) => c.category.toLowerCase() === item.category.toLowerCase())) {
        activeCats.push({
          category: item.category,
          displayName: item.category,
          image: '',
        });
      }
    });
    return activeCats.filter((c) => 
      c.category.toLowerCase() !== 'arwal eat special' && 
      c.category.toLowerCase() !== 'arwal eats special'
    );
  };

  const activeCategories = getActiveCategories();

  // Deleting and confirmation states for reviews

  // Filtering/Sorting states
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [orderSort, setOrderSort] = useState<string>('latest');
  const [customerSearch, setCustomerSearch] = useState('');

  // Selected details modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [assigningRiderOrderId, setAssigningRiderOrderId] = useState<string | null>(null);

  // Delivery Boy Assignment State
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderVehicle, setRiderVehicle] = useState('');
  const [riderTime, setRiderTime] = useState('25 mins');
  const [riderNotes, setRiderNotes] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: string; time: Date }>>([]);
  const previousOrdersCount = useRef<number>(0);
  const previousMessagesCount = useRef<number>(0);
  const previousReviewsCount = useRef<number>(0);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        setPushPermission(window.Notification.permission);
      } catch (err) {
        console.warn('Failed to read window.Notification.permission safely:', err);
        setPushPermission('unsupported');
      }
    } else {
      setPushPermission('unsupported');
    }
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Auto-refresh timer
  useEffect(() => {
    // Check sessionStorage first
    let admin = null;
    const sessionAdminStr = sessionStorage.getItem('arwaleats_current_admin');
    if (sessionAdminStr && sessionAdminStr !== 'undefined') {
      try {
        admin = JSON.parse(sessionAdminStr);
      } catch (e) {
        console.error(e);
      }
    }
    
    // Check localStorage if remember is true
    const remember = localStorage.getItem('arwaleats_admin_remember') === 'true';
    if (!admin && remember) {
      const localAdminStr = localStorage.getItem('arwaleats_current_admin');
      if (localAdminStr && localAdminStr !== 'undefined') {
        try {
          admin = JSON.parse(localAdminStr);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (admin) {
      setAdminUser(admin);
      setIsAdmin(true);
      if (remember) {
        setRememberMe(true);
      }
    } else {
      setIsAdmin(false);
      setAdminUser(null);
      // Check if we have remembered username/password to prefill
      const savedUser = localStorage.getItem('arwaleats_admin_remember_username') || '';
      const savedPass = localStorage.getItem('arwaleats_admin_remember_password') || '';
      if (savedUser) {
        setLoginUsername(savedUser);
        setLoginPassword(savedPass);
        setRememberMe(true);
      }
    }
  }, []);

  // Fetch admin data periodically
  useEffect(() => {
    if (!isAdmin) return;
    
    let isFirstFetch = true;

    async function fetchData() {
      try {
        const dash = await getAdminDashboard();
        const ords = (await getAdminOrders()) || [];
        const custs = (await getAdminCustomers()) || [];
        const sets = await getRestaurantSettings();
        const items = await getMenuItems();
        const rests = await getRestaurants();
        const msgs = await getContactMessages();
        const revs = await getCustomerReviews();

        // Detect new order notifications and show them exactly once
        if (ords && ords.length > 0) {
          const notifiedStr = localStorage.getItem('arwaleats_notified_orders') || '[]';
          let notifiedIds: string[] = [];
          try {
            notifiedIds = JSON.parse(notifiedStr);
          } catch (e) {
            notifiedIds = [];
          }

          const newlyReceivedOrders = ords.filter((o: any) => o && o.orderId && !notifiedIds.includes(String(o.orderId)));

          if (newlyReceivedOrders.length > 0) {
            // Only trigger notifications if this is NOT the very first fetch of the session (to avoid spamming historic orders)
            if (previousOrdersCount.current > 0) {
              newlyReceivedOrders.forEach((o: any) => {
                triggerNotification(`🎉 New Order Received! ID: ${o.orderId} (₹${o.total})`, 'new');
              });
            }

            // Update notified IDs list and persist in localStorage to survive updates/refreshes
            const updatedNotifiedIds = [...notifiedIds, ...newlyReceivedOrders.map((o: any) => String(o.orderId))];
            if (updatedNotifiedIds.length > 200) {
              updatedNotifiedIds.splice(0, updatedNotifiedIds.length - 200);
            }
            localStorage.setItem('arwaleats_notified_orders', JSON.stringify(updatedNotifiedIds));
          }

          // Detect order status updates
          const statusMapStr = localStorage.getItem('arwaleats_order_status_map') || '{}';
          let lastStatusMap: Record<string, string> = {};
          try {
            lastStatusMap = JSON.parse(statusMapStr);
          } catch (e) {
            lastStatusMap = {};
          }

          ords.forEach((o: any) => {
            if (o && o.orderId) {
              const currentStatus = o.status;
              const lastStatus = lastStatusMap[String(o.orderId)];
              if (lastStatus && lastStatus !== currentStatus) {
                // Status changed!
                triggerNotification(`📦 Order #${o.orderId} status updated to: ${currentStatus.toUpperCase()}!`, 'status_update');
              }
              lastStatusMap[String(o.orderId)] = currentStatus;
            }
          });

          localStorage.setItem('arwaleats_order_status_map', JSON.stringify(lastStatusMap));
        }
        previousOrdersCount.current = ords.length;

        // Detect new contact messages (queries) and show notifications exactly once
        if (msgs && msgs.length > 0) {
          const notifiedMsgsStr = localStorage.getItem('arwaleats_notified_messages') || '[]';
          let notifiedMsgIds: string[] = [];
          try {
            notifiedMsgIds = JSON.parse(notifiedMsgsStr);
          } catch (e) {
            notifiedMsgIds = [];
          }

          const newlyReceivedMsgs = msgs.filter((m: any) => m && m.id && !notifiedMsgIds.includes(String(m.id)));

          if (newlyReceivedMsgs.length > 0) {
            if (previousMessagesCount.current > 0) {
              newlyReceivedMsgs.forEach((m: any) => {
                triggerNotification(`💬 New Customer Query from ${m.name || 'User'}: "${m.message ? (m.message.length > 45 ? m.message.substring(0, 45) + '...' : m.message) : 'No message content'}"`, 'query');
              });
            }

            const updatedNotifiedMsgIds = [...notifiedMsgIds, ...newlyReceivedMsgs.map((m: any) => String(m.id))];
            if (updatedNotifiedMsgIds.length > 200) {
              updatedNotifiedMsgIds.splice(0, updatedNotifiedMsgIds.length - 200);
            }
            localStorage.setItem('arwaleats_notified_messages', JSON.stringify(updatedNotifiedMsgIds));
          }
        }
        previousMessagesCount.current = msgs.length;

        // Detect new reviews
        if (revs && revs.length > 0) {
          const notifiedRevsStr = localStorage.getItem('arwaleats_notified_reviews') || '[]';
          let notifiedRevIds: string[] = [];
          try {
            notifiedRevIds = JSON.parse(notifiedRevsStr);
          } catch (e) {
            notifiedRevIds = [];
          }

          const newlyReceivedRevs = revs.filter((r: any) => r && r.id && !notifiedRevIds.includes(String(r.id)));

          if (newlyReceivedRevs.length > 0) {
            if (previousReviewsCount.current > 0) {
              newlyReceivedRevs.forEach((r: any) => {
                triggerNotification(`⭐ New Review! ${r.name || 'Customer'} rated ${r.rating} Stars: "${r.feedback ? (r.feedback.length > 40 ? r.feedback.substring(0, 40) + '...' : r.feedback) : 'No feedback'}"`, 'review');
              });
            }

            const updatedNotifiedRevIds = [...notifiedRevIds, ...newlyReceivedRevs.map((r: any) => String(r.id))];
            if (updatedNotifiedRevIds.length > 200) {
              updatedNotifiedRevIds.splice(0, updatedNotifiedRevIds.length - 200);
            }
            localStorage.setItem('arwaleats_notified_reviews', JSON.stringify(updatedNotifiedRevIds));
          }
        }
        previousReviewsCount.current = revs.length;

        setDashboardData(dash);
        setOrders(ords);
        setCustomers(custs);
        
        // Prevent background polling from wiping out unsaved setting changes during editing
        if (isFirstFetch || activeTab !== 'settings') {
          setSettings(sets);
        }
        isFirstFetch = false;

        setMenuItems(items);
        setRestaurants(rests);
        setContactMessages(msgs);
        setReviews(revs);
        setCustomNotificationsList(await getCustomNotifications());
        setLastRefreshed(new Date().toLocaleTimeString('en-IN'));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const handleRealtimeUpdate = () => {
      fetchData();
    };

    window.addEventListener('arwaleats_orders_updated', handleRealtimeUpdate);
    window.addEventListener('arwaleats_menu_updated', handleRealtimeUpdate);
    window.addEventListener('arwaleats_restaurants_updated', handleRealtimeUpdate);
    window.addEventListener('arwaleats_settings_updated', handleRealtimeUpdate);
    window.addEventListener('arwaleats_customers_updated', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('arwaleats_orders_updated', handleRealtimeUpdate);
      window.removeEventListener('arwaleats_menu_updated', handleRealtimeUpdate);
      window.removeEventListener('arwaleats_restaurants_updated', handleRealtimeUpdate);
      window.removeEventListener('arwaleats_settings_updated', handleRealtimeUpdate);
      window.removeEventListener('arwaleats_customers_updated', handleRealtimeUpdate);
    };
  }, [isAdmin]);

  // Alert Synthesizer
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.log("Audio contextual chime blocked or un-supported");
    }
  };

  const triggerNotification = (text: string, type: string) => {
    playNotificationSound();
    const newNotif = { id: Math.random().toString(), text, type, time: new Date() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Trigger Native HTML5 notification if permission is granted
    const isInIframe = typeof window !== 'undefined' && (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();
    
    if (typeof window !== 'undefined' && !isInIframe && 'Notification' in window) {
      try {
        const NotificationClass = window.Notification;
        if (NotificationClass) {
          let currentPermission = 'default';
          try {
            currentPermission = NotificationClass.permission;
          } catch (permErr) {
            console.warn('Failed to read notification permission safely:', permErr);
          }
          
          if (currentPermission === 'granted') {
            const title = type === 'new' ? '🚨 New Order Received!' : 'ArwalEats Admin';
            const options = {
              body: text.replace(/^🎉 /, '').replace(/^🚨 /, ''),
              icon: '/favicon.ico',
              tag: type === 'new' ? 'new-order' : 'admin-update',
              requireInteraction: type === 'new'
            };
            if (typeof NotificationClass === 'function') {
              try {
                const nativeNotification = new NotificationClass(title, options);
                nativeNotification.onclick = () => {
                  window.focus();
                  nativeNotification.close();
                };
              } catch (instErr) {
                console.warn('Native notification constructor failed (expected inside sandboxed iframe):', instErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }

    // Auto-remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 6000);
  };

  const handleEnablePush = async () => {
    if (typeof window === 'undefined') return;
    
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();
    
    if (isInIframe) {
      triggerNotification('ℹ️ Iframe sandbox blocks permission requests. Click "Open in New Tab" in the top right to enable native alerts, or use our high-fidelity in-app push simulator below!', 'info');
      return;
    }
    
    if ('Notification' in window) {
      try {
        const NotificationClass = window.Notification;
        if (NotificationClass && typeof NotificationClass.requestPermission === 'function') {
          const perm = await NotificationClass.requestPermission();
          setPushPermission(perm);
          if (perm === 'granted') {
            triggerNotification('🔔 Push Notifications enabled successfully!', 'success');
            try {
              if (typeof NotificationClass === 'function') {
                try {
                  new NotificationClass('ArwalEats Admin Portal', {
                    body: '🎉 Notifications are active! You will be alerted instantly when new orders arrive.',
                    icon: '/favicon.ico',
                  });
                } catch (instErr) {
                  console.warn('Failed to instantiate native Notification during test:', instErr);
                }
              }
            } catch (e) {
              console.warn('Native test notification blocked:', e);
            }
          }
        } else {
          triggerNotification('❌ Native notifications are not supported or are blocked in this iframe context.', 'error');
        }
      } catch (err) {
        console.warn('Notification permission request failed inside iframe sandbox:', err);
        triggerNotification('ℹ️ Iframe sandbox blocks permission requests. Click "Open in New Tab" in the top right to enable native alerts, or use our high-fidelity in-app push simulator below!', 'info');
      }
    } else {
      triggerNotification('❌ Native notifications are not supported in this browser.', 'error');
    }
  };

  const simulateNewOrder = async () => {
    // Choose a random dish
    const dishes = [
      { id: '1', name: 'Special Chicken Biryani', price: 220, profit: 75, category: 'Biriyani' },
      { id: '2', name: 'Butter Paneer Masala', price: 180, profit: 55, category: 'Veg Specials' },
      { id: '3', name: 'Garlic Naan Combo', price: 120, profit: 40, category: 'Roti' },
      { id: '4', name: 'Mutton Handi', price: 340, profit: 110, category: 'Mutton' }
    ];
    const chosen = dishes[Math.floor(Math.random() * dishes.length)];

    await placeOrder(
      'CUST-101',
      chosen.price,
      0,
      0,
      chosen.price,
      'Cash on Delivery',
      '',
      [{ itemId: chosen.id, name: chosen.name, variant: 'Regular', price: chosen.price, qty: 1 }],
      undefined,
      {
        grand_total: chosen.price,
        estimated_time: '25-35 mins'
      }
    );

    safeDispatchEvent('arwaleats_order_placed', {});
    triggerNotification(`⚙️ Simulating live Order Checkout: ${chosen.name} placed! Polling loop will alert in seconds...`, 'info');
  };

  const simulateNewQuery = () => {
    const names = ['Anshul Kumar', 'Kirti Sharma', 'Devendra Yadav', 'Preeti Sinha'];
    const queries = [
      'Do you deliver near the Arwal Court area?',
      'Is my order AE-9283 out for delivery yet?',
      'I want to place an order of 30 Biryanis for an event tomorrow.',
      'Are you open until 11:30 PM on weekends?'
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    
    saveContactMessage({
      name: randomName,
      email: randomName.toLowerCase().replace(' ', '') + '@arwaleats.com',
      subject: 'Operational Question',
      message: randomQuery
    });
    triggerNotification(`⚙️ Simulating Customer Contact Inquiry by ${randomName}! Polling loop will alert in seconds...`, 'info');
  };

  const simulateStatusUpdate = async () => {
    const orders = await getAdminOrders();
    if (orders.length === 0) {
      triggerNotification('⚠️ Please place a simulated order first to test status updates!', 'warning');
      return;
    }
    // Update the most recent order
    const latestOrder = orders[0];
    const statuses: OrderStatus[] = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
    const currentIndex = statuses.indexOf(latestOrder.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    await updateOrderStatus(latestOrder.orderId, nextStatus);
    safeDispatchEvent('arwaleats_order_placed', {});
    triggerNotification(`⚙️ Simulating Status Transition for #${latestOrder.orderId} to "${nextStatus}"...`, 'info');
  };

  const simulateNewReview = () => {
    const names = ['Aarav Mehta', 'Shruti Iyer', 'Navin Pathak', 'Divya Gupta'];
    const feedbacks = [
      'Absolutely delicious! Best food delivery portal in Arwal!',
      'Fast delivery and hot chicken legs, highly impressed!',
      'Naan was slightly cold but chicken gravy was pure bliss.',
      'Super high value for money. Keep it up ArwalEats!'
    ];
    const ratings = [5, 4, 5, 5];
    const index = Math.floor(Math.random() * names.length);
    
    saveCustomerReview({
      customerId: 'CUST-101',
      name: names[index],
      address: 'Main Bazar, Arwal',
      rating: ratings[index],
      feedback: feedbacks[index]
    });
    triggerNotification(`⚙️ Simulating Customer 5-Star Review from ${names[index]}! Polling loop will alert in seconds...`, 'info');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await adminLogin(loginUsername, loginPassword);
      if (res.success && res.admin) {
        setAdminUser(res.admin);
        setIsAdmin(true);
        if (rememberMe) {
          localStorage.setItem('arwaleats_current_admin', JSON.stringify(res.admin));
          localStorage.setItem('arwaleats_admin_remember', 'true');
          localStorage.setItem('arwaleats_admin_remember_username', loginUsername);
          localStorage.setItem('arwaleats_admin_remember_password', loginPassword);
        } else {
          sessionStorage.setItem('arwaleats_current_admin', JSON.stringify(res.admin));
          localStorage.removeItem('arwaleats_current_admin');
          localStorage.setItem('arwaleats_admin_remember', 'false');
          localStorage.removeItem('arwaleats_admin_remember_username');
          localStorage.removeItem('arwaleats_admin_remember_password');
        }
        triggerNotification('🔑 Signed into Administrator Portal!', 'info');
      } else {
        setLoginError(res.message);
      }
    } catch (err) {
      setLoginError('Incorrect credentials or database server failure.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    sessionStorage.removeItem('arwaleats_current_admin');
    localStorage.removeItem('arwaleats_admin_remember');
    localStorage.removeItem('arwaleats_admin_remember_username');
    localStorage.removeItem('arwaleats_admin_remember_password');
    setAdminUser(null);
    setIsAdmin(false);
    triggerNotification('🔒 Logged out of admin session.', 'info');
  };

  const triggerManualRefresh = async () => {
    setLoading(true);
    try {
      const dash = await getAdminDashboard();
      const ords = await getAdminOrders();
      const custs = await getAdminCustomers();
      setDashboardData(dash);
      setOrders(ords);
      setCustomers(custs);
      setLastRefreshed(new Date().toLocaleTimeString('en-IN'));
      triggerNotification('🔄 Statistics refreshed in real-time!', 'info');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const success = await updateOrderStatus(orderId, status);
    if (success) {
      triggerNotification(`📦 Order ${orderId} marked as ${status}!`, 'status');
      
      // Update local states immediately
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
      
      // Refresh dashboard counters
      const updatedDash = await getAdminDashboard();
      setDashboardData(updatedDash);
    }
  };

  const handleAssignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRiderOrderId) return;

    const riderDetails = {
      deliveryBoyName: riderName,
      deliveryBoyPhone: riderPhone,
      vehicleNumber: riderVehicle,
      estimatedDeliveryTime: riderTime,
      deliveryNotes: riderNotes
    };

    const success = await assignDeliveryBoy(assigningRiderOrderId, riderDetails);
    if (success) {
      triggerNotification(`🏍️ Assigned Delivery Boy for ${assigningRiderOrderId}!`, 'rider');
      
      // Update local orders
      setOrders(prev => prev.map(o => o.orderId === assigningRiderOrderId ? { 
        ...o, 
        status: 'Accepted',
        ...riderDetails
      } : o));

      if (selectedOrder && selectedOrder.orderId === assigningRiderOrderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          status: 'Accepted',
          ...riderDetails
        } : null);
      }

      setAssigningRiderOrderId(null);
      // Reset rider inputs
      setRiderName('');
      setRiderPhone('');
      setRiderVehicle('');
      setRiderNotes('');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const success = await saveRestaurantSettings(settings);
    if (success) {
      triggerNotification('⚙️ Settings synchronized with database!', 'success');
      safeDispatchEvent('arwaleats_settings_updated');
    } else {
      triggerNotification('❌ Failed to synchronize settings.', 'error');
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemVariant.trim() || !newItemPrice.trim()) {
      triggerNotification('❌ Please fill in all required fields!', 'error');
      return;
    }
    try {
      // Parse, clean, and pad/align the variants, prices, and profit margins
      const rawVariants = newItemVariant.split(',').map(v => v.trim()).filter(Boolean);
      const rawPrices = newItemPrice.split(',').map(p => p.trim()).filter(Boolean);
      const rawMargins = String(newItemProfitMargin || '').split(',').map(m => m.trim()).filter(Boolean);

      if (rawVariants.length === 0) {
        triggerNotification('❌ Please specify at least one variant!', 'error');
        return;
      }

      // Automatically pad prices if fewer than variants
      while (rawPrices.length < rawVariants.length) {
        rawPrices.push(rawPrices[rawPrices.length - 1] || '0');
      }
      // Automatically pad margins if fewer than variants
      while (rawMargins.length < rawVariants.length) {
        rawMargins.push(rawMargins[rawMargins.length - 1] || '30');
      }

      const finalVariants = rawVariants;
      const finalPrices = rawPrices.slice(0, rawVariants.length);
      const finalMargins = rawMargins.slice(0, rawVariants.length);

      const cleanVariantStr = finalVariants.join(', ');
      const cleanPriceStr = finalPrices.join(', ');
      const cleanMarginStr = finalMargins.join(', ');

      if (editingMenuItem) {
        const updatedItem = {
          ...editingMenuItem,
          name: newItemName.trim(),
          category: newItemCategory,
          variant: cleanVariantStr,
          price: cleanPriceStr,
          profitMargin: cleanMarginStr,
          image: newItemImage.trim() || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
          featured: newItemFeatured,
          dietType: newItemDietType,
          description: newItemDescription.trim(),
          restaurantId: newItemRestaurantId
        };
        const success = await updateMenuItem(updatedItem);
        if (success) {
          triggerNotification(`🍔 Updated menu item: ${updatedItem.name}!`, 'menu');
          const items = await getMenuItems();
          setMenuItems(items);
          safeDispatchEvent('arwaleats_menu_updated');
          
          // Reset form & close modal
          setNewItemName('');
          setNewItemVariant('Regular, Large');
          setNewItemPrice('150, 250');
          setNewItemProfitMargin('30');
          setNewItemImage('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60');
          setNewItemFeatured(false);
          setNewItemDietType('veg');
          setNewItemDescription('');
          setNewItemRestaurantId('rest1');
          setEditingMenuItem(null);
          setShowAddMenuModal(false);
        } else {
          triggerNotification('❌ Failed to update menu item.', 'error');
        }
      } else {
        const newItem = {
          name: newItemName.trim(),
          category: newItemCategory,
          variant: cleanVariantStr,
          price: cleanPriceStr,
          profitMargin: cleanMarginStr,
          image: newItemImage.trim() || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
          available: true,
          featured: newItemFeatured,
          dietType: newItemDietType,
          description: newItemDescription.trim(),
          restaurantId: newItemRestaurantId
        };
        const savedItem = await addMenuItem(newItem);
        triggerNotification(`🍔 Added menu item: ${savedItem.name}!`, 'menu');
        
        // Refresh list
        const items = await getMenuItems();
        setMenuItems(items);
        safeDispatchEvent('arwaleats_menu_updated');
        
        // Reset form & close modal
        setNewItemName('');
        setNewItemVariant('Regular, Large');
        setNewItemPrice('150, 250');
        setNewItemProfitMargin('30');
        setNewItemImage('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60');
        setNewItemFeatured(false);
        setNewItemDietType('veg');
        setNewItemDescription('');
        setNewItemRestaurantId('rest1');
        setShowAddMenuModal(false);
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Failed to save menu item.', 'error');
    }
  };

  const handleDeleteMenuItem = (id: string, name: string) => {
    setDeletingItem({ id, name });
  };

  const confirmDeleteMenuItem = async () => {
    if (!deletingItem) return;
    try {
      const success = await deleteMenuItem(deletingItem.id);
      if (success) {
        triggerNotification(`🗑️ Deleted "${deletingItem.name}" from menu!`, 'menu');
        const items = await getMenuItems();
        setMenuItems(items);
        safeDispatchEvent('arwaleats_menu_updated');
      } else {
        triggerNotification('❌ Item could not be found.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Error deleting item.', 'error');
    } finally {
      setDeletingItem(null);
    }
  };

  const confirmClearAllMenuItems = async () => {
    try {
      const success = await clearAllMenuItems();
      if (success) {
        triggerNotification('🗑️ Deleted all menu items!', 'menu');
        setMenuItems([]);
        safeDispatchEvent('arwaleats_menu_updated');
      } else {
        triggerNotification('❌ Failed to clear menu items.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Error clearing menu items.', 'error');
    } finally {
      setConfirmingClearAllMenuItems(false);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRestaurant) {
        const updated = {
          ...editingRestaurant,
          name: newRestName.trim(),
          phone: newRestPhone.trim(),
          address: newRestAddress.trim(),
          cuisine: newRestCuisine.trim(),
          image: newRestImage.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
          rating: parseFloat(newRestRating) || 4.5,
          deliveryTime: newRestDeliveryTime.trim() || '25-35 mins',
          active: newRestActive,
          featured: newRestFeatured,
          deliveryRadius: editingRestaurant.deliveryRadius !== undefined ? editingRestaurant.deliveryRadius : 5,
          latitude: parseFloat(newRestLatitude) !== undefined && !isNaN(parseFloat(newRestLatitude)) ? parseFloat(newRestLatitude) : 25.0143,
          longitude: parseFloat(newRestLongitude) !== undefined && !isNaN(parseFloat(newRestLongitude)) ? parseFloat(newRestLongitude) : 84.6784,
          username: newRestUsername.trim(),
          login: newRestLogin.trim() || newRestUsername.trim(),
          password: newRestPassword.trim(),
          isClosed: newRestIsClosed,
          openingTime: newRestOpeningTime.trim(),
          closingTime: newRestClosingTime.trim(),
          closedMessage: newRestClosedMessage.trim(),
        };
        const success = await updateRestaurant(updated);
        if (success) {
          triggerNotification(`🏪 Updated restaurant: ${updated.name}!`, 'restaurant');
          const rests = await getRestaurants();
          setRestaurants(rests);
          setShowAddRestaurantModal(false);
          setEditingRestaurant(null);
          safeDispatchEvent('arwaleats_restaurants_updated');
        } else {
          triggerNotification('❌ Failed to update restaurant.', 'error');
        }
      } else {
        const created = {
          name: newRestName.trim(),
          phone: newRestPhone.trim(),
          address: newRestAddress.trim(),
          cuisine: newRestCuisine.trim(),
          image: newRestImage.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
          rating: parseFloat(newRestRating) || 4.5,
          deliveryTime: newRestDeliveryTime.trim() || '25-35 mins',
          active: newRestActive,
          featured: newRestFeatured,
          deliveryRadius: 5,
          latitude: parseFloat(newRestLatitude) !== undefined && !isNaN(parseFloat(newRestLatitude)) ? parseFloat(newRestLatitude) : 25.0143,
          longitude: parseFloat(newRestLongitude) !== undefined && !isNaN(parseFloat(newRestLongitude)) ? parseFloat(newRestLongitude) : 84.6784,
          username: newRestUsername.trim(),
          login: newRestLogin.trim() || newRestUsername.trim(),
          password: newRestPassword.trim(),
          isClosed: newRestIsClosed,
          openingTime: newRestOpeningTime.trim(),
          closingTime: newRestClosingTime.trim(),
          closedMessage: newRestClosedMessage.trim(),
        };
        const saved = await addRestaurant(created);
        triggerNotification(`🏪 Created restaurant: ${saved.name}!`, 'restaurant');
        const rests = await getRestaurants();
        setRestaurants(rests);
        setShowAddRestaurantModal(false);
        safeDispatchEvent('arwaleats_restaurants_updated');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Failed to save restaurant.', 'error');
    }
  };

  const handleDeleteRestaurant = (id: string, name: string) => {
    setDeletingRestaurant({ id, name });
  };

  const handleToggleRestaurantActive = async (restaurant: Restaurant) => {
    try {
      const updated = {
        ...restaurant,
        active: !restaurant.active
      };
      const success = await updateRestaurant(updated);
      if (success) {
        triggerNotification(`🏪 Restaurant "${restaurant.name}" is now ${!restaurant.active ? 'Active' : 'Inactive'}!`, 'restaurant');
        const rests = await getRestaurants();
        setRestaurants(rests);
        safeDispatchEvent('arwaleats_restaurants_updated');
      } else {
        triggerNotification('❌ Failed to toggle restaurant status.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Error updating restaurant status.', 'error');
    }
  };

  const handleToggleRestaurantFeatured = async (restaurant: Restaurant) => {
    try {
      const updated = {
        ...restaurant,
        featured: !restaurant.featured
      };
      const success = await updateRestaurant(updated);
      if (success) {
        triggerNotification(`⭐ Restaurant "${restaurant.name}" is now ${!restaurant.featured ? 'Featured' : 'Standard'}!`, 'restaurant');
        const rests = await getRestaurants();
        setRestaurants(rests);
        safeDispatchEvent('arwaleats_restaurants_updated');
      } else {
        triggerNotification('❌ Failed to toggle restaurant featured status.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Error updating restaurant featured status.', 'error');
    }
  };

  const handleOpenAllRestaurants = async () => {
    try {
      for (const restaurant of restaurants) {
        const updated = { 
          ...restaurant, 
          isClosed: false,
          openingTime: '12:00 AM',
          closingTime: '11:59 PM'
        };
        await updateRestaurant(updated);
      }
      if (settings) {
        const updatedSettings = { 
          ...settings, 
          isClosed: false,
          openingTime: '12:00 AM',
          closingTime: '11:59 PM'
        };
        await saveRestaurantSettings(updatedSettings);
        setSettings(updatedSettings);
      }
      const rests = await getRestaurants();
      setRestaurants(rests);
      triggerNotification('🏪 All restaurants are now open 24/7!', 'restaurant');
      safeDispatchEvent('arwaleats_restaurants_updated');
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Error opening all restaurants.', 'error');
    }
  };

  const confirmDeleteRestaurant = async () => {
    if (!deletingRestaurant) return;
    try {
      const success = await deleteRestaurant(deletingRestaurant.id);
      if (success) {
        triggerNotification(`🗑️ Deleted restaurant: ${deletingRestaurant.name}!`, 'restaurant');
        const rests = await getRestaurants();
        setRestaurants(rests);
        setDeletingRestaurant(null);
        safeDispatchEvent('arwaleats_restaurants_updated');
      } else {
        triggerNotification('❌ Failed to delete restaurant.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Failed to delete restaurant.', 'error');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updatedItem = { ...item, available: !item.available };
      const success = await updateMenuItem(updatedItem);
      if (success) {
        triggerNotification(`Availability of "${item.name}" updated!`, 'menu');
        setMenuItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
        safeDispatchEvent('arwaleats_menu_updated');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeatured = async (item: MenuItem) => {
    try {
      const updatedItem = { ...item, featured: !item.featured };
      const success = await updateMenuItem(updatedItem);
      if (success) {
        triggerNotification(`"${item.name}" ${updatedItem.featured ? 'added to' : 'removed from'} ArwalEats Specials!`, 'menu');
        setMenuItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
        safeDispatchEvent('arwaleats_menu_updated');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportOrdersCSV = () => {
    try {
      const getRestaurantNameForOrder = (order: any) => {
        const restName = order.restaurantName;
        if (restName) return restName;
        const restId = order.restaurantId;
        if (restId) {
          const r = restaurants.find(res => res.id === restId);
          if (r) return r.name;
        }
        return 'Unknown';
      };

      const headers = ['Order ID', 'Date', 'Customer ID', 'Restaurant', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Payment', 'Status', 'Coupon'];
      const rows = orders.map(o => [
        o.orderId,
        o.date,
        o.customerId,
        getRestaurantNameForOrder(o),
        o.subtotal,
        o.discount,
        o.deliveryFee,
        o.total,
        o.paymentMethod,
        o.status,
        o.coupon || 'None'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ArwalEats_Orders_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification('📥 Orders database exported to CSV!', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const printInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = order.items.map((i: any) => `
      <tr>
        <td style="padding: 8px 0; font-size: 13px;">${i.name} (${i.variant})</td>
        <td style="padding: 8px 0; text-align: center; font-size: 13px;">${i.qty}</td>
        <td style="padding: 8px 0; text-align: right; font-size: 13px;">₹${i.price}</td>
        <td style="padding: 8px 0; text-align: right; font-size: 13px;">₹${i.price * i.qty}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.orderId}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1D1D1D; padding: 40px; margin: 0; }
            .invoice-box { max-width: 600px; margin: auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: 900; color: #F62440; margin: 0; }
            .tagline { font-size: 11px; color: #666; margin: 5px 0 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; border-bottom: 1px dashed #DDD; padding-bottom: 15px; }
            .meta-section h4 { margin: 0 0 5px 0; color: #666; font-size: 11px; text-transform: uppercase; }
            .meta-section p { margin: 0; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 2px solid #1D1D1D; text-align: left; padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #666; }
            .totals { float: right; width: 220px; font-size: 13px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { border-top: 2px solid #1D1D1D; padding-top: 10px; font-weight: 900; font-size: 16px; color: #F62440; }
            .footer { text-align: center; margin-top: 80px; font-size: 11px; color: #888; border-top: 1px solid #EEE; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <p class="brand">ArwalEats</p>
              <p class="tagline">Fresh Food &bull; Fast Delivery &bull; Local Taste</p>
            </div>
            
            <div class="meta-section">
              <div>
                <h4>Customer Details</h4>
                <p>${order.customerName}</p>
                <p>${order.phone}</p>
              </div>
              <div style="text-align: right;">
                <h4>Invoice Info</h4>
                <p>ID: ${order.orderId}</p>
                <p>Date: ${new Date(order.date).toLocaleDateString('en-IN')}</p>
                <p>Payment: ${order.paymentMethod}</p>
              </div>
            </div>

            <div style="margin-bottom: 25px; font-size: 13px;">
              <h4>Delivery Address</h4>
              <p style="margin: 0; font-weight: 500;">${order.address}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Details</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 80px;">Rate</th>
                  <th style="text-align: right; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span>₹${order.subtotal}</span>
              </div>
              ${order.discount > 0 ? `
              <div class="totals-row" style="color: #00C853; font-weight: 600;">
                <span>Discount:</span>
                <span>-₹${order.discount}</span>
              </div>` : ''}
              <div class="totals-row">
                <span>Delivery Charge:</span>
                <span>₹${order.deliveryFee}</span>
              </div>
              <div class="totals-row grand-total">
                <span>Grand Total:</span>
                <span>₹${order.total}</span>
              </div>
            </div>

            <div style="clear: both;"></div>

            <div class="footer">
              <p>Thank you for ordering from ArwalEats!</p>
              <p>For support, contact WhatsApp: +91 98765 43210</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    triggerNotification(`🖨️ Printing invoice for ${order.orderId}`, 'info');
  };

  // Filter & sort logic for orders with strict null safety
  const filteredOrders = safeOrders.filter(o => {
    if (!o) return false;
    const matchesSearch = (o.orderId || '').toLowerCase().includes(orderSearch.toLowerCase()) || 
                          (o.customerName || '').toLowerCase().includes(orderSearch.toLowerCase()) || 
                          (o.phone || '').includes(orderSearch);
    
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const dateA = a && a.date ? new Date(a.date).getTime() : 0;
    const dateB = b && b.date ? new Date(b.date).getTime() : 0;
    if (orderSort === 'latest') return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    if (orderSort === 'oldest') return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    if (orderSort === 'highest') return (b?.total || 0) - (a?.total || 0);
    if (orderSort === 'lowest') return (a?.total || 0) - (b?.total || 0);
    return 0;
  });

  const filteredCustomers = safeCustomers.filter(c => 
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || 
    (c.phone || '').includes(customerSearch) || 
    (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Chart statistics data preparation
  const categoryChartData = [
    { name: 'Biryani', value: 3400, color: '#F62440' },
    { name: 'Chinese', value: 2400, color: '#FF9800' },
    { name: 'Pizza', value: 1900, color: '#FFC107' },
    { name: 'Dessert', value: 1200, color: '#00C853' },
    { name: 'Drinks', value: 800, color: '#00B0FF' }
  ];

  const salesTrendData = [
    { day: 'Mon', sales: 4200 },
    { day: 'Tue', sales: 3800 },
    { day: 'Wed', sales: 4500 },
    { day: 'Thu', sales: 5100 },
    { day: 'Fri', sales: 6200 },
    { day: 'Sat', sales: 8500 },
    { day: 'Sun', sales: 9200 }
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-[85vh] bg-brand-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-brand-card shadow-2xl rounded-[18px] p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-full bg-brand-accent/15 flex items-center justify-center text-brand-accent mx-auto">
              <UserCheck size={28} />
            </div>
            <h1 className="font-display text-2xl font-black text-brand-text">ArwalEats Admin</h1>
            <p className="text-xs text-brand-text-sec font-bold uppercase tracking-wider">Secure Portal Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-brand-accent/10 border border-brand-accent/30 rounded-xl text-xs font-bold text-brand-accent flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Username</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
              />
            </div>

            <div className="flex items-center py-1">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-brand-card text-brand-accent focus:ring-brand-accent cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-xs font-bold text-brand-text-sec select-none cursor-pointer">
                Remember me
              </label>
            </div>



            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl text-xs shadow-md shadow-brand-accent/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Authenticate Access'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-brand-card/50 space-y-2.5">
            <button 
              type="button"
              onClick={() => setCurrentView('delivery')} 
              className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1 mx-auto"
            >
              🚴 Access Delivery Partner Portal &rarr;
            </button>
            <button 
              type="button"
              onClick={() => setCurrentView('home')} 
              className="text-[11px] font-bold text-brand-text-sec hover:text-brand-accent flex items-center gap-1 mx-auto"
            >
              &larr; Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FFFAF3] text-[#1D1D1D]'} transition-colors duration-300`}>
      
      {/* Toast Notifications Overlay */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`p-4 rounded-xl shadow-2xl border flex items-center justify-between gap-3 pointer-events-auto bg-white/95 backdrop-blur-md border-brand-card`}
            >
              <span className="text-xs font-bold text-brand-text">{n.text}</span>
              <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-brand-text-sec hover:text-brand-accent shrink-0">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex relative min-h-screen">
        {/* Mobile Backdrop Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sticky & Mobile Slide-Out Sidebar */}
        <aside className={`fixed inset-y-0 left-0 lg:sticky lg:top-0 h-screen shrink-0 w-64 border-r ${
          darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-brand-card bg-[#FFF2DB]/80'
        } backdrop-blur-md p-6 flex flex-col justify-between z-50 lg:z-30 transition-transform duration-300 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="space-y-8">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-brand-accent text-white text-[10px] font-black rounded-lg">PORTAL</span>
                  <h2 className="font-display text-xl font-black text-brand-accent">ArwalEats</h2>
                </div>
                {/* Close menu button on mobile sidebar */}
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-brand-text-sec hover:text-brand-accent hover:bg-brand-card/45 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-[10px] text-brand-text-sec font-black tracking-widest uppercase">Live Food Operations</p>
            </div>

            <nav className="space-y-1.5">
              <button 
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <LayoutDashboard size={16} />
                <span>Operational Dashboard</span>
              </button>

              <button 
                onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'orders' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <ShoppingBag size={16} />
                <span>Orders Registry</span>
                {safeOrders.filter(o => o.status === 'Pending').length > 0 && (
                  <span className="ml-auto bg-brand-warning text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {safeOrders.filter(o => o.status === 'Pending').length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => { setActiveTab('customers'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'customers' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <Users size={16} />
                <span>Customers Roster</span>
              </button>

              <button 
                onClick={() => { setActiveTab('menu_mgmt'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'menu_mgmt' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <FileText size={16} />
                <span>Menu Management</span>
              </button>

              <button 
                onClick={() => { setActiveTab('restaurants'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'restaurants' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <Store size={16} />
                <span>Restaurants Hub</span>
              </button>

              <button 
                onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'messages' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <MessageSquare size={16} />
                <span>Customer Inquiries</span>
                {contactMessages.length > 0 && (
                  <span className="ml-auto bg-brand-warning text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {contactMessages.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'reviews' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <Star size={16} />
                <span>Reviews Manager</span>
                {reviews.length > 0 && (
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'reviews' ? 'bg-white text-brand-accent' : 'bg-brand-card text-brand-text'
                  }`}>
                    {reviews.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => { setActiveTab('campaigns'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'campaigns' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <Bell size={16} />
                <span>Customer Alerts Panel</span>
                <span className="ml-auto bg-brand-accent/20 text-brand-accent text-[9px] px-1.5 py-0.5 rounded-md font-bold">Offers</span>
              </button>

              <button 
                onClick={() => { setActiveTab('banners'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'banners' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <FileText size={16} />
                <span>Banner Management</span>
                <span className="ml-auto bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">New</span>
              </button>

              <button 
                onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25' 
                    : 'text-brand-text-sec hover:bg-brand-card/45'
                }`}
              >
                <Settings size={16} />
                <span>Restaurant Settings</span>
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-brand-card/40 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent font-black text-xs">
                  A
                </div>
                <div>
                  <p className="text-[11px] font-black truncate max-w-[110px]">{adminUser?.username}</p>
                  <p className="text-[9px] text-brand-text-sec font-bold">{adminUser?.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleEnablePush} 
                  className={`p-1.5 rounded-lg shadow-sm transition-all ${
                    pushPermission === 'granted' 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : pushPermission === 'denied'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-white text-indigo-600 hover:text-brand-accent'
                  }`}
                  title={pushPermission === 'granted' ? 'Android Push Alerts Active' : 'Enable Push Notifications'}
                >
                  <Bell size={14} className={pushPermission === 'granted' ? 'animate-bounce' : ''} />
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-lg bg-white shadow-sm hover:text-brand-accent transition-colors">
                  {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-accent/10 hover:bg-brand-accent hover:text-white text-brand-accent font-black rounded-xl text-xs transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out Session</span>
            </button>
          </div>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-x-hidden min-h-screen">
          {/* Mobile Navigation Header */}
          <div className={`flex lg:hidden items-center justify-between p-4 border rounded-2xl shadow-sm transition-colors duration-300 ${
            darkMode 
              ? 'bg-zinc-900 border-zinc-800 text-white' 
              : 'bg-white border-brand-card/80 text-[#1D1D1D]'
          }`}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className={`p-2.5 border rounded-xl transition-all cursor-pointer ${
                  darkMode 
                    ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-brand-accent hover:border-zinc-700' 
                    : 'border-brand-card bg-brand-bg text-brand-text hover:text-brand-accent'
                }`}
                title="Toggle Sidebar"
              >
                <SlidersHorizontal size={18} />
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-brand-accent text-white text-[8px] font-black rounded">PORTAL</span>
                  <h2 className="font-display text-sm font-black text-brand-accent">ArwalEats</h2>
                </div>
                <p className={`text-[8px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-zinc-500' : 'text-brand-text-sec'
                }`}>Live Operations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleEnablePush}
                className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all text-[10px] font-black ${
                  pushPermission === 'granted' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : pushPermission === 'denied'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : darkMode
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40 hover:bg-indigo-950/60'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                }`}
                title={pushPermission === 'granted' ? 'Android Push Alerts Active' : 'Enable Push Alerts'}
              >
                <Bell size={14} className={pushPermission === 'granted' ? 'animate-bounce' : ''} />
                <span>{pushPermission === 'granted' ? 'Active' : 'Alerts'}</span>
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2 rounded-xl border transition-colors ${
                  darkMode 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-brand-accent' 
                    : 'bg-brand-bg border border-brand-card text-brand-text hover:text-brand-accent'
                }`}
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button 
                onClick={handleLogout}
                className={`p-2 border rounded-xl transition-all ${
                  darkMode
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30 hover:bg-brand-accent hover:text-white'
                    : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white border border-brand-accent/20'
                }`}
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Header Panel */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-card/50 pb-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-black">{
                activeTab === 'dashboard' ? 'Operational Dashboard' :
                activeTab === 'orders' ? 'Orders Registry' :
                activeTab === 'customers' ? 'Customers Roster' : 
                activeTab === 'menu_mgmt' ? 'Menu Management' : 
                activeTab === 'messages' ? 'Customer Inquiries' : 
                activeTab === 'reviews' ? 'Reviews Manager' : 
                activeTab === 'campaigns' ? 'Custom Customer Alerts' : 'Restaurant Configuration'
              }</h1>
              <p className="text-xs text-brand-text-sec font-semibold flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  ⚡ Supabase Realtime PostgreSQL Connected
                </span>
                {lastRefreshed && <span>&bull; Last refreshed at {lastRefreshed}</span>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-xs shadow-sm">
                <Zap size={14} className="animate-bounce text-emerald-500 shrink-0" />
                <span>Realtime Push (&lt;10ms)</span>
              </div>

              <button 
                onClick={triggerManualRefresh}
                disabled={loading}
                className="p-2.5 border border-brand-card rounded-xl bg-white text-brand-text hover:text-brand-accent hover:border-brand-accent transition-all cursor-pointer shrink-0"
                title="Force Refresh Data"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin text-brand-accent' : ''} />
              </button>
            </div>
          </div>

          {/* LOADING STATE SKELETONS */}
          {loading && !dashboardData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(x => (
                  <div key={x} className="h-28 bg-brand-card/25 rounded-2xl animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-brand-card/25 rounded-2xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* TAB: PROMOTIONAL BANNER MANAGEMENT */}
              {activeTab === 'banners' && (
                <BannerManager />
              )}

              {/* TAB 1: OPERATIONAL DASHBOARD */}
              {activeTab === 'dashboard' && dashboardData && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Stat Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white border border-brand-card/80 p-5 rounded-2xl space-y-1.5 shadow-sm">
                      <p className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Today's Revenue</p>
                      <h3 className="font-display font-black text-2xl text-brand-accent">₹{dashboardData.todayRevenue}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-brand-success font-bold">
                        <TrendingUp size={12} />
                        <span>Live Sales Loop</span>
                      </div>
                    </div>

                    <div className="bg-white border border-brand-card/80 p-5 rounded-2xl space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Today's Profit</p>
                        <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md font-bold tracking-wide">ADMIN</span>
                      </div>
                      <h3 className="font-display font-black text-2xl text-indigo-600">₹{dashboardData.todayProfit ?? 0}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                        <TrendingUp size={12} />
                        <span>Margin: {dashboardData.todayRevenue > 0 ? Math.round(((dashboardData.todayProfit ?? 0) / dashboardData.todayRevenue) * 100) : 0}%</span>
                      </div>
                    </div>

                    <div className="bg-white border border-brand-card/80 p-5 rounded-2xl space-y-1.5 shadow-sm">
                      <p className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Active Orders</p>
                      <h3 className="font-display font-black text-2xl text-brand-text">
                        {dashboardData.pendingOrders + dashboardData.preparingOrders + dashboardData.outForDelivery}
                      </h3>
                      <p className="text-[9px] text-brand-text-sec font-semibold">
                        {dashboardData.pendingOrders} Pending &bull; {dashboardData.preparingOrders} Cooking
                      </p>
                    </div>

                    <div className="bg-white border border-brand-card/80 p-5 rounded-2xl space-y-1.5 shadow-sm">
                      <p className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Total Customers</p>
                      <h3 className="font-display font-black text-2xl text-brand-text">{dashboardData.totalCustomers}</h3>
                      <p className="text-[9px] text-brand-success font-bold flex items-center gap-0.5">
                        <Check size={10} /> Active Database
                      </p>
                    </div>

                    <div className="bg-white border border-brand-card/80 p-5 rounded-2xl space-y-1.5 shadow-sm col-span-2 lg:col-span-1">
                      <p className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Average Ticket</p>
                      <h3 className="font-display font-black text-2xl text-brand-text">₹{dashboardData.averageOrderValue}</h3>
                      <p className="text-[9px] text-brand-text-sec font-semibold">Per Customer Checkout</p>
                    </div>
                  </div>

                  {/* Private Operational Profit Insights Row */}
                  <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-950 shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300">Private Financial & Profit Analysis</h3>
                          <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">Admin Restricted</span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1">Real-time calculations based on food item-specific profit margins. Entirely hidden from customer client interfaces.</p>
                      </div>
                      <div className="p-2 bg-indigo-900/40 rounded-xl border border-indigo-800/40">
                        <TrendingUp size={16} className="text-indigo-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-800/30">
                        <p className="text-[9px] text-indigo-300 uppercase font-black tracking-wider">Today's Profit</p>
                        <h4 className="font-display font-black text-xl text-white mt-1">₹{dashboardData.todayProfit ?? 0}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Revenue: ₹{dashboardData.todayRevenue}</p>
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-800/30">
                        <p className="text-[9px] text-indigo-300 uppercase font-black tracking-wider">Weekly Profit</p>
                        <h4 className="font-display font-black text-xl text-white mt-1">₹{dashboardData.weeklyProfit ?? 0}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Revenue: ₹{dashboardData.weeklyRevenue}</p>
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-800/30">
                        <p className="text-[9px] text-indigo-300 uppercase font-black tracking-wider">Monthly Profit</p>
                        <h4 className="font-display font-black text-xl text-white mt-1">₹{dashboardData.monthlyProfit ?? 0}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Revenue: ₹{dashboardData.monthlyRevenue}</p>
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-800/30">
                        <p className="text-[9px] text-indigo-300 uppercase font-black tracking-wider">Cumulative Profit</p>
                        <h4 className="font-display font-black text-xl text-indigo-300 mt-1">₹{dashboardData.totalProfit ?? 0}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5">Sales: ₹{dashboardData.totalSales}</p>
                      </div>
                    </div>
                  </div>

                  {/* Push Notifications & Alerts Test Laboratory */}
                  <div className="bg-gradient-to-br from-rose-50/70 to-rose-100/40 border border-rose-200/60 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-rose-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-[#ef4444] text-white flex items-center justify-center shadow-md animate-pulse">
                          <Bell size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-rose-950 flex items-center gap-1.5">
                            Real-Time Push Alerts & Notification Testing Lab
                          </h3>
                          <p className="text-[10px] text-rose-800 font-semibold mt-0.5">
                            Instantly trigger simulated events to verify sound chimes, in-app sliding banners, and native push alerts!
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                          Interactive Sandbox
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <button
                        onClick={simulateNewOrder}
                        className="p-3.5 bg-white hover:bg-rose-50/60 border border-rose-200 hover:border-[#ef4444]/30 rounded-xl transition-all duration-200 flex items-center gap-3 group text-left cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <div className="p-2 bg-rose-100 text-[#ef4444] rounded-lg group-hover:scale-110 transition-transform">
                          <ShoppingBag size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-950 uppercase tracking-wide">1. Place New Order</p>
                          <p className="text-[9px] text-rose-700 font-semibold mt-0.5">Simulates customer checkout</p>
                        </div>
                      </button>

                      <button
                        onClick={simulateNewQuery}
                        className="p-3.5 bg-white hover:bg-rose-50/60 border border-rose-200 hover:border-[#ef4444]/30 rounded-xl transition-all duration-200 flex items-center gap-3 group text-left cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-950 uppercase tracking-wide">2. Send Customer Query</p>
                          <p className="text-[9px] text-rose-700 font-semibold mt-0.5">Simulates contact form inquiry</p>
                        </div>
                      </button>

                      <button
                        onClick={simulateStatusUpdate}
                        className="p-3.5 bg-white hover:bg-rose-50/60 border border-rose-200 hover:border-[#ef4444]/30 rounded-xl transition-all duration-200 flex items-center gap-3 group text-left cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                          <RefreshCw size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-950 uppercase tracking-wide">3. Status Transition</p>
                          <p className="text-[9px] text-rose-700 font-semibold mt-0.5">Simulates cooking & dispatch</p>
                        </div>
                      </button>

                      <button
                        onClick={simulateNewReview}
                        className="p-3.5 bg-white hover:bg-rose-50/60 border border-rose-200 hover:border-[#ef4444]/30 rounded-xl transition-all duration-200 flex items-center gap-3 group text-left cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                          <Star size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-950 uppercase tracking-wide">4. Submit 5★ Review</p>
                          <p className="text-[9px] text-rose-700 font-semibold mt-0.5">Simulates user rating feedback</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Flow Status Tracker Row */}
                  <div className="bg-brand-card/25 rounded-2xl p-6 border border-brand-card/50 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-text">Active Order Delivery Pipeline</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white p-4 rounded-xl text-center border border-brand-card">
                        <p className="text-[10px] text-brand-text-sec font-bold">Pending</p>
                        <h4 className="font-display font-black text-lg text-brand-warning">{dashboardData.pendingOrders}</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl text-center border border-brand-card">
                        <p className="text-[10px] text-brand-text-sec font-bold">Preparing</p>
                        <h4 className="font-display font-black text-lg text-purple-600">{dashboardData.preparingOrders}</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl text-center border border-brand-card">
                        <p className="text-[10px] text-brand-text-sec font-bold">Out for Delivery</p>
                        <h4 className="font-display font-black text-lg text-brand-accent">{dashboardData.outForDelivery}</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl text-center border border-brand-card">
                        <p className="text-[10px] text-brand-text-sec font-bold">Delivered</p>
                        <h4 className="font-display font-black text-lg text-brand-success">{dashboardData.deliveredOrders}</h4>
                      </div>
                      <div className="bg-white p-4 rounded-xl text-center border border-brand-card col-span-2 md:col-span-1">
                        <p className="text-[10px] text-brand-text-sec font-bold">Cancelled</p>
                        <h4 className="font-display font-black text-lg text-zinc-500">{dashboardData.cancelledOrders}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Visualization charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recharts Bar */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-brand-card/80 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-wider">Weekly Revenue Stream</h3>
                        <span className="text-[10px] text-brand-success font-black bg-brand-success/10 px-2 py-0.5 rounded-lg border border-brand-success/20">LIVE</span>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesTrendData}>
                            <XAxis dataKey="day" stroke="#666" fontSize={11} fontWeight="bold" tickLine={false} />
                            <YAxis stroke="#666" fontSize={11} fontWeight="bold" tickLine={false} />
                            <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                            <Bar dataKey="sales" fill="#F62440" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recharts Pie */}
                    <div className="bg-white p-6 rounded-2xl border border-brand-card/80 shadow-sm space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider">Sales Share by Category</h3>
                      <div className="h-52 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={categoryChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categoryChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                        {categoryChartData.map((c) => (
                          <div key={c.name} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-brand-text-sec">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders table */}
                  <div className="bg-white border border-brand-card rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-brand-card/60 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-brand-text">Active & Recent Incoming Orders</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1">
                        View All Registry &rarr;
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg-sec/50 text-brand-text-sec text-[10px] uppercase font-black tracking-wider border-b border-brand-card">
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Time</th>
                            <th className="p-4">Items Summary</th>
                            <th className="p-4">Total Bill</th>
                            <th className="p-4">Current Status</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-card/40 text-xs font-semibold">
                          {dashboardData.recentOrders.slice(0, 5).map((o: any) => (
                            <tr key={o.orderId} className="hover:bg-brand-bg-sec/30">
                              <td className="p-4 font-mono font-black text-brand-text">{o.orderId}</td>
                              <td className="p-4">
                                <p className="font-bold">{o.customerName}</p>
                                <p className="text-[10px] text-brand-text-sec">{o.phone}</p>
                              </td>
                              <td className="p-4 text-[11px]">
                                {new Date(o.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-4 max-w-[200px] truncate text-[11px] text-brand-text-sec">
                                {o.items.map((i: any) => `${i.name} x${i.qty}`).join(', ')}
                              </td>
                              <td className="p-4 font-bold text-brand-accent">₹{o.total}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                                  o.status === 'Pending' ? 'text-brand-warning bg-brand-warning/10 border-brand-warning/30' :
                                  o.status === 'Preparing' ? 'text-purple-600 bg-purple-600/10 border-purple-600/30' :
                                  o.status === 'Out for Delivery' ? 'text-brand-accent bg-brand-accent/10 border-brand-accent/30' :
                                  'text-brand-success bg-brand-success/10 border-brand-success/30'
                                }`}>{o.status}</span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => setSelectedOrder(o)}
                                  className="px-3 py-1 bg-brand-bg hover:bg-brand-card hover:text-brand-accent text-[10px] font-bold rounded-lg border border-brand-card transition-all"
                                >
                                  Manage Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS REGISTRY */}
              {activeTab === 'orders' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Filters & Actions Header bar */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-card shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-sec shrink-0" size={16} />
                        <input 
                          type="text"
                          placeholder="Search Order ID, Customer Name, or Phone..."
                          value={orderSearch}
                          onChange={e => setOrderSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="px-3 py-2 text-xs font-bold border border-brand-card rounded-xl bg-white text-brand-text"
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted / Ready</option>
                          <option value="Preparing">Preparing / Cooking</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <select
                          value={orderSort}
                          onChange={e => setOrderSort(e.target.value)}
                          className="px-3 py-2 text-xs font-bold border border-brand-card rounded-xl bg-white text-brand-text"
                        >
                          <option value="latest">Sort: Latest</option>
                          <option value="oldest">Sort: Oldest</option>
                          <option value="highest">Sort: Highest Cost</option>
                          <option value="lowest">Sort: Lowest Cost</option>
                        </select>

                        <button 
                          onClick={exportOrdersCSV}
                          className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-brand-accent/15 cursor-pointer flex items-center gap-1.5"
                        >
                          <Download size={14} />
                          <span>Export Registry (CSV)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Core Orders Registry Table */}
                  <div className="bg-white border border-brand-card rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg-sec/50 text-brand-text-sec text-[10px] uppercase font-black tracking-wider border-b border-brand-card">
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Customer Details</th>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Date & Time</th>
                            <th className="p-4">Order Items</th>
                            <th className="p-4">Total Bill</th>
                            <th className="p-4">Payment</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Manage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-card/40 text-xs font-semibold">
                          {filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-12 text-center text-brand-text-sec font-bold">
                                No matching orders found inside operational history.
                              </td>
                            </tr>
                          ) : (
                            filteredOrders.map(o => {
                              if (!o) return null;
                              const itemArray = Array.isArray(o.items) ? o.items : [];
                              const dateFormatted = o.date ? (() => {
                                try {
                                  const d = new Date(o.date);
                                  return isNaN(d.getTime()) ? 'Recently' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                                } catch (e) {
                                  return 'Recently';
                                }
                              })() : 'Recently';

                              return (
                                <tr key={o.orderId || Math.random()} className="hover:bg-brand-bg-sec/20">
                                  <td className="p-4 font-mono font-black text-brand-text">{o.orderId || 'AE-0000'}</td>
                                  <td className="p-4">
                                    <p className="font-bold">{o.customerName || 'Valued Customer'}</p>
                                    <p className="text-[10px] text-brand-text-sec">{o.phone || ''}</p>
                                  </td>
                                  <td className="p-4 font-bold text-brand-text max-w-[150px] truncate">
                                    {(() => {
                                      const rName = o.restaurantName;
                                      if (rName) return rName;
                                      const rId = o.restaurantId;
                                      if (rId) {
                                        const r = restaurants.find(res => res.id === rId);
                                        if (r) return r.name;
                                      }
                                      return 'N/A';
                                    })()}
                                  </td>
                                  <td className="p-4 text-[11px]">{dateFormatted}</td>
                                  <td className="p-4 max-w-[180px] truncate text-[11px] text-brand-text-sec">
                                    {itemArray.length > 0 
                                      ? itemArray.map((i: any) => `${i.name || 'Item'} (${i.variant || 'Regular'}) x${i.qty || 1}`).join(', ') 
                                      : 'No items detailed'}
                                  </td>
                                  <td className="p-4 font-bold text-brand-accent">₹{o.total || 0}</td>
                                  <td className="p-4 font-mono text-[10px] text-brand-text-sec uppercase">{o.paymentMethod || 'COD'}</td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                                      o.status === 'Pending' ? 'text-brand-warning bg-brand-warning/10 border-brand-warning/30' :
                                      o.status === 'Preparing' ? 'text-purple-600 bg-purple-600/10 border-purple-600/30' :
                                      o.status === 'Out for Delivery' ? 'text-brand-accent bg-brand-accent/10 border-brand-accent/30' :
                                      o.status === 'Cancelled' ? 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' :
                                      'text-brand-success bg-brand-success/10 border-brand-success/30'
                                    }`}>{o.status || 'Pending'}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <button 
                                      onClick={() => setSelectedOrder(o)}
                                      className="px-3 py-1.5 bg-brand-bg hover:bg-brand-card hover:text-brand-accent text-[10px] font-bold rounded-lg border border-brand-card transition-all"
                                    >
                                      Manage Details
                                    </button>
                                    
                                    {/* WhatsApp Chat Button */}
                                    {(() => {
                                      const cust = customers.find(c => c.customerId === o.customerId);
                                      const rawPhone = o.phone || cust?.phone || '';
                                      const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
                                      if (!cleanPhone) return null;
                                      const waMsg = encodeURIComponent(`Hello ${o.customerName || 'Valued Customer'}! Greetings from ArwalEats. Regarding your Order #${o.orderId} (${o.status})...`);
                                      return (
                                        <a
                                          href={`https://wa.me/91${cleanPhone}?text=${waMsg}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold rounded-lg border border-emerald-200 transition-all flex items-center gap-1"
                                          title="Chat with Customer on WhatsApp"
                                        >
                                          <MessageSquare size={12} />
                                          <span>WhatsApp</span>
                                        </a>
                                      );
                                    })()}

                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&origin=${o.restaurant_lat},${o.restaurant_lng}&destination=${o.customer_lat},${o.customer_lng}&travelmode=driving`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold rounded-lg border border-blue-200 transition-all flex items-center gap-1"
                                      title="Navigate to customer location on Google Maps"
                                    >
                                      <Navigation size={12} />
                                      <span>Directions</span>
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOMERS ROSTER */}
              {activeTab === 'customers' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white p-5 rounded-2xl border border-brand-card shadow-sm">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-sec shrink-0" size={16} />
                      <input 
                        type="text"
                        placeholder="Search customer name, email, or phone roster..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-brand-card rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg-sec/50 text-brand-text-sec text-[10px] uppercase font-black tracking-wider border-b border-brand-card">
                            <th className="p-4">Customer Info</th>
                            <th className="p-4">Contact Detail</th>
                            <th className="p-4">Delivery Address</th>
                            <th className="p-4 text-center">Total Orders</th>
                            <th className="p-4 text-center">Total Spend</th>
                            <th className="p-4">Last Active</th>
                            <th className="p-4 text-center">Order History</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-card/40 text-xs font-semibold">
                          {filteredCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-brand-text-sec font-bold">
                                No customer records matching search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredCustomers.map(c => (
                              <tr key={c.customerId} className="hover:bg-brand-bg-sec/20">
                                <td className="p-4">
                                  <p className="font-bold">{c.name}</p>
                                  <p className="text-[10px] font-mono text-brand-text-sec">{c.customerId}</p>
                                </td>
                                <td className="p-4 text-[11px]">
                                  <p>{c.phone}</p>
                                  <p className="text-brand-text-sec font-semibold">{c.email}</p>
                                </td>
                                <td className="p-4 max-w-[200px] truncate text-[11px]" title={c.address}>
                                  {c.address}
                                </td>
                                <td className="p-4 text-center font-bold">{c.totalOrders}</td>
                                <td className="p-4 text-center font-bold text-brand-accent">₹{c.totalSpending}</td>
                                <td className="p-4 text-[11px]">
                                  {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'}
                                </td>
                                <td className="p-4 text-center">
                                  <button 
                                    onClick={() => setSelectedCustomer(c)}
                                    className="px-3 py-1.5 bg-brand-bg hover:bg-brand-card hover:text-brand-accent text-[10px] font-bold rounded-lg border border-brand-card transition-all"
                                  >
                                    View History
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RESTAURANT CONFIGURATION */}
              {activeTab === 'settings' && settings && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
                  {/* Configuration Form */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-brand-card shadow-sm space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-2">
                      <Settings size={14} className="text-brand-accent animate-spin" style={{ animationDuration: '6s' }} />
                      Operational Parameters
                    </h3>

                    <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Delivery Service Name</label>
                        <input 
                          type="text"
                          value={settings.restaurantName}
                          onChange={e => setSettings(prev => prev ? { ...prev, restaurantName: e.target.value } : null)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Phone Line</label>
                        <input 
                          type="text"
                          value={settings.phone}
                          onChange={e => setSettings(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">WhatsApp Line</label>
                        <input 
                          type="text"
                          value={settings.whatsapp}
                          onChange={e => setSettings(prev => prev ? { ...prev, whatsapp: e.target.value } : null)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Minimum Order Cutoff (₹)</label>
                        <input 
                          type="number"
                          value={settings.minimumOrder}
                          onChange={e => setSettings(prev => prev ? { ...prev, minimumOrder: Number(e.target.value) } : null)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Restaurant Latitude</label>
                        <input 
                          type="number"
                          step="any"
                          value={settings.latitude ?? ''}
                          onChange={e => setSettings(prev => prev ? { ...prev, latitude: e.target.value === '' ? undefined : Number(e.target.value) } : null)}
                          required
                          placeholder="e.g. 25.249325"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Restaurant Longitude</label>
                        <input 
                          type="number"
                          step="any"
                          value={settings.longitude ?? ''}
                          onChange={e => setSettings(prev => prev ? { ...prev, longitude: e.target.value === '' ? undefined : Number(e.target.value) } : null)}
                          required
                          placeholder="e.g. 84.682145"
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider flex items-center gap-1">
                          ⏰ Opening Hour (IST)
                        </label>
                        <input 
                          type="time"
                          value={convertTo24h(settings.openingTime)}
                          onChange={e => {
                            const val12h = convert24hTo12h(e.target.value);
                            setSettings(prev => prev ? { ...prev, openingTime: val12h } : null);
                          }}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                        <p className="text-[9px] text-brand-accent font-black tracking-wide px-1">
                          Configured: {formatTimeTo12Hour(settings.openingTime)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider flex items-center gap-1">
                          ⏰ Closing Hour (IST)
                        </label>
                        <input 
                          type="time"
                          value={convertTo24h(settings.closingTime)}
                          onChange={e => {
                            const val12h = convert24hTo12h(e.target.value);
                            setSettings(prev => prev ? { ...prev, closingTime: val12h } : null);
                          }}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                        <p className="text-[9px] text-brand-accent font-black tracking-wide px-1">
                          Configured: {formatTimeTo12Hour(settings.closingTime)}
                        </p>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Address Details</label>
                        <textarea 
                          value={settings.address}
                          onChange={e => setSettings(prev => prev ? { ...prev, address: e.target.value } : null)}
                          required
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                        />
                      </div>

                      {/* Manual Overrides for Store Closure */}
                      <div className="space-y-4 md:col-span-2 p-4 bg-red-500/5 border border-brand-accent/20 rounded-2xl">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-accent flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          Store Closure Override (Manual and Automated)
                        </h4>
                        
                        <div className="flex flex-col md:flex-row gap-6 md:items-center">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={settings.isClosed || false}
                              onChange={e => setSettings(prev => prev ? { ...prev, isClosed: e.target.checked } : null)}
                              className="h-5 w-5 rounded border-brand-card text-brand-accent focus:ring-brand-accent"
                            />
                            <div>
                              <span className="text-xs font-black text-brand-text">Force Close Store (Manual Toggle)</span>
                              <p className="text-[10px] text-brand-text-sec font-medium">Instantly blocks checkouts and displays a custom message to customers.</p>
                            </div>
                          </label>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Custom Closed Message</label>
                          <textarea 
                            value={settings.closedMessage || ''}
                            onChange={e => setSettings(prev => prev ? { ...prev, closedMessage: e.target.value } : null)}
                            placeholder="We are currently closed. Please check back during our opening hours!"
                            rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-brand-card text-xs font-bold focus:outline-none focus:border-brand-accent bg-white text-brand-text"
                          />
                        </div>
                        
                        <div className="p-3 bg-white/70 border border-brand-card rounded-xl">
                          <p className="text-[10px] text-brand-text-sec font-bold">
                            🕰️ <span className="font-black text-brand-text">Automated Schedule Policy:</span> The storefront automatically closes and refuses orders when the Indian Standard Time (IST) falls outside your designated opening hour (<span className="text-brand-accent font-black">{formatTimeTo12Hour(settings.openingTime)}</span>) and closing hour (<span className="text-brand-accent font-black">{formatTimeTo12Hour(settings.closingTime)}</span>). Ensure the time format remains standard (e.g., <span className="font-mono bg-brand-bg px-1">11:00 AM</span>).
                          </p>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="md:col-span-2 w-full py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-brand-accent/25 active:scale-95 transition-all cursor-pointer"
                      >
                        Synchronize & Save Configuration Settings
                      </button>
                    </form>
                  </div>

                  {/* SUB CARD 2: SUPABASE DATABASE SYSTEM */}
                  <div className="bg-white p-6 rounded-2xl border border-brand-card shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Database size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-brand-text uppercase tracking-wider">
                          Supabase PostgreSQL Database
                        </h3>
                        <p className="text-[10px] text-brand-text-sec font-semibold mt-0.5">High-performance PostgreSQL database & Realtime push channels!</p>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="p-4 rounded-xl border flex items-start gap-3 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                      <CheckCircle2 className="shrink-0 mt-0.5 animate-pulse" size={18} />
                      <div className="text-[10px]">
                        <p className="font-bold text-emerald-950 uppercase tracking-wider">
                          Database Mode: Live Supabase PostgreSQL Realtime Sync
                        </p>
                        <p className="text-emerald-800 font-semibold mt-1">
                          ⚡ All customers, orders, menu items, restaurants, and settings are actively synchronized in real time with your Supabase PostgreSQL cluster (<span className="font-mono">htglakezdwhkcpxqvqhu.supabase.co</span>)!
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900 text-white font-mono text-[10px] space-y-1.5 border border-zinc-800 shadow-inner">
                      <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-zinc-800 pb-1.5">
                        <span>SUPABASE ENDPOINT CONNECTION</span>
                        <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">ONLINE (sub-50ms)</span>
                      </div>
                      <p className="text-zinc-400 truncate">URL: https://htglakezdwhkcpxqvqhu.supabase.co</p>
                      <p className="text-zinc-400">TABLES: orders, order_items, menu, restaurants, customers, coupons, banners, settings</p>
                      <p className="text-emerald-400 font-bold pt-1">REALTIME CHANNELS: Active & Listening</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MENU MANAGEMENT */}
              {activeTab === 'menu_mgmt' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-brand-card shadow-sm">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Active Food Menu ({menuItems.length} items)</h3>
                      <p className="text-[10px] text-brand-text-sec font-semibold">Manage, delete, or append new culinary dishes</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      {menuItems.length > 0 && (
                        <button
                          onClick={() => setConfirmingClearAllMenuItems(true)}
                          className="px-4 py-2.5 sm:py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          Delete All Items
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingMenuItem(null);
                          setNewItemName('');
                          setNewItemCategory('Biriyani');
                          setNewItemVariant('Regular, Large');
                          setNewItemPrice('150, 250');
                          setNewItemProfitMargin('30');
                          setNewItemImage('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60');
                          setNewItemFeatured(false);
                          setShowAddMenuModal(true);
                        }}
                        className="px-4 py-2.5 sm:py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-brand-accent/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Plus size={14} />
                        Add New MenuItem
                      </button>
                    </div>
                  </div>

                  {/* Desktop view: Table */}
                  <div className="hidden md:block bg-white rounded-2xl border border-brand-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-brand-card/25 border-b border-brand-card text-brand-text font-black text-[10px] uppercase tracking-wider">
                            <th className="px-5 py-3">Dish / Image</th>
                            <th className="px-5 py-3">Category</th>
                            <th className="px-5 py-3">Variants</th>
                            <th className="px-5 py-3">Prices (₹)</th>
                            <th className="px-5 py-3 text-indigo-600">Profit Margin (₹)</th>
                            <th className="px-5 py-3">Featured</th>
                            <th className="px-5 py-3">Availability</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-card/45 font-semibold text-brand-text-sec">
                          {menuItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-12 italic text-brand-text-sec text-xs">
                                No menu items found. Add some delicious dishes!
                              </td>
                            </tr>
                          ) : (
                            menuItems.map((item) => (
                              <tr key={item.id} className="hover:bg-brand-bg/25 transition-colors">
                                <td className="px-5 py-4 flex items-center gap-3">
                                  <img
                                    src={item.image || null}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="h-10 w-10 rounded-lg object-cover border border-brand-card shrink-0"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-black text-brand-text">{item.name}</p>
                                      {getDietType(item) === 'veg' ? (
                                        <span className="inline-flex items-center justify-center border border-green-600 p-[2px] rounded h-3.5 w-3.5 shrink-0" title="Vegetarian">
                                          <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center border border-red-600 p-[2px] rounded h-3.5 w-3.5 shrink-0" title="Non-Vegetarian">
                                          <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-[9px] text-brand-text-sec font-bold uppercase">{item.id}</span>
                                    {item.description && (
                                      <p className="text-[10px] text-brand-text-sec mt-0.5 line-clamp-2 italic font-normal max-w-[200px]" title={item.description}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-xs font-bold text-brand-text">
                                  {item.category}
                                </td>
                                <td className="px-5 py-4 text-[11px] font-medium max-w-[150px] truncate">
                                  {item.variant}
                                </td>
                                <td className="px-5 py-4 font-mono font-bold text-brand-accent">
                                  ₹{item.price}
                                </td>
                                <td className="px-5 py-4 font-mono font-bold text-indigo-600 bg-indigo-50/20">
                                  {item.profitMargin ? String(item.profitMargin).split(',').map((p: any) => `₹${p.trim()}`).join(', ') : String(item.price).split(',').map((pr: any) => `₹${Math.round(parseFloat(pr.trim()) * 0.3)}`).join(', ')}
                                </td>
                                <td className="px-5 py-4">
                                  <button
                                    onClick={() => handleToggleFeatured(item)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                                      item.featured
                                        ? 'text-amber-600 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                                        : 'text-zinc-500 bg-zinc-100 border-zinc-300 hover:bg-zinc-200'
                                    }`}
                                    title={item.featured ? "Remove from ArwalEats Specials" : "Add to ArwalEats Specials"}
                                  >
                                    {item.featured ? '★ Special' : 'Standard'}
                                  </button>
                                </td>
                                <td className="px-5 py-4">
                                  <button
                                    onClick={() => handleToggleAvailability(item)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                                      item.available
                                        ? 'text-brand-success bg-brand-success/10 border-brand-success/30 hover:bg-brand-success/20'
                                        : 'text-zinc-500 bg-zinc-100 border-zinc-300 hover:bg-zinc-200'
                                    }`}
                                  >
                                    {item.available ? 'In Stock' : 'Out of Stock'}
                                  </button>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    onClick={() => {
                                      setEditingMenuItem(item);
                                      setNewItemName(item.name);
                                      setNewItemCategory(item.category);
                                      setNewItemVariant(item.variant || '');
                                      setNewItemPrice(String(item.price || ''));
                                      setNewItemProfitMargin(String(item.profitMargin || '30'));
                                      setNewItemImage(item.image || '');
                                      setNewItemFeatured(!!item.featured);
                                      setNewItemDietType(getDietType(item));
                                      setNewItemDescription(item.description || '');
                                      setNewItemRestaurantId(item.restaurantId || 'rest1');
                                      setShowAddMenuModal(true);
                                    }}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg border border-blue-200/50 transition-colors cursor-pointer inline-flex items-center mr-1.5"
                                    title="Edit Item"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMenuItem(item.id, item.name)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-200/50 transition-colors cursor-pointer inline-flex items-center"
                                    title="Delete Item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile & Tablet view: Card List */}
                  <div className="block md:hidden space-y-4">
                    {menuItems.length === 0 ? (
                      <div className="bg-white p-12 text-center rounded-2xl border border-brand-card shadow-sm italic text-brand-text-sec text-xs">
                        No menu items found. Add some delicious dishes!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {menuItems.map((item) => (
                          <div key={item.id} className="bg-white p-4 rounded-2xl border border-brand-card shadow-sm space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <img
                                  src={item.image || null}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="h-14 w-14 rounded-xl object-cover border border-brand-card shrink-0 shadow-xs"
                                />
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 bg-brand-accent/10 text-brand-accent text-[8px] font-black uppercase rounded-md tracking-wider">
                                      {item.category}
                                    </span>
                                    <button
                                      onClick={() => handleToggleFeatured(item)}
                                      className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border cursor-pointer transition-colors ${
                                        item.featured
                                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                                          : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-zinc-200'
                                      }`}
                                      title={item.featured ? "Remove from Specials" : "Make Special"}
                                    >
                                      {item.featured ? '★ Special' : 'Standard'}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-black text-brand-text leading-snug break-words">{item.name}</p>
                                    {getDietType(item) === 'veg' ? (
                                      <span className="inline-flex items-center justify-center border border-green-600 p-[1.5px] rounded h-3 w-3 shrink-0" title="Vegetarian">
                                        <span className="h-1 w-1 rounded-full bg-green-600"></span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center border border-red-600 p-[1.5px] rounded h-3 w-3 shrink-0" title="Non-Vegetarian">
                                        <span className="h-1 w-1 rounded-full bg-red-600"></span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[9px] text-brand-text-sec font-bold uppercase">{item.id}</p>
                                  {item.description && (
                                    <p className="text-[10px] text-brand-text-sec mt-0.5 line-clamp-2 italic font-normal" title={item.description}>
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 p-2.5 bg-brand-bg/35 rounded-xl border border-brand-card/30 text-[11px] font-bold">
                                <div>
                                  <span className="text-[9px] text-brand-text-sec block font-black uppercase tracking-wider">Variants</span>
                                  <span className="text-brand-text text-xs line-clamp-1">{item.variant}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-brand-text-sec block font-black uppercase tracking-wider">Price</span>
                                  <span className="text-brand-accent text-xs font-black">₹{item.price}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-brand-text-sec block font-black uppercase tracking-wider">Profit</span>
                                  <span className="text-indigo-600 text-xs font-black">
                                    {item.profitMargin ? String(item.profitMargin).split(',').map((p: any) => `₹${p.trim()}`).join(', ') : String(item.price).split(',').map((pr: any) => `₹${Math.round(parseFloat(pr.trim()) * 0.3)}`).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-brand-card/45">
                              <button
                                onClick={() => handleToggleAvailability(item)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border text-center ${
                                  item.available
                                    ? 'text-brand-success bg-brand-success/10 border-brand-success/30 hover:bg-brand-success/20'
                                    : 'text-zinc-500 bg-zinc-100 border-zinc-300 hover:bg-zinc-200'
                                }`}
                              >
                                {item.available ? 'In Stock' : 'Out of Stock'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMenuItem(item);
                                  setNewItemName(item.name);
                                  setNewItemCategory(item.category);
                                  setNewItemVariant(item.variant || '');
                                  setNewItemPrice(String(item.price || ''));
                                  setNewItemProfitMargin(String(item.profitMargin || '30'));
                                  setNewItemImage(item.image || '');
                                  setNewItemFeatured(!!item.featured);
                                  setNewItemDietType(getDietType(item));
                                  setNewItemDescription(item.description || '');
                                  setNewItemRestaurantId(item.restaurantId || 'rest1');
                                  setShowAddMenuModal(true);
                                }}
                                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-xl border border-blue-200/50 transition-colors cursor-pointer shrink-0"
                                title="Edit Item"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteMenuItem(item.id, item.name)}
                                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl border border-red-200/50 transition-colors cursor-pointer shrink-0"
                                title="Delete Item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB RESTAURANTS HUB */}
              {activeTab === 'restaurants' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-brand-card shadow-sm">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Restaurants Hub ({restaurants.length} outlets)</h3>
                      <p className="text-[10px] text-brand-text-sec font-semibold">Manage, edit, or register brand new restaurant locations and configure their menus</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleOpenAllRestaurants}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-green-600 transition-colors cursor-pointer"
                      >
                        Open All
                      </button>
                      <button
                        onClick={() => {
                          setEditingRestaurant(null);
                          setNewRestName('');
                          setNewRestPhone('');
                          setNewRestAddress('');
                          setNewRestCuisine('');
                          setNewRestImage('');
                          setNewRestRating('4.5');
                          setNewRestDeliveryTime('25-35 mins');
                          setNewRestActive(true);
                          setNewRestFeatured(false);
                          setNewRestLatitude('25.0143');
                          setNewRestLongitude('84.6784');
                          setNewRestUsername('');
                          setNewRestLogin('');
                          setNewRestPassword('');
                          setShowAddRestaurantModal(true);
                        }}
                        className="px-4 py-2.5 sm:py-2 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} />
                        Register Restaurant
                      </button>
                    </div>
                  </div>

                  {/* Restaurants Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.map((r) => {
                      const itemCount = menuItems.filter(item => (item.restaurantId === r.id || (!item.restaurantId && r.id === 'rest1'))).length;
                      return (
                        <div key={r.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${selectedRestaurantId === r.id ? 'border-brand-accent ring-2 ring-brand-accent/15' : 'border-brand-card'}`}>
                          <div className="h-32 bg-zinc-100 relative">
                            <img src={r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60'} alt={r.name} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-brand-accent flex items-center gap-0.5 shadow-sm">
                              <Star size={10} className="fill-brand-accent text-brand-accent" />
                              {r.rating || '4.5'}
                            </div>
                            {!r.active && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-xs uppercase tracking-wider">
                                Temporarily Closed
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="max-w-[50%]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-sm text-brand-text break-words">{r.name}</h4>
                                  <button
                                    onClick={() => handleToggleRestaurantFeatured(r)}
                                    className={`inline-flex items-center justify-center rounded-full p-1 text-[10px] transition-all cursor-pointer ${r.featured ? 'bg-amber-500 text-white hover:bg-amber-600 scale-110' : 'bg-zinc-100 text-zinc-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                    title={r.featured ? "Remove from Featured Restaurants" : "Mark as Featured Restaurant"}
                                  >
                                    ★
                                  </button>
                                </div>
                                <p className="text-[10px] text-brand-text-sec font-semibold mt-0.5">{r.cuisine}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleToggleRestaurantActive(r)}
                                  className="flex items-center gap-1 focus:outline-none group cursor-pointer"
                                  title={`Click to mark as ${r.active ? 'Inactive' : 'Active'}`}
                                >
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-colors duration-300 ${r.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {r.active ? 'Active' : 'Inactive'}
                                  </span>
                                  <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ${r.active ? 'bg-green-500' : 'bg-zinc-300'}`}>
                                    <motion.div
                                      layout
                                      transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                      className="bg-white w-3 h-3 rounded-full shadow-md"
                                      animate={{ x: r.active ? 12 : 0 }}
                                    />
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => handleToggleRestaurantFeatured(r)}
                                  className="flex items-center gap-1 focus:outline-none group cursor-pointer"
                                  title={`Click to mark as ${r.featured ? 'Standard' : 'Featured'}`}
                                >
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-colors duration-300 ${r.featured ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {r.featured ? 'Featured' : 'Standard'}
                                  </span>
                                  <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ${r.featured ? 'bg-amber-500' : 'bg-zinc-300'}`}>
                                    <motion.div
                                      layout
                                      transition={{ type: "spring", stiffness: 700, damping: 30 }}
                                      className="bg-white w-3 h-3 rounded-full shadow-md"
                                      animate={{ x: r.featured ? 12 : 0 }}
                                    />
                                  </div>
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-[10px] text-brand-text-sec font-medium border-t border-brand-card/50 pt-2.5">
                              <div className="flex items-center gap-1.5">
                                <Phone size={11} className="text-brand-accent shrink-0" />
                                <span>{r.phone || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin size={11} className="text-brand-accent shrink-0" />
                                <span className="truncate">{r.address || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={11} className="text-brand-accent shrink-0" />
                                <span>{r.deliveryTime || '25-35 mins'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Database size={11} className="text-brand-accent shrink-0" />
                                <span className="font-bold text-brand-text">{itemCount} items in active menu</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="bg-brand-bg text-brand-text-sec px-1.5 py-0.5 rounded border border-brand-card text-[9px] font-mono">Lat: {r.latitude !== undefined ? r.latitude : '25.0143'}</span>
                                <span className="bg-brand-bg text-brand-text-sec px-1.5 py-0.5 rounded border border-brand-card text-[9px] font-mono">Lng: {r.longitude !== undefined ? r.longitude : '84.6784'}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-brand-card/50">
                              <button
                                onClick={() => {
                                  setEditingRestaurant(r);
                                  setNewRestName(r.name);
                                  setNewRestPhone(r.phone || '');
                                  setNewRestAddress(r.address || '');
                                  setNewRestCuisine(r.cuisine || '');
                                  setNewRestImage(r.image || '');
                                  setNewRestRating(String(r.rating || '4.5'));
                                  setNewRestDeliveryTime(r.deliveryTime || '25-35 mins');
                                  setNewRestActive(!!r.active);
                                  setNewRestFeatured(!!r.featured);
                                  setNewRestLatitude(String(r.latitude !== undefined ? r.latitude : '25.0143'));
                                  setNewRestLongitude(String(r.longitude !== undefined ? r.longitude : '84.6784'));
                                  setNewRestUsername(r.username || '');
                                  setNewRestLogin(r.login || '');
                                  setNewRestPassword(r.password || '');
                                  setNewRestIsClosed(!!r.isClosed);
                                  setNewRestOpeningTime(r.openingTime || '11:00 AM');
                                  setNewRestClosingTime(r.closingTime || '11:00 PM');
                                  setNewRestClosedMessage(r.closedMessage || 'We are currently closed. Please check back during our opening hours!');
                                  setShowAddRestaurantModal(true);
                                }}
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-200/50 transition-colors cursor-pointer text-center"
                              >
                                Edit Info
                              </button>
                              <button
                                onClick={() => handleDeleteRestaurant(r.id, r.name)}
                                className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold border border-red-200/50 transition-colors cursor-pointer text-center"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setSelectedRestaurantId(selectedRestaurantId === r.id ? null : r.id)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center ${selectedRestaurantId === r.id ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-bg hover:bg-brand-card/45 text-brand-text border-brand-card'}`}
                              >
                                {selectedRestaurantId === r.id ? 'Close Menu' : 'Manage Menu'}
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedZoneRestaurant(r);
                                setZoneRadius(r.deliveryRadius || 5);
                                setZoneLat(r.latitude || 25.0143);
                                setZoneLon(r.longitude || 84.6784);
                                setTestAddressResult(null);
                                setTestAddressQuery('');
                                setShowZoneCalculatorModal(true);
                              }}
                              className="hidden"
                            >
                              <MapPin size={11} className="animate-pulse text-emerald-600" />
                              Delivery Zone Radius ({r.deliveryRadius || 5} km)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Focused Restaurant Menu Section */}
                  {selectedRestaurantId && (() => {
                    const activeRest = restaurants.find(r => r.id === selectedRestaurantId);
                    if (!activeRest) return null;
                    const restItems = menuItems.filter(item => (item.restaurantId === selectedRestaurantId || (!item.restaurantId && selectedRestaurantId === 'rest1')));

                    // Group restItems by categories, including custom ones and a dedicated ArwalEats Specials section
                    const specialItems = restItems.filter(item => item.featured || (item.category && (item.category.toLowerCase() === 'arwal eats special' || item.category.toLowerCase() === 'arwal eat special')));
                    const dynamicCats = getActiveCategories();
                    
                    const menuSections: { category: string; displayName: string; items: MenuItem[] }[] = [];
                    
                    if (specialItems.length > 0) {
                      menuSections.push({
                        category: 'ArwalEats Special',
                        displayName: '★ ArwalEats Specials',
                        items: specialItems
                      });
                    }
                    
                    dynamicCats.forEach(cat => {
                      const sectionItems = restItems.filter(item => item.category && item.category.toLowerCase() === cat.category.toLowerCase());
                      if (sectionItems.length > 0) {
                        menuSections.push({
                          category: cat.category,
                          displayName: cat.displayName,
                          items: sectionItems
                        });
                      }
                    });

                    return (
                      <div className="bg-white p-6 rounded-2xl border border-brand-card shadow-sm space-y-6 animate-fadeIn mt-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-card/50 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-md uppercase">Menu Controller</span>
                              <h4 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">{activeRest.name} Menu Sections</h4>
                            </div>
                            <p className="text-[10px] text-brand-text-sec font-semibold mt-0.5">Customize dishes, availability, and specific category sections for this outlet</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                setNewItemRestaurantId(selectedRestaurantId);
                                setShowAddMenuModal(true);
                              }}
                              className="px-3.5 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Plus size={13} />
                              Add Food Option
                            </button>
                            <button
                              onClick={() => setSelectedRestaurantId(null)}
                              className="px-3.5 py-2 bg-brand-bg hover:bg-brand-card/45 text-brand-text border border-brand-card text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Close Focused View
                            </button>
                          </div>
                        </div>

                        {menuSections.length === 0 ? (
                          <div className="py-12 text-center bg-brand-bg rounded-2xl border border-dashed border-brand-card">
                            <Database size={24} className="mx-auto text-brand-text-sec mb-2" />
                            <h5 className="font-bold text-xs text-brand-text">No Menu Items Found</h5>
                            <p className="text-[10px] text-brand-text-sec max-w-xs mx-auto mt-1">This restaurant outlet doesn't have any dishes assigned to its menu. Click "Add Food Option" to create one!</p>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {menuSections.map((section) => (
                              <div key={section.category} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-brand-card/30 pb-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand-accent"></span>
                                  <h5 className="font-display font-black text-xs text-brand-text uppercase tracking-wider">{section.displayName} Section ({section.items.length} items)</h5>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {section.items.map((item) => (
                                    <div key={item.id} className="flex gap-3 bg-brand-bg/40 p-3 rounded-xl border border-brand-card hover:bg-brand-bg transition-all">
                                      <img src={item.image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=100&auto=format&fit=crop&q=60'} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-brand-card/50" />
                                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between gap-2">
                                            <h6 className="font-bold text-xs text-brand-text truncate">{item.name}</h6>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${item.dietType === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {item.dietType === 'veg' ? 'Veg' : 'Non-Veg'}
                                            </span>
                                          </div>
                                          <p className="text-[9px] text-brand-text-sec line-clamp-1 mt-0.5">{item.description || 'No description provided.'}</p>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-2">
                                          <span className="font-mono font-black text-xs text-brand-accent">₹{item.price}</span>
                                          
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleToggleAvailability(item)}
                                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-colors cursor-pointer ${item.available ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'}`}
                                            >
                                              {item.available ? 'In Stock' : 'Out of Stock'}
                                            </button>
                                            <button
                                              onClick={() => handleToggleFeatured(item)}
                                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-colors cursor-pointer ${item.featured ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:bg-zinc-200'}`}
                                              title={item.featured ? "Remove from ArwalEats Specials" : "Add to ArwalEats Specials"}
                                            >
                                              {item.featured ? '★ Special' : 'Standard'}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingMenuItem(item);
                                                setNewItemName(item.name);
                                                setNewItemCategory(item.category);
                                                setNewItemVariant(item.variant || '');
                                                setNewItemPrice(String(item.price || ''));
                                                setNewItemProfitMargin(String(item.profitMargin || '30'));
                                                setNewItemImage(item.image || '');
                                                setNewItemFeatured(!!item.featured);
                                                setNewItemDietType(getDietType(item));
                                                setNewItemDescription(item.description || '');
                                                setNewItemRestaurantId(item.restaurantId || 'rest1');
                                                setShowAddMenuModal(true);
                                              }}
                                              className="p-1 bg-blue-50 border border-blue-200 text-blue-500 rounded hover:bg-blue-100 cursor-pointer"
                                              title="Edit Dish"
                                            >
                                              <Edit size={10} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteMenuItem(item.id, item.name)}
                                              className="p-1 bg-red-50 border border-red-200 text-red-500 rounded hover:bg-red-100 cursor-pointer"
                                              title="Delete Dish"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 6: CUSTOMER INQUIRIES */}
              {activeTab === 'messages' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white p-4 rounded-xl border border-brand-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Inbox Inquiries ({contactMessages.length} messages)</h3>
                      <p className="text-[10px] text-brand-text-sec font-semibold">Review user feedback and direct operational inquiries</p>
                    </div>
                    {contactMessages.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete all messages?')) {
                            localStorage.setItem('arwaleats_contact_messages', '[]');
                            setContactMessages([]);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        Clear All Messages
                      </button>
                    )}
                  </div>

                  {contactMessages.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-brand-card shadow-sm p-12 text-center space-y-4">
                      <div className="h-16 w-16 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <MessageSquare size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">Your Inbox is Clear!</h4>
                        <p className="text-xs text-brand-text-sec font-semibold max-w-sm mx-auto">
                          No customer inquiries or feedback are currently registered in the database.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {contactMessages.map((msg: any) => (
                        <div key={msg.id} className="bg-white rounded-2xl border border-brand-card shadow-sm p-5 space-y-4 flex flex-col justify-between hover:border-brand-accent/40 transition-all duration-300">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <h4 className="font-display font-black text-xs text-brand-text uppercase tracking-wide">{msg.name}</h4>
                                <a href={`mailto:${msg.email}`} className="text-[11px] text-brand-accent font-bold hover:underline">
                                  {msg.email}
                                </a>
                              </div>
                              <span className="text-[9px] font-bold text-brand-text-sec bg-brand-bg-sec border border-brand-card/40 px-2.5 py-1 rounded-full">
                                {new Date(msg.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <div className="border-t border-brand-card/30 pt-3">
                              <p className="text-[10px] font-black text-brand-text uppercase tracking-wider mb-1">
                                Subject: <span className="text-brand-accent normal-case font-bold">{msg.subject || 'No Subject'}</span>
                              </p>
                              <div className="bg-brand-bg p-3.5 rounded-xl border border-brand-card/50 text-[11px] font-bold leading-relaxed text-brand-text font-sans whitespace-pre-wrap">
                                "{msg.message}"
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2.5 border-t border-brand-card/30 pt-3">
                            <a
                              href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'Your Inquiry to ArwalEats')}`}
                              className="flex-1 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-black rounded-xl text-center shadow-md shadow-brand-accent/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Mail size={13} />
                              Reply via Email
                            </a>
                            <button
                              onClick={async () => {
                                await deleteContactMessage(msg.id);
                                const updated = await getContactMessages();
                                setContactMessages(updated);
                              }}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: REVIEWS MANAGER */}
              {activeTab === 'reviews' && (() => {
                const totalCount = reviews.length;
                const avgRating = totalCount > 0 
                  ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1) 
                  : '0.0';

                const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
                  const count = reviews.filter(r => r.rating === stars).length;
                  const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                  return { stars, count, percentage };
                });

                const filteredReviews = reviews.filter(r => {
                  const matchesSearch = r.name.toLowerCase().includes(reviewSearch.toLowerCase()) || 
                                        r.feedback.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                                        (r.address && r.address.toLowerCase().includes(reviewSearch.toLowerCase()));
                  const matchesRating = reviewRatingFilter === 'all' || r.rating === reviewRatingFilter;
                  return matchesSearch && matchesRating;
                });

                const handleSeedReviews = () => {
                  const demoReviews = [
                    {
                      customerId: 'CUST_D1',
                      name: 'Rohan Sharma',
                      address: 'Bariatu Road, Arwal',
                      rating: 5,
                      feedback: 'Absolutely stellar chicken biryani! The spices are perfectly balanced and the food arrived piping hot. Will definitely order again.'
                    },
                    {
                      customerId: 'CUST_D2',
                      name: 'Meera Kumari',
                      address: 'Lalpur Circle, Arwal',
                      rating: 4,
                      feedback: 'Great service and quick delivery. The double cheese burger was extremely juicy, but the fries could have been a bit crispier.'
                    },
                    {
                      customerId: 'CUST_D3',
                      name: 'Amit Verma',
                      address: 'Kanke Area, Arwal',
                      rating: 2,
                      feedback: 'Delivery was slightly delayed and the butter naan was a bit cold. The paneer butter masala tasted good though.'
                    }
                  ];
                  
                  Promise.all(demoReviews.map(r => saveCustomerReview(r))).then(async () => {
                    const updated = await getCustomerReviews();
                    setReviews(updated);
                    triggerNotification('✨ Seeded 3 High Quality Sample Reviews!', 'info');
                  });
                };

                const handleDeleteReview = async (id: string) => {
                  await deleteCustomerReview(id);
                  const updated = await getCustomerReviews();
                  setReviews(updated);
                  setConfirmingDeleteReviewId(null);
                  triggerNotification('🗑️ Customer review deleted successfully', 'info');
                };

                const handleClearAllReviews = () => {
                  localStorage.setItem('arwaleats_customer_reviews', '[]');
                  setReviews([]);
                  setConfirmingClearAllReviews(false);
                  triggerNotification('💥 All customer reviews cleared!', 'info');
                };

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Analytics Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Overall Avg Score */}
                      <div className="bg-white border border-brand-card shadow-sm rounded-2xl p-6 flex flex-col justify-between space-y-4">
                        <div>
                          <h4 className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Overall Rating Score</h4>
                          <p className="text-[11px] text-brand-text-sec font-semibold mt-0.5">Based on all published customer feedback</p>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-display font-black text-5xl text-brand-text">{avgRating}</span>
                          <span className="text-sm font-black text-brand-text-sec">/ 5.0</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-brand-warning">
                          {[...Array(5)].map((_, i) => {
                            const starValue = i + 1;
                            const isFilled = starValue <= Math.round(Number(avgRating));
                            return (
                              <Star 
                                key={i} 
                                size={20} 
                                className={`${isFilled ? 'fill-brand-warning text-brand-warning' : 'text-brand-card'}`} 
                              />
                            );
                          })}
                          <span className="ml-2 text-xs font-black text-brand-text">({totalCount} reviews)</span>
                        </div>
                      </div>

                      {/* Right 2/3: Distribution Bars */}
                      <div className="bg-white border border-brand-card shadow-sm rounded-2xl p-6 lg:col-span-2 space-y-4">
                        <div>
                          <h4 className="text-[10px] text-brand-text-sec font-black uppercase tracking-wider">Rating Distribution Breakdown</h4>
                          <p className="text-[11px] text-brand-text-sec font-semibold mt-0.5">Distribution of reviews by stars</p>
                        </div>
                        <div className="space-y-2">
                          {ratingDistribution.map(({ stars, count, percentage }) => (
                            <div key={stars} className="flex items-center gap-3">
                              <span className="text-xs font-black text-brand-text w-10 flex items-center gap-1 shrink-0">
                                {stars} <Star size={12} className="fill-brand-warning text-brand-warning inline-block" />
                              </span>
                              <div className="flex-1 bg-brand-bg-sec rounded-full h-2.5 overflow-hidden border border-brand-card/20">
                                <div 
                                  className="bg-brand-warning h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-brand-text-sec w-12 text-right shrink-0">
                                {count} ({Math.round(percentage)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Filter & Action Panel */}
                    <div className="bg-white p-5 rounded-2xl border border-brand-card shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-brand-text">Manage Customer Reviews ({filteredReviews.length} shown)</h3>
                          <p className="text-[10px] text-brand-text-sec font-semibold">Search, moderate, filter or clear user reviews live</p>
                        </div>
                        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleSeedReviews}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>🌱 Seed Demo Reviews</span>
                          </button>
                          {totalCount > 0 && (
                            confirmingClearAllReviews ? (
                              <div className="flex items-center gap-2 bg-red-50 p-1 border border-red-200 rounded-xl animate-fadeIn">
                                <span className="text-[9px] font-black uppercase text-red-600 px-1">Are you sure?</span>
                                <button
                                  type="button"
                                  onClick={handleClearAllReviews}
                                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer"
                                >
                                  Yes, Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingClearAllReviews(false)}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-black uppercase rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingClearAllReviews(true)}
                                className="flex-1 sm:flex-none px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Clear All</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1.5">
                        {/* Search field */}
                        <div className="relative md:col-span-2">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-sec" />
                          <input
                            type="text"
                            placeholder="Search by customer name, address or review feedback text..."
                            value={reviewSearch}
                            onChange={(e) => setReviewSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 placeholder-brand-text-sec/60 text-brand-text"
                          />
                          {reviewSearch && (
                            <button
                              type="button"
                              onClick={() => setReviewSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-accent uppercase tracking-widest hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Rating Filter Dropdown */}
                        <div>
                          <select
                            value={reviewRatingFilter}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReviewRatingFilter(val === 'all' ? 'all' : Number(val));
                            }}
                            className="w-full px-3.5 py-2.5 text-xs font-black border border-brand-card rounded-xl bg-[#FFFDF9] text-brand-text focus:outline-none"
                          >
                            <option value="all">⭐ Filter by: All Ratings</option>
                            <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                            <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                            <option value="3">⭐⭐⭐ 3 Stars</option>
                            <option value="2">⭐⭐ 2 Stars</option>
                            <option value="1">⭐ 1 Star</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Review List */}
                    {filteredReviews.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-brand-card shadow-sm p-12 text-center space-y-4">
                        <div className="h-16 w-16 bg-brand-card/30 text-brand-text-sec rounded-full flex items-center justify-center mx-auto shadow-inner text-2xl">
                          ⭐
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">No Reviews Found</h4>
                          <p className="text-xs text-brand-text-sec font-semibold max-w-sm mx-auto leading-relaxed">
                            {reviews.length === 0 
                              ? "There are currently no reviews in the database. Use the 'Seed Demo Reviews' button above to add sample ratings or wait for new orders."
                              : "No reviews match your current search queries or star rating filters. Try resetting the criteria."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReviews.map((rev: any) => (
                          <div key={rev.id} className="bg-white rounded-2xl border border-brand-card shadow-sm p-5 space-y-4 flex flex-col justify-between hover:border-brand-accent/40 transition-all duration-300">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-0.5 text-brand-warning">
                                    {[...Array(5)].map((_, idx) => (
                                      <Star 
                                        key={idx} 
                                        size={13} 
                                        className={`${idx < rev.rating ? 'fill-brand-warning text-brand-warning' : 'text-brand-card'}`} 
                                      />
                                    ))}
                                  </div>
                                  <h4 className="font-display font-black text-xs text-brand-text uppercase tracking-wide mt-1">{rev.name}</h4>
                                  <p className="text-[10px] text-brand-text-sec font-bold flex items-center gap-1">
                                    📍 {rev.address || 'Arwal Customer'}
                                  </p>
                                </div>
                                <span className="text-[9px] font-bold text-brand-text-sec bg-brand-bg-sec border border-brand-card/40 px-2.5 py-1 rounded-full shrink-0">
                                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'Just Now'}
                                </span>
                              </div>

                              <div className="border-t border-brand-card/30 pt-3">
                                <div className="bg-brand-bg p-3.5 rounded-xl border border-brand-card/50 text-[11px] font-bold leading-relaxed text-brand-text font-sans italic">
                                  "{rev.feedback}"
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-brand-card/30 pt-3">
                              <span className="text-[9px] font-black text-brand-text-sec uppercase tracking-widest font-mono">
                                ID: {rev.id}
                              </span>
                              {confirmingDeleteReviewId === rev.id ? (
                                <div className="flex items-center gap-1.5 animate-fadeIn">
                                  <span className="text-[9px] font-black text-red-600 uppercase tracking-wider">Confirm?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteReviewId(null)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-black uppercase rounded-lg cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteReviewId(rev.id)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Delete Customer Review"
                                 >
                                   <Trash2 size={12} />
                                   Delete
                                 </button>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 );
               })()}

              {/* TAB: CUSTOMER ALERTS CAMPAIGNS */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-brand-card shadow-sm p-6">
                    <div className="flex items-center justify-between border-b border-brand-card/50 pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent animate-pulse">
                          <Bell size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-brand-text uppercase tracking-wider">
                            {editingAlertId ? '📝 Edit Customer Alert' : '📢 Create Customer Alert'}
                          </h3>
                          <p className="text-xs text-brand-text-sec font-semibold">
                            {editingAlertId 
                              ? 'Modify this scheduled alert. It will update instantly in real time on customer dashboards.' 
                              : 'Broadcast hot offers, important announcements, maintenance schedules, or critical news in real time.'}
                          </p>
                        </div>
                      </div>

                      {editingAlertId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAlertId(null);
                            setCampaignTitle('');
                            setCampaignMessage('');
                            setCampaignType('Offer');
                            setCampaignTargetAudience('All Customers');
                            setCampaignStartDate(new Date().toISOString().split('T')[0]);
                            const d = new Date();
                            d.setDate(d.getDate() + 30);
                            setCampaignEndDate(d.toISOString().split('T')[0]);
                            setCampaignPriority('Medium');
                            setCampaignIsActive(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!campaignTitle.trim() || !campaignMessage.trim()) {
                          setCampaignStatus('⚠️ Please fill in all fields before submitting.');
                          return;
                        }
                        
                        setIsLoadingAlerts(true);
                        try {
                          const payload: Partial<CustomNotification> = {
                            alertId: editingAlertId || undefined,
                            title: campaignTitle.trim(),
                            message: campaignMessage.trim(),
                            type: campaignType,
                            targetAudience: campaignTargetAudience.trim(),
                            startDate: campaignStartDate,
                            endDate: campaignEndDate,
                            priority: campaignPriority,
                            isActive: campaignIsActive,
                            createdBy: adminUser?.username || 'Admin',
                            createdAt: editingAlertId 
                              ? (customNotifications.find(n => n.alertId === editingAlertId || n.id === editingAlertId)?.createdAt || new Date().toISOString())
                              : new Date().toISOString()
                          };

                          await saveCustomNotification(payload);
                          
                          setCampaignTitle('');
                          setCampaignMessage('');
                          setCampaignType('Offer');
                          setCampaignTargetAudience('All Customers');
                          setCampaignStartDate(new Date().toISOString().split('T')[0]);
                          const d = new Date();
                          d.setDate(d.getDate() + 30);
                          setCampaignEndDate(d.toISOString().split('T')[0]);
                          setCampaignPriority('Medium');
                          setCampaignIsActive(true);
                          setEditingAlertId(null);

                          setCampaignStatus(editingAlertId ? '🎉 Alert updated successfully!' : '🚀 Alert campaign created and synchronized successfully!');
                          setCustomNotificationsList(await getCustomNotifications());
                        } catch (err) {
                          setCampaignStatus('❌ Failed to save alert. Please try again.');
                          console.error(err);
                        } finally {
                          setIsLoadingAlerts(false);
                          setTimeout(() => setCampaignStatus(null), 5000);
                        }
                      }}
                      className="space-y-4"
                    >
                      {campaignStatus && (
                        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          campaignStatus.includes('successfully') 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-fadeIn' 
                            : 'bg-red-50 text-red-800 border-red-200 animate-fadeIn'
                        }`}>
                          <CheckCircle2 size={16} />
                          <span>{campaignStatus}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Alert Title</label>
                          <input 
                            type="text"
                            placeholder="e.g., Flat 50% Off this Weekend! 🏷️"
                            value={campaignTitle}
                            onChange={(e) => setCampaignTitle(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 placeholder-brand-text-sec/55 text-brand-text"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Alert Category / Type</label>
                          <select 
                            value={campaignType}
                            onChange={(e) => setCampaignType(e.target.value as any)}
                            className="w-full px-3 py-2.5 text-xs font-black border border-brand-card rounded-xl bg-[#FFFDF9] text-brand-text focus:outline-none"
                          >
                            <option value="Offer">🏷️ Offer / Coupon Discount</option>
                            <option value="Announcement">📢 General Announcement</option>
                            <option value="Maintenance">🛠️ Maintenance Notice</option>
                            <option value="Information">ℹ️ Information Broadcast</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Target Audience</label>
                          <input 
                            type="text"
                            placeholder="e.g., All Customers, or VIP Users"
                            value={campaignTargetAudience}
                            onChange={(e) => setCampaignTargetAudience(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 text-brand-text"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Start Date (Scheduling)</label>
                          <input 
                            type="date"
                            value={campaignStartDate}
                            onChange={(e) => setCampaignStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 text-brand-text"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">End Date (Scheduling)</label>
                          <input 
                            type="date"
                            value={campaignEndDate}
                            onChange={(e) => setCampaignEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 text-brand-text"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-brand-text uppercase tracking-wider font-mono">Priority Level</label>
                          <div className="flex gap-4">
                            {['Low', 'Medium', 'High'].map((p) => (
                              <label key={p} className="flex items-center gap-1.5 text-xs font-bold text-brand-text cursor-pointer">
                                <input
                                  type="radio"
                                  name="priority"
                                  value={p}
                                  checked={campaignPriority === p}
                                  onChange={(e) => setCampaignPriority(e.target.value as any)}
                                  className="accent-brand-accent"
                                />
                                <span>{p === 'Low' ? '⚪ Low' : p === 'Medium' ? '🟡 Medium' : '🔴 High'}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center md:justify-end">
                          <label className="flex items-center gap-2.5 cursor-pointer mt-4 md:mt-0 select-none">
                            <input 
                              type="checkbox"
                              checked={campaignIsActive}
                              onChange={(e) => setCampaignIsActive(e.target.checked)}
                              className="h-4 w-4 rounded border-brand-card text-brand-accent focus:ring-brand-accent focus:ring-opacity-50 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-brand-text uppercase tracking-wider">Set Active Immediately</span>
                              <span className="text-[10px] text-brand-text-sec font-semibold">Toggle off to save as a draft/inactive.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Notification Alert Message</label>
                        <textarea 
                          rows={3}
                          placeholder="Compose alert message body here..."
                          value={campaignMessage}
                          onChange={(e) => setCampaignMessage(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs font-bold border border-brand-card rounded-xl bg-[#FFFDF9] focus:outline-none focus:border-brand-accent/60 placeholder-brand-text-sec/55 text-brand-text"
                          required
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isLoadingAlerts}
                          className="px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Bell size={14} className={isLoadingAlerts ? "animate-spin" : "animate-bounce"} />
                          <span>{editingAlertId ? 'Update Scheduled Alert' : 'Publish Scheduled Alert'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Campaigns List */}
                  <div className="bg-white rounded-2xl border border-brand-card shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-card/30 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-brand-text uppercase tracking-wider">Alerts Dispatch Registry</h3>
                        <p className="text-xs text-brand-text-sec font-semibold">All active, scheduled, or inactive notifications managed directly in Google Sheets.</p>
                      </div>
                      
                      {isLoadingAlerts && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-accent">
                          <div className="h-3 w-3 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
                          <span>Synchronizing...</span>
                        </div>
                      )}
                    </div>

                    {customNotifications.length === 0 ? (
                      <div className="p-12 border-2 border-dashed border-brand-card/60 rounded-xl text-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-brand-bg flex items-center justify-center mx-auto text-brand-text-sec text-lg">📢</div>
                        <div>
                          <p className="text-xs font-black text-brand-text">No Customer Alerts Dispatched Yet</p>
                          <p className="text-[10px] text-brand-text-sec font-bold mt-1">Fill the form above to dispatch your very first push notification campaign.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-brand-card/30 space-y-4">
                        {customNotifications.map((notif) => {
                          const isCurrentlyActive = notif.isActive;
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const start = notif.startDate ? new Date(notif.startDate) : null;
                          const end = notif.endDate ? new Date(notif.endDate) : null;
                          if (start) start.setHours(0,0,0,0);
                          if (end) end.setHours(0,0,0,0);
                          
                          const withinDateRange = (!start || today >= start) && (!end || today <= end);
                          const isShowingNow = isCurrentlyActive && withinDateRange;

                          return (
                            <div key={notif.alertId || notif.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-grow">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11.5px] font-black text-brand-text">{notif.title}</span>
                                  
                                  {/* Type Badge */}
                                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                    notif.type === 'Offer' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200/50' 
                                      : notif.type === 'Announcement'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200/50'
                                      : notif.type === 'Maintenance'
                                      ? 'bg-red-50 text-red-700 border-red-200/50'
                                      : 'bg-blue-50 text-blue-700 border-blue-200/50'
                                  }`}>
                                    {notif.type === 'Offer' ? '🏷️ Offer' : notif.type === 'Announcement' ? '📢 Announcement' : notif.type === 'Maintenance' ? '🛠️ Maintenance' : 'ℹ️ Info'}
                                  </span>

                                  {/* Priority Badge */}
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                    notif.priority === 'High' 
                                      ? 'bg-red-100 text-red-800 border-red-300' 
                                      : notif.priority === 'Medium'
                                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}>
                                    {notif.priority || 'Medium'} Priority
                                  </span>

                                  {/* Live Delivery Status Indicator */}
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                                    isShowingNow 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                                      : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isShowingNow ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                    {isShowingNow ? 'Live on App' : 'Offline / Hidden'}
                                  </span>
                                </div>

                                <p className="text-xs text-brand-text-sec font-medium leading-relaxed max-w-3xl">
                                  {notif.message}
                                </p>

                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-brand-text-sec font-bold font-mono">
                                  <span className="flex items-center gap-1">
                                    📅 Schedule: {notif.startDate || 'Anytime'} to {notif.endDate || 'Anytime'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    👥 Audience: {notif.targetAudience || 'All Customers'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ✍️ By: {notif.createdBy || 'Admin'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    🕒 Created: {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {/* Toggle Enable / Disable */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsLoadingAlerts(true);
                                    await saveCustomNotification({
                                      ...notif,
                                      isActive: !notif.isActive
                                    });
                                    setCustomNotificationsList(await getCustomNotifications());
                                    setIsLoadingAlerts(false);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border flex items-center gap-1 cursor-pointer ${
                                    notif.isActive 
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                  title={notif.isActive ? 'Disable Alert' : 'Enable Alert'}
                                >
                                  {notif.isActive ? 'Disable' : 'Enable'}
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAlertId(notif.alertId || notif.id);
                                    setCampaignTitle(notif.title);
                                    setCampaignMessage(notif.message);
                                    setCampaignType(notif.type);
                                    setCampaignTargetAudience(notif.targetAudience);
                                    setCampaignStartDate(notif.startDate || new Date().toISOString().split('T')[0]);
                                    setCampaignEndDate(notif.endDate || new Date().toISOString().split('T')[0]);
                                    setCampaignPriority(notif.priority || 'Medium');
                                    setCampaignIsActive(notif.isActive);
                                    
                                    // Scroll to the form section smoothly
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Edit scheduled alert"
                                >
                                  Edit
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to permanently delete this scheduled customer alert?')) {
                                      setIsLoadingAlerts(true);
                                      await deleteCustomNotification(notif.alertId || notif.id);
                                      setCustomNotificationsList(await getCustomNotifications());
                                      setIsLoadingAlerts(false);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Permanently Delete Alert"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL WINDOWS FOR INTERACTIVITY */}
      
      {/* 1. ORDER DETAIL VIEW MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-brand-card/50 pb-4">
                <div>
                  <p className="text-[9px] text-brand-text-sec font-black uppercase tracking-wider">Active Order Registry ID</p>
                  <h3 className="font-mono text-lg font-black text-brand-text">{selectedOrder.orderId}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] text-brand-text-sec font-bold uppercase tracking-wider">From:</span>
                    {(() => {
                      const restName = selectedOrder.restaurantName;
                      const restId = selectedOrder.restaurantId;
                      if (restName) {
                        return (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                            <Store size={10} className="shrink-0 text-amber-500" />
                            {restName}
                          </span>
                        );
                      }
                      if (restId) {
                        const r = restaurants.find(res => res.id === restId);
                        if (r) {
                          return (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                              <Store size={10} className="shrink-0 text-amber-500" />
                              {r.name}
                            </span>
                          );
                        }
                      }
                      return (
                        <span className="inline-flex items-center gap-1 bg-zinc-50 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                          Unknown
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 border border-brand-card rounded-lg hover:bg-brand-card shrink-0">
                  <X size={15} />
                </button>
              </div>

              {/* Grid content breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Customer and Delivery metadata */}
                <div className="space-y-4">
                  <div className="bg-brand-bg-sec/50 border border-brand-card rounded-xl p-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Recipient Details</h4>
                    <p className="font-bold">{selectedOrder.customerName}</p>
                    <p className="text-brand-text-sec font-semibold flex items-center gap-1">
                      <Phone size={12} /> {selectedOrder.phone}
                    </p>
                    <p className="text-brand-text-sec font-semibold flex items-center gap-1.5 leading-relaxed pt-1">
                      <MapPin size={14} className="shrink-0 text-brand-accent" />
                      <span>{selectedOrder.address}</span>
                    </p>
                    
                    {/* Live Shared GPS Coordinates & Directions Navigation */}
                    <div className="pt-2 border-t border-brand-card/40 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold text-slate-700">
                        <span>📍 Shared Map Coordinates:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-brand-accent">
                          {selectedOrder.customer_lat ? `${selectedOrder.customer_lat.toFixed(4)}, ${selectedOrder.customer_lng?.toFixed(4)}` : '25.0143, 84.6680'}
                        </span>
                      </div>
                      
                      {selectedOrder.distance_km !== undefined && (
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Driving Distance: <strong className="text-slate-900">{selectedOrder.distance_km} km</strong> • Zone: <strong className="text-brand-accent">{selectedOrder.delivery_zone || 'Arwal Local'}</strong>
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${selectedOrder.restaurant_lat || 25.0143},${selectedOrder.restaurant_lng || 84.6784}&destination=${selectedOrder.customer_lat || 25.0143},${selectedOrder.customer_lng || 84.6784}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Navigation size={14} />
                          <span>Google Maps</span>
                        </a>

                        {(() => {
                          const rawPhone = selectedOrder.phone || '';
                          const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
                          if (!cleanPhone) return null;
                          const waMsg = encodeURIComponent(`Hello ${selectedOrder.customerName || 'Customer'}! Greetings from ArwalEats. Regarding your Order #${selectedOrder.orderId} (Status: ${selectedOrder.status})...`);
                          return (
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${waMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <MessageSquare size={14} />
                              <span>WhatsApp Chat</span>
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-bg-sec/50 border border-brand-card rounded-xl p-4 space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Rider Allocation status</h4>
                    {selectedOrder.deliveryBoyName ? (
                      <div className="space-y-1.5">
                        <p className="font-bold flex items-center gap-1">
                          <Truck size={14} className="text-brand-accent shrink-0" />
                          <span>{selectedOrder.deliveryBoyName}</span>
                        </p>
                        <p className="text-[10px] text-brand-text-sec">Phone: {selectedOrder.deliveryBoyPhone} | Vehicle: {selectedOrder.vehicleNumber}</p>
                        <p className="text-[10px] text-brand-text-sec font-bold text-brand-success bg-brand-success/10 px-2 py-0.5 rounded-md border border-brand-success/20 w-max">
                          ETA: {selectedOrder.estimatedDeliveryTime}
                        </p>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-brand-text-sec font-bold">
                        <p className="text-[11px]">No Delivery Boy assigned yet.</p>
                        <button 
                          onClick={() => {
                            setAssigningRiderOrderId(selectedOrder.orderId);
                          }}
                          className="mt-2 px-3 py-1 bg-brand-accent text-white font-bold rounded-lg text-[10px] hover:bg-brand-accent-hover"
                        >
                          Allocate Delivery Partner
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill Breakdown Box */}
                <div className="bg-brand-bg border border-brand-card rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text flex items-center gap-1">
                      <FileText size={12} className="text-brand-accent" />
                      Cart Breakdown
                    </h4>
                    <div className="divide-y divide-brand-card/45 space-y-2">
                      {selectedOrder.items.map((i: any, idx: number) => {
                        const itemRestId = i.restaurantId || selectedOrder.restaurantId || 'rest1';
                        const itemRest = restaurants.find(r => r.id === itemRestId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-[11px] pt-2 first:pt-0">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-brand-text">{i.name}</span>
                                {itemRest && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide leading-none shrink-0">
                                    {itemRest.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-brand-text-sec">Variant: {i.variant} | x{i.qty}</p>
                            </div>
                            <span className="font-bold">₹{i.price * i.qty}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-brand-card/50 pt-2.5 space-y-1">
                    <div className="flex justify-between text-[11px] text-brand-text-sec">
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.subtotal}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-[11px] text-brand-success font-bold">
                        <span>Discount Coupon:</span>
                        <span>-₹{selectedOrder.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-brand-text-sec">
                      <span>Delivery Surcharge:</span>
                      <span>₹{selectedOrder.deliveryFee}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-brand-text border-t border-brand-card/50 pt-1.5">
                      <span>Total Invoice Payment:</span>
                      <span className="text-brand-accent">₹{selectedOrder.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order status tracking timeline controller */}
              <div className="bg-brand-card/25 border border-brand-card p-4 rounded-xl space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Operational Pipeline status update</h4>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Accepted')}
                    disabled={selectedOrder.status === 'Accepted'}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer ${
                      selectedOrder.status === 'Accepted' ? 'bg-zinc-300 text-zinc-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Accept Order
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Preparing')}
                    disabled={selectedOrder.status === 'Preparing'}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer ${
                      selectedOrder.status === 'Preparing' ? 'bg-zinc-300 text-zinc-500' : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    Set to Preparing
                  </button>

                  <button 
                    onClick={() => {
                      setAssigningRiderOrderId(selectedOrder.orderId);
                    }}
                    className="px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Assign Delivery Partner
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Delivered')}
                    disabled={selectedOrder.status === 'Delivered'}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer ${
                      selectedOrder.status === 'Delivered' ? 'bg-zinc-300 text-zinc-500' : 'bg-brand-success text-white hover:bg-[#00B045]'
                    }`}
                  >
                    Mark as Delivered
                  </button>

                  {/* WhatsApp Customer Button under Stages of Delivery */}
                  {(() => {
                    const rawPhone = selectedOrder.phone || '';
                    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
                    if (!cleanPhone) return null;
                    const waMsg = encodeURIComponent(`Hello ${selectedOrder.customerName || 'Customer'}! Greetings from ArwalEats. Updating you on your Order #${selectedOrder.orderId} (Current Stage: ${selectedOrder.status})...`);
                    return (
                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${waMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                        title="Chat with Customer on WhatsApp"
                      >
                        <MessageSquare size={12} />
                        <span>WhatsApp Customer</span>
                      </a>
                    );
                  })()}

                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Rejected')}
                    disabled={selectedOrder.status === 'Rejected'}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] ml-auto cursor-pointer ${
                      selectedOrder.status === 'Rejected' ? 'bg-zinc-300 text-zinc-500' : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    Reject Order
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Cancelled')}
                    disabled={selectedOrder.status === 'Cancelled'}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer ${
                      selectedOrder.status === 'Cancelled' ? 'bg-zinc-300 text-zinc-500' : 'bg-zinc-500 hover:bg-zinc-600 text-white'
                    }`}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

              {/* Utility actions: Print, close */}
              <div className="flex gap-2 justify-end pt-2 border-t border-brand-card/40">
                <button 
                  onClick={() => printInvoice(selectedOrder)}
                  className="px-4 py-2 bg-brand-bg hover:bg-brand-card text-brand-text border border-brand-card rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Receipt Bill</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DELIVERY BOY ASSIGNMENT MODAL */}
      <AnimatePresence>
        {assigningRiderOrderId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-brand-card/50 pb-3">
                <h3 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">Allocate Delivery Boy</h3>
                <button onClick={() => setAssigningRiderOrderId(null)} className="text-brand-text-sec hover:text-brand-accent">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAssignRider} className="space-y-4 text-xs">
                <div className="space-y-1 bg-brand-bg-sec/50 border border-brand-card rounded-xl p-2.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-brand-text-sec block mb-1.5">Quick Select Active Rider</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRiderName("Ujjwal");
                        setRiderPhone("8102123746");
                        setRiderVehicle("BR-26A-1111");
                      }}
                      className="flex-1 py-1.5 bg-white hover:bg-brand-accent/5 border border-brand-card hover:border-brand-accent rounded-lg font-bold text-[10px] text-brand-text flex items-center justify-center gap-1 transition-colors"
                    >
                      🏍️ Ujjwal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRiderName("Sarvjit");
                        setRiderPhone("8102123746");
                        setRiderVehicle("BR-26A-2222");
                      }}
                      className="flex-1 py-1.5 bg-white hover:bg-brand-accent/5 border border-brand-card hover:border-brand-accent rounded-lg font-bold text-[10px] text-brand-text flex items-center justify-center gap-1 transition-colors"
                    >
                      🏍️ Sarvjit
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Delivery Boy Name</label>
                  <input 
                    type="text" 
                    value={riderName}
                    onChange={e => setRiderName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Contact Phone Number</label>
                  <input 
                    type="text" 
                    value={riderPhone}
                    onChange={e => setRiderPhone(e.target.value)}
                    required
                    placeholder="e.g. +91 91223 88474"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Vehicle Registration Number</label>
                  <input 
                    type="text" 
                    value={riderVehicle}
                    onChange={e => setRiderVehicle(e.target.value)}
                    required
                    placeholder="e.g. BR-26A-4848"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Estimated Delivery ETA</label>
                  <input 
                    type="text" 
                    value={riderTime}
                    onChange={e => setRiderTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Rider Instruction Notes</label>
                  <textarea 
                    value={riderNotes}
                    onChange={e => setRiderNotes(e.target.value)}
                    placeholder="Instructions (Optional)"
                    rows={2}
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-black rounded-xl text-xs"
                >
                  Confirm Rider Assignment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. CUSTOMER DETAILS & ORDER HISTORY MODAL */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-card/50 pb-4">
                <div>
                  <p className="text-[9px] text-brand-text-sec font-black uppercase tracking-wider">Customer Registry Record</p>
                  <h3 className="font-display font-black text-lg text-brand-text">{selectedCustomer.name}</h3>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-brand-text-sec hover:text-brand-accent">
                  <X size={18} />
                </button>
              </div>

              {/* Stats overview banner */}
              <div className="grid grid-cols-3 gap-3 bg-brand-card/25 border border-brand-card p-4 rounded-xl text-center text-xs">
                <div>
                  <p className="text-[9px] text-brand-text-sec font-bold">Total Spent</p>
                  <p className="font-display font-black text-brand-accent text-sm mt-0.5">₹{selectedCustomer.totalSpending}</p>
                </div>
                <div>
                  <p className="text-[9px] text-brand-text-sec font-bold">Total Checkouts</p>
                  <p className="font-display font-black text-brand-text text-sm mt-0.5">{selectedCustomer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-[9px] text-brand-text-sec font-bold">Last Checkout Date</p>
                  <p className="font-bold text-[10px] text-brand-text mt-0.5">
                    {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString('en-IN') : 'None'}
                  </p>
                </div>
              </div>

              {/* Order history list */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Historical Checkouts</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {safeOrders.filter(o => o.customerId === selectedCustomer.customerId).length === 0 ? (
                    <p className="text-xs text-brand-text-sec italic text-center py-4">No order record history found.</p>
                  ) : (
                    safeOrders.filter(o => o.customerId === selectedCustomer.customerId).map(o => (
                      <div key={o.orderId} className="p-3 bg-brand-bg-sec/45 border border-brand-card rounded-xl flex items-center justify-between text-xs font-semibold">
                        <div>
                          <p className="font-mono font-black">{o.orderId}</p>
                          <p className="text-[10px] text-brand-text-sec">{new Date(o.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-accent">₹{o.total}</p>
                          <span className="text-[9px] font-black uppercase text-brand-success">{o.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-3 bg-brand-bg hover:bg-brand-card text-brand-text font-black border border-brand-card rounded-xl text-xs"
              >
                Close Customer Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ADD NEW MENU ITEM MODAL */}
      <AnimatePresence>
        {showAddMenuModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-card/50 pb-3">
                <h3 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">
                  {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h3>
                <button 
                  type="button"
                  onClick={() => { setShowAddMenuModal(false); setEditingMenuItem(null); }} 
                  className="text-brand-text-sec hover:text-brand-accent"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddMenuItem} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Dish Name</label>
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    required
                    placeholder="e.g. Special Arwal Chicken Biryani"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none font-sans"
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Restaurant Outlet</label>
                  <select
                    value={newItemRestaurantId}
                    onChange={e => setNewItemRestaurantId(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none font-sans"
                  >
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Food Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-brand-bg px-4 py-2 rounded-xl border border-brand-card font-bold select-none text-brand-text flex-1 justify-center">
                      <input
                        type="radio"
                        name="newItemDietType"
                        value="veg"
                        checked={newItemDietType === 'veg'}
                        onChange={() => setNewItemDietType('veg')}
                        className="text-green-600 focus:ring-green-600 h-3.5 w-3.5 rounded-full border-brand-card cursor-pointer"
                      />
                      <span className="flex items-center gap-1 text-[11px]">
                        <span className="h-2 w-2 rounded-full bg-green-600"></span>
                        Veg
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-brand-bg px-4 py-2 rounded-xl border border-brand-card font-bold select-none text-brand-text flex-1 justify-center">
                      <input
                        type="radio"
                        name="newItemDietType"
                        value="non-veg"
                        checked={newItemDietType === 'non-veg'}
                        onChange={() => setNewItemDietType('non-veg')}
                        className="text-red-600 focus:ring-red-600 h-3.5 w-3.5 rounded-full border-brand-card cursor-pointer"
                      />
                      <span className="flex items-center gap-1 text-[11px]">
                        <span className="h-2 w-2 rounded-full bg-red-600"></span>
                        Non-Veg
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Variants (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={newItemVariant}
                      onChange={e => setNewItemVariant(e.target.value)}
                      required
                      placeholder="Regular, Large"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Prices (Comma-separated matching variants)</label>
                    <input 
                      type="text" 
                      value={newItemPrice}
                      onChange={e => setNewItemPrice(e.target.value)}
                      required
                      placeholder="150, 250"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Profit Margin per Food Item (in Rupees ₹)</label>
                  <input 
                    type="text" 
                    value={newItemProfitMargin}
                    onChange={e => setNewItemProfitMargin(e.target.value)}
                    required
                    placeholder="e.g. 50, 80"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                  <p className="text-[9px] text-brand-text-sec italic">Enter absolute profit value in Rupees (e.g. 50) or comma-separated values matching variants (e.g. 50, 80).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Image URL</label>
                  <input 
                    type="url" 
                    value={newItemImage}
                    onChange={e => setNewItemImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                  <p className="text-[9px] text-brand-text-sec italic">Leave blank to use a fallback food illustration.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Short Description (Optional)</label>
                  <textarea 
                    value={newItemDescription}
                    onChange={e => setNewItemDescription(e.target.value)}
                    placeholder="Briefly describe ingredients or flavors (e.g. Rich in spices, prepared with basmati rice)..."
                    rows={2}
                    maxLength={150}
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none resize-none font-sans"
                    disabled={!!editingMenuItem}
                  />
                  <p className="text-[9px] text-brand-text-sec italic">A brief description shown to customers (max 150 characters).</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="newItemFeatured"
                    checked={newItemFeatured}
                    onChange={e => setNewItemFeatured(e.target.checked)}
                    className="rounded border-brand-card text-brand-accent focus:ring-brand-accent"
                  />
                  <label htmlFor="newItemFeatured" className="text-[10px] font-black uppercase text-brand-text select-none cursor-pointer">
                    Mark as 'ArwalEats Special' (Display on Home Page)
                  </label>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-brand-accent/20 cursor-pointer"
                >
                  {editingMenuItem ? 'Confirm Menu Update Dish' : 'Confirm Menu Add Dish'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DELETE MENU ITEM CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-sm w-full p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-brand-text">Confirm Deletion</h3>
                  <p className="text-[10px] text-brand-text-sec font-bold">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 bg-brand-bg border border-brand-card rounded-xl">
                <p className="text-[10px] text-brand-text font-black">
                  Are you sure you want to delete <span className="text-brand-accent">"{deletingItem.name}"</span> from the culinary menu?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="py-2.5 bg-brand-bg hover:bg-brand-card/30 border border-brand-card text-brand-text-sec font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMenuItem}
                  className="py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-md shadow-red-500/20 cursor-pointer transition-colors"
                >
                  Delete Dish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. CLEAR ALL MENU ITEMS CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmingClearAllMenuItems && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-sm w-full p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-brand-text">Clear Culinary Menu</h3>
                  <p className="text-[10px] text-brand-text-sec font-bold">This will wipe out the entire menu list.</p>
                </div>
              </div>

              <div className="p-3 bg-brand-bg border border-brand-card rounded-xl">
                <p className="text-[10px] text-brand-text font-black text-center">
                  Are you sure you want to <span className="text-red-500">delete all menu items</span>? This cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingClearAllMenuItems(false)}
                  className="py-2.5 bg-brand-bg hover:bg-brand-card/30 border border-brand-card text-brand-text-sec font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmClearAllMenuItems}
                  className="py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-md shadow-red-500/20 cursor-pointer transition-colors"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. ADD/EDIT RESTAURANT MODAL */}
      <AnimatePresence>
        {showAddRestaurantModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-card/50 pb-3">
                <h3 className="font-display font-black text-sm text-brand-text uppercase tracking-wider">
                  {editingRestaurant ? 'Edit Restaurant' : 'Register Restaurant'}
                </h3>
                <button 
                  type="button"
                  onClick={() => { setShowAddRestaurantModal(false); setEditingRestaurant(null); }} 
                  className="text-brand-text-sec hover:text-brand-accent cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveRestaurant} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Outlet Name</label>
                  <input 
                    type="text" 
                    value={newRestName}
                    onChange={e => setNewRestName(e.target.value)}
                    required
                    placeholder="e.g. Arwal Biryani House"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Cuisine / Specialties</label>
                  <input 
                    type="text" 
                    value={newRestCuisine}
                    onChange={e => setNewRestCuisine(e.target.value)}
                    required
                    placeholder="e.g. Biriyani, North Indian, Mughlai"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Phone</label>
                    <input 
                      type="text" 
                      value={newRestPhone}
                      onChange={e => setNewRestPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Delivery Time</label>
                    <input 
                      type="text" 
                      value={newRestDeliveryTime}
                      onChange={e => setNewRestDeliveryTime(e.target.value)}
                      required
                      placeholder="e.g. 25-35 mins"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Address</label>
                  <input 
                    type="text" 
                    value={newRestAddress}
                    onChange={e => setNewRestAddress(e.target.value)}
                    required
                    placeholder="e.g. Station Road, Near Block Office, Arwal"
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                {/* <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Restaurant Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={newRestLatitude}
                      onChange={e => setNewRestLatitude(e.target.value)}
                      placeholder="e.g. 25.0143"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Restaurant Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={newRestLongitude}
                      onChange={e => setNewRestLongitude(e.target.value)}
                      placeholder="e.g. 84.6784"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                </div> */}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Login</label>
                    <input 
                      type="text" 
                      value={newRestLogin}
                      onChange={e => setNewRestLogin(e.target.value)}
                      placeholder="e.g. login_alias"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Password</label>
                    <input 
                      type="password" 
                      value={newRestPassword}
                      onChange={e => setNewRestPassword(e.target.value)}
                      required
                      placeholder="********"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Rating</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1"
                      max="5"
                      value={newRestRating}
                      onChange={e => setNewRestRating(e.target.value)}
                      required
                      placeholder="e.g. 4.5"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Username</label>
                    <input 
                      type="text" 
                      value={newRestUsername}
                      onChange={e => setNewRestUsername(e.target.value)}
                      required
                      placeholder="e.g. restaurant_user"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Status</label>
                    <label className="flex items-center gap-2 cursor-pointer bg-brand-bg px-4 py-2 rounded-xl border border-brand-card font-bold select-none text-brand-text h-[38px] justify-center">
                      <input
                        type="checkbox"
                        checked={newRestActive}
                        onChange={e => setNewRestActive(e.target.checked)}
                        className="text-brand-accent focus:ring-brand-accent h-4 w-4 rounded border-brand-card cursor-pointer"
                      />
                      <span className="text-[11px]">Active</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Store Closed</label>
                    <label className="flex items-center gap-2 cursor-pointer bg-brand-bg px-4 py-2 rounded-xl border border-brand-card font-bold select-none text-brand-text h-[38px] justify-center">
                      <input
                        type="checkbox"
                        checked={newRestIsClosed}
                        onChange={e => setNewRestIsClosed(e.target.checked)}
                        className="text-red-500 focus:ring-red-500 h-4 w-4 rounded border-brand-card cursor-pointer"
                      />
                      <span className="text-[11px] text-red-600 font-bold">Closed</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Featured</label>
                    <label className="flex items-center gap-2 cursor-pointer bg-brand-bg px-4 py-2 rounded-xl border border-brand-card font-bold select-none text-brand-text h-[38px] justify-center">
                      <input
                        type="checkbox"
                        checked={newRestFeatured}
                        onChange={e => setNewRestFeatured(e.target.checked)}
                        className="text-amber-500 focus:ring-amber-500 h-4 w-4 rounded border-brand-card cursor-pointer"
                      />
                      <span className="text-[11px] text-amber-600 font-bold">Featured</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Opening Time</label>
                    <input 
                      type="text" 
                      value={newRestOpeningTime}
                      onChange={e => setNewRestOpeningTime(e.target.value)}
                      placeholder="e.g. 11:00 AM"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Closing Time</label>
                    <input 
                      type="text" 
                      value={newRestClosingTime}
                      onChange={e => setNewRestClosingTime(e.target.value)}
                      placeholder="e.g. 11:00 PM"
                      className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Closed Message</label>
                  <input 
                    type="text" 
                    value={newRestClosedMessage}
                    onChange={e => setNewRestClosedMessage(e.target.value)}
                    placeholder="We are currently closed."
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-brand-text-sec uppercase tracking-wider">Header Image URL</label>
                  <input 
                    type="url" 
                    value={newRestImage}
                    onChange={e => setNewRestImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-brand-card rounded-xl font-bold bg-brand-bg focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-brand-card/50">
                  <button
                    type="button"
                    onClick={() => { setShowAddRestaurantModal(false); setEditingRestaurant(null); }}
                    className="py-2.5 bg-brand-bg hover:bg-brand-card/35 border border-brand-card text-brand-text-sec font-black rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-black rounded-xl uppercase tracking-wider shadow-md shadow-brand-accent/20 cursor-pointer transition-colors"
                  >
                    {editingRestaurant ? 'Update Outlet' : 'Register Outlet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. DELETE RESTAURANT CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingRestaurant && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-55">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[18px] border border-brand-card max-w-sm w-full p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-brand-text">Confirm Deletion</h3>
                  <p className="text-[10px] text-brand-text-sec font-bold">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 bg-brand-bg border border-brand-card rounded-xl">
                <p className="text-[10px] text-brand-text font-black">
                  Are you sure you want to delete <span className="text-brand-accent">"{deletingRestaurant.name}"</span>? This will NOT delete its menu items, but they will be reassigned to the default outlet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingRestaurant(null)}
                  className="py-2.5 bg-brand-bg hover:bg-brand-card/30 border border-brand-card text-brand-text-sec font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRestaurant}
                  className="py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-md shadow-red-500/20 cursor-pointer transition-colors"
                >
                  Delete Outlet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. DELIVERY ZONE RADIUS CALCULATOR MODAL */}
      <AnimatePresence>
        {showZoneCalculatorModal && selectedZoneRestaurant && (() => {
          const DEFAULT_LANDMARKS = [
            { name: 'Koriam Border (North-East)', lat: 25.0480, lon: 84.6850, desc: 'Northern delivery limit border' },
            { name: 'Baidrabad (South-West)', lat: 24.9920, lon: 84.6380, desc: 'South-western gateway border' },
            { name: 'Bhadasi Border (South-East)', lat: 25.0020, lon: 84.6980, desc: 'South-eastern boundary point' },
            { name: 'Arwal Bazar Main Market', lat: 25.0143, lon: 84.6680, desc: 'Central high-density commercial sector' },
            { name: 'Ahiyapur Sector', lat: 25.0250, lon: 84.6520, desc: 'North-west riverside sector' },
            { name: 'Prasadi English', lat: 25.0380, lon: 84.6800, desc: 'North corridor connecting sector' },
            { name: 'Bhusura', lat: 25.0180, lon: 84.6720, desc: 'Central regional sector' },
            { name: 'Arwal Sipah Panchayat', lat: 25.0100, lon: 84.6580, desc: 'West central hub near Sone river' },
            { name: 'Fakharpur Panchayat', lat: 25.0080, lon: 84.6820, desc: 'South-central region' },
            { name: 'Akbarpur Ranipur', lat: 25.0280, lon: 84.7020, desc: 'Eastern boundary expansion' }
          ];

          const handleSaveZone = async () => {
            setIsSavingZone(true);
            try {
              const updated: Restaurant = {
                ...selectedZoneRestaurant,
                deliveryRadius: zoneRadius,
                latitude: zoneLat,
                longitude: zoneLon
              };
              const success = await updateRestaurant(updated);
              if (success) {
                triggerNotification(`📍 Delivery zone boundaries saved for ${updated.name}!`, 'restaurant');
                const rests = await getRestaurants();
                setRestaurants(rests);
                safeDispatchEvent('arwaleats_restaurants_updated');
                setShowZoneCalculatorModal(false);
                setSelectedZoneRestaurant(null);
              } else {
                triggerNotification('❌ Failed to save delivery zone boundaries.', 'error');
              }
            } catch (err) {
              console.error(err);
              triggerNotification('❌ Error saving delivery boundaries.', 'error');
            } finally {
              setIsSavingZone(false);
            }
          };

          const rx = (zoneRadius / 7.56) * 100;
          const ry = (zoneRadius / 7.76) * 100;

          const centerProj = gpsToPercent(zoneLat, zoneLon);

          const filteredLandmarks = DEFAULT_LANDMARKS.filter(lm => 
            lm.name.toLowerCase().includes(testAddressQuery.toLowerCase()) ||
            lm.desc.toLowerCase().includes(testAddressQuery.toLowerCase())
          );

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl border border-brand-card w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row"
              >
                {/* Left Panel: Inputs & Configurator */}
                <div className="p-6 md:w-[380px] border-r border-brand-card bg-brand-bg/15 flex flex-col justify-between overflow-y-auto max-h-[90vh] md:max-h-none">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
                          <MapPin size={18} className="animate-bounce" />
                        </span>
                        <div>
                          <h3 className="font-display font-black text-xs uppercase tracking-wider text-brand-text">Zone Radius Manager</h3>
                          <p className="text-[9px] text-brand-text-sec font-black uppercase tracking-widest">{selectedZoneRestaurant.name}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-brand-text-sec mt-2 font-semibold leading-relaxed">
                        Drag the radius slider or click on the radar grid to visually establish delivery limits and service boundaries.
                      </p>
                    </div>

                    {/* Slider for radius */}
                    <div className="space-y-2 bg-white p-4 rounded-2xl border border-brand-card/60 shadow-sm">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-brand-text uppercase tracking-wider">Delivery Radius</label>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">
                          {zoneRadius} KM
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="0.5"
                        value={zoneRadius}
                        onChange={(e) => setZoneRadius(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                        <span>1 km (Local)</span>
                        <span>15 km (Max boundary)</span>
                      </div>
                    </div>

                    {/* Coordinates Inputs */}
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-card/60 shadow-sm">
                      <h4 className="text-[10px] font-black text-brand-text uppercase tracking-wider flex items-center gap-1">
                        <Settings size={12} className="text-brand-text-sec" />
                        GPS Center Point
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="space-y-1">
                          <label className="font-bold text-brand-text-sec uppercase tracking-widest text-[8px]">Latitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={zoneLat}
                            onChange={(e) => setZoneLat(parseFloat(e.target.value) || 25.0143)}
                            className="w-full px-2 py-1.5 border border-brand-card rounded-lg font-bold bg-brand-bg text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-brand-text-sec uppercase tracking-widest text-[8px]">Longitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={zoneLon}
                            onChange={(e) => setZoneLon(parseFloat(e.target.value) || 84.6784)}
                            className="w-full px-2 py-1.5 border border-brand-card rounded-lg font-bold bg-brand-bg text-center"
                          />
                        </div>
                      </div>
                      <div className="bg-brand-bg/40 p-2 rounded-xl text-[9px] text-zinc-400 font-bold leading-normal text-center border border-dashed border-brand-card/70">
                        💡 Click anywhere on the radar map to instantly relocate the center point!
                      </div>
                    </div>

                    {/* Range Checker Utility */}
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-card/60 shadow-sm">
                      <h4 className="text-[10px] font-black text-brand-text uppercase tracking-wider">
                        Address Range Validator
                      </h4>
                      <input
                        type="text"
                        placeholder="Type to search landmark/address..."
                        value={testAddressQuery}
                        onChange={(e) => setTestAddressQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-brand-card rounded-xl text-xs font-semibold focus:outline-none"
                      />
                      
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1 divide-y divide-zinc-100">
                        {filteredLandmarks.map((lm) => {
                          const dist = getHaversineDistance(zoneLat, zoneLon, lm.lat, lm.lon);
                          const inRange = dist <= zoneRadius;
                          return (
                            <div 
                              key={lm.name} 
                              onClick={() => {
                                setTestAddressResult({ name: lm.name, distance: dist, inRange });
                              }}
                              className="pt-1.5 first:pt-0 flex justify-between items-center cursor-pointer hover:bg-brand-bg/50 p-1 rounded-lg transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-[10px] text-brand-text truncate">{lm.name}</p>
                                <p className="text-[8px] text-brand-text-sec truncate">{lm.desc}</p>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase shrink-0 ${inRange ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {dist} km
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {testAddressResult && (
                        <div className={`p-3 rounded-xl border mt-2 space-y-1 ${testAddressResult.inRange ? 'bg-green-50/70 border-green-200 text-green-800' : 'bg-red-50/70 border-red-200 text-red-800'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase tracking-wider">{testAddressResult.inRange ? '✅ In Range' : '❌ Out of Range'}</span>
                            <span className="text-[10px] font-black">{testAddressResult.distance} km</span>
                          </div>
                          <p className="text-[9px] font-bold leading-normal">
                            {testAddressResult.name} is {testAddressResult.inRange ? 'fully deliverable! Standard time: ' + (Math.round(20 + testAddressResult.distance * 5)) + ' mins.' : 'outside the ' + zoneRadius + ' km delivery boundary.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-brand-card/50 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowZoneCalculatorModal(false);
                        setSelectedZoneRestaurant(null);
                      }}
                      className="py-2.5 bg-white hover:bg-zinc-50 border border-brand-card text-brand-text-sec text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveZone}
                      disabled={isSavingZone}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 transition-colors cursor-pointer text-center"
                    >
                      {isSavingZone ? 'Saving...' : 'Apply bounds'}
                    </button>
                  </div>
                </div>

                {/* Right Panel: High-Fidelity SVG Radar Grid */}
                <div className="flex-1 bg-zinc-950 p-6 flex flex-col justify-between select-none relative min-h-[400px]">
                  {/* Grid overlay background */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                  {/* Title & Compass Row */}
                  <div className="flex justify-between items-start z-10 pointer-events-none">
                    <div>
                      <h4 className="text-zinc-100 font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        ARWALEATS GPS RADAR SYSTEM
                      </h4>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                        Arwal Sub-district Region Bounding System (IST)
                      </p>
                    </div>
                    <div className="text-right text-[9px] font-mono text-zinc-500">
                      <div>GRID SCALE: 1:1 Aspect Ratio</div>
                      <div>BOUNDS: 24.985°N - 25.055°N | 84.630°E - 84.705°E</div>
                    </div>
                  </div>

                  {/* Interactive SVG Board */}
                  <div className="flex-1 my-4 relative border border-zinc-800/60 rounded-2xl bg-zinc-900/50 backdrop-blur-md overflow-hidden shadow-inner">
                    <svg
                      ref={d3SvgRef}
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 cursor-crosshair"
                    >
                      {/* Invisible background to capture background clicks */}
                      <rect
                        width="100%"
                        height="100%"
                        fill="transparent"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          const gps = percentToGps(x, y);
                          setZoneLat(parseFloat(gps.lat.toFixed(4)));
                          setZoneLon(parseFloat(gps.lon.toFixed(4)));
                          setTestAddressResult(null);
                        }}
                      />

                      {/* Compass/Radar lines backdrop */}
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.15" strokeDasharray="1,1" />
                      <line x1="50" y1="0" x2="50" y2="100" stroke="#374151" strokeWidth="0.15" strokeDasharray="1,1" />
                      
                      {/* Circular ranges guide lines from center */}
                      <circle cx={centerProj.x} cy={centerProj.y} r={(2 / 7.66) * 100} fill="none" stroke="#4b5563" strokeWidth="0.1" strokeDasharray="2,2" />
                      <circle cx={centerProj.x} cy={centerProj.y} r={(4 / 7.66) * 100} fill="none" stroke="#4b5563" strokeWidth="0.1" strokeDasharray="2,2" />
                      <circle cx={centerProj.x} cy={centerProj.y} r={(6 / 7.66) * 100} fill="none" stroke="#4b5563" strokeWidth="0.1" strokeDasharray="2,2" />

                      {/* Active Boundary Zone Ellipse/Circle (calibrated for stretched aspect ratio) */}
                      <ellipse
                        cx={centerProj.x}
                        cy={centerProj.y}
                        rx={rx}
                        ry={ry}
                        fill="rgba(16, 185, 129, 0.05)"
                        stroke="#10b981"
                        strokeWidth="0.5"
                        className="transition-all duration-300"
                      />
                      {/* Pulse boundary ring */}
                      <ellipse
                        cx={centerProj.x}
                        cy={centerProj.y}
                        rx={rx}
                        ry={ry}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="0.2"
                        className="animate-pulse"
                      />

                      {/* Interactive Drag-to-Resize Handle */}
                      <g className="resize-drag-handle cursor-ew-resize group/handle">
                        <circle
                          cx={Math.min(99, centerProj.x + rx)}
                          cy={centerProj.y}
                          r="3"
                          fill="rgba(16, 185, 129, 0.25)"
                          stroke="#10b981"
                          strokeWidth="0.4"
                          className="transition-all duration-300 group-hover/handle:r-4 animate-pulse"
                        />
                        <circle
                          cx={Math.min(99, centerProj.x + rx)}
                          cy={centerProj.y}
                          r="1.2"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="0.2"
                        />
                      </g>

                      {/* Map Landmark Pins */}
                      {DEFAULT_LANDMARKS.map((lm) => {
                        const proj = gpsToPercent(lm.lat, lm.lon);
                        const dist = getHaversineDistance(zoneLat, zoneLon, lm.lat, lm.lon);
                        const inRange = dist <= zoneRadius;
                        return (
                          <g 
                            key={lm.name}
                            className="cursor-pointer group/pin"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTestAddressResult({ name: lm.name, distance: dist, inRange });
                            }}
                          >
                            <circle
                              cx={proj.x}
                              cy={proj.y}
                              r="2.2"
                              fill={inRange ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                              stroke={inRange ? '#10b981' : '#ef4444'}
                              strokeWidth="0.2"
                              className="transition-all duration-300 hover:scale-150 transform origin-center"
                            />
                            <circle
                              cx={proj.x}
                              cy={proj.y}
                              r="0.8"
                              fill={inRange ? '#10b981' : '#ef4444'}
                              className="transition-all duration-300 group-hover/pin:r-1.5"
                            />
                          </g>
                        );
                      })}

                      {/* Draggable Active Restaurant Core Beacon */}
                      <g className="center-drag-target cursor-move group/center">
                        <circle
                          cx={centerProj.x}
                          cy={centerProj.y}
                          r="5"
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke="#f59e0b"
                          strokeWidth="0.3"
                          className="animate-pulse"
                        />
                        <circle
                          cx={centerProj.x}
                          cy={centerProj.y}
                          r="4"
                          fill="rgba(245, 158, 11, 0.1)"
                          stroke="#f59e0b"
                          strokeWidth="0.25"
                        />
                        <circle
                          cx={centerProj.x}
                          cy={centerProj.y}
                          r="1.5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="0.4"
                        />
                      </g>
                    </svg>

                    {/* Landmark Labels Floating Layer */}
                    <div className="absolute inset-0 pointer-events-none">
                      {DEFAULT_LANDMARKS.map((lm) => {
                        const proj = gpsToPercent(lm.lat, lm.lon);
                        const dist = getHaversineDistance(zoneLat, zoneLon, lm.lat, lm.lon);
                        const inRange = dist <= zoneRadius;
                        return (
                          <div
                            key={lm.name}
                            style={{ left: `${proj.x}%`, top: `${proj.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-5 flex flex-col items-center select-none"
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black whitespace-nowrap shadow-sm border ${inRange ? 'bg-zinc-900/90 text-emerald-400 border-emerald-900/40' : 'bg-zinc-900/90 text-red-400 border-red-900/40'}`}>
                              {lm.name.replace('Arwal ', '')} ({dist} km)
                            </span>
                          </div>
                        );
                      })}

                      {/* Restaurant Label Pin */}
                      <div
                        style={{ left: `${centerProj.x}%`, top: `${centerProj.y}%` }}
                        className="absolute -translate-x-1/2 translate-y-2 flex flex-col items-center"
                      >
                        <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 rounded-full text-[7px] font-black whitespace-nowrap shadow-md uppercase border border-white tracking-wider flex items-center gap-1">
                          <Store size={8} />
                          {selectedZoneRestaurant.name.replace('Arwal Eats ', '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footnote status banner */}
                  <div className="z-10 bg-zinc-900/80 border border-zinc-800/80 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-zinc-400 font-medium">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Center: {zoneLat}°N, {zoneLon}°E</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Radius: {zoneRadius} km</span>
                      </div>
                    </div>
                    <div className="text-zinc-500 font-bold text-center sm:text-right">
                      🔴 Out of range points are red | 🟢 Deliverable points are green
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
