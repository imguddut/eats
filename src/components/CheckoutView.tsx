import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, MapPin, CreditCard, ShoppingBag, BadgeCheck, Phone, 
  User, CheckCircle2, ChevronRight, ClipboardCheck, AlertTriangle, 
  Clock, Truck, Compass, Info, ShieldAlert, Sparkles, Navigation, Check
} from 'lucide-react';
import { CartItem, Customer, Coupon, Restaurant } from '../types';
import { StoreStatus } from '../utils/storeStatus';
import { placeOrder, updateCustomerProfile, registerGuestCustomer, getRestaurants, getMenuItems, getRestaurantSettings } from '../services/dbSimulator';
import { registerBackButtonHandler } from '../utils/backButton';
import { loadGoogleMapsScript } from '../services/GoogleMapsLoader';
import { LocationService, LatLng, ARWAL_DEFAULT_CENTER } from '../services/LocationService';
import { GoogleRouteService, RouteResult } from '../services/GoogleRouteService';
import { DeliveryCalculator, DeliveryCalculationResult } from '../services/DeliveryCalculator';
import { AutocompleteService } from '../services/AutocompleteService';
import CheckoutMap from './CheckoutMap';

interface CheckoutViewProps {
  cart: CartItem[];
  currentUser: Customer | null;
  couponDiscount: number;
  appliedCoupon: Coupon | null;
  onClearCart?: () => void;
  setCurrentView: (view: string) => void;
  onProfileUpdateSuccess: (updatedCust: Customer) => void;
  onOrderSuccess?: (orderId: string) => void;
  storeStatus?: StoreStatus;
}

export default function CheckoutView({
  cart,
  currentUser,
  couponDiscount,
  appliedCoupon,
  onClearCart,
  setCurrentView,
  onProfileUpdateSuccess,
  onOrderSuccess,
  storeStatus,
}: CheckoutViewProps) {
  // Clean address parser
  const parseAddress = (addrStr: string) => {
    const rawAddress = addrStr || '';
    return rawAddress.replace(/\s*\[Zone:.*?\]/, '').replace(/\s*\[Lat:.*?, Lng:.*?\]/, '').trim();
  };

  const cleanAddr = parseAddress(currentUser?.address || '');

  // Form State (Defaulting to customer profile values)
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(cleanAddr || '');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState(currentUser?.city || 'Arwal');
  const [pincode, setPincode] = useState(currentUser?.pincode || '804401');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Helper to ensure customer location defaults to their actual saved coordinates if present
  const getInitialCustomerLocation = (): LatLng => {
    if (currentUser?.latitude && currentUser?.longitude) {
      const lat = Number(currentUser.latitude);
      const lng = Number(currentUser.longitude);
      return { lat, lng };
    }
    return ARWAL_DEFAULT_CENTER;
  };

  // Map & Location State
  const [customerLocation, setCustomerLocation] = useState<LatLng>(getInitialCustomerLocation);
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalculationResult>({
    isDeliverable: true,
    deliveryFee: 0,
    distanceKm: 1.5,
    zoneName: 'Arwal Local (Free)',
    zoneColor: 'green',
    zoneBadgeText: '🎉 FREE Delivery'
  });

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Backend Database State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [dbSettings, setDbSettings] = useState<any>(null);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load Google Maps SDK & Database Settings on mount
  useEffect(() => {
    loadGoogleMapsScript();
    async function loadData() {
      try {
        const [rests, items, settings] = await Promise.all([
          getRestaurants(),
          getMenuItems(),
          getRestaurantSettings()
        ]);
        setRestaurants(rests);
        setMenuItems(items);
        setDbSettings(settings);
      } catch (err) {
        console.error('[CheckoutView] Error loading database settings:', err);
      }
    }
    loadData();
  }, []);

  // Location Initialization (Prioritizes Live GPS -> Saved Coordinates -> Saved Address -> Default)
  useEffect(() => {
    let isMounted = true;
    async function initializeLocation() {
      setIsLocatingGps(true);
      try {
        // 1. Try Live GPS First (Auto Use GPS)
        const pos = await LocationService.getCurrentPosition();
        if (!isMounted) return;
        setCustomerLocation(pos);
        try {
          const geo = await LocationService.reverseGeocode(pos);
          if (geo && geo.formattedAddress && isMounted) {
            setAddress(geo.formattedAddress);
          }
        } catch (e) {
          console.warn('[CheckoutView] Reverse geocode on auto GPS warning:', e);
        }
      } catch (err) {
        console.log('[CheckoutView] Auto GPS failed, falling back to saved profile location...');
        if (!isMounted) return;

        // 2. Fallback to saved exact coordinates
        if (currentUser?.latitude && currentUser?.longitude) {
          const lat = Number(currentUser.latitude);
          const lng = Number(currentUser.longitude);
          setCustomerLocation({ lat, lng });
          return;
        }

        // 3. Fallback to geocoding saved address
        const addrToResolve = cleanAddr || currentUser?.city || '';
        if (addrToResolve.trim()) {
          try {
            const predictions = await AutocompleteService.getPlacePredictions(addrToResolve);
            if (predictions && predictions.length > 0 && predictions[0].location && isMounted) {
              setCustomerLocation(predictions[0].location);
            }
          } catch (geocodingErr) {
            console.warn('[CheckoutView] Geocoding fallback failed:', geocodingErr);
          }
        }
      } finally {
        if (isMounted) setIsLocatingGps(false);
      }
    }

    initializeLocation();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Determine Active Restaurant from Cart
  const getActiveRestaurant = (): Restaurant | null => {
    if (cart.length === 0 || restaurants.length === 0) return null;
    const firstItem = cart[0];
    if (firstItem.restaurantId) {
      const match = restaurants.find((r) => r.id === firstItem.restaurantId);
      if (match) return match;
    }
    const matchItem = menuItems.find((i) => i.id === firstItem.itemId);
    if (matchItem) {
      const rest = restaurants.find((r) => r.id === matchItem.restaurantId);
      if (rest) return rest;
    }
    return restaurants.find((r) => r.active) || restaurants[0] || null;
  };

  const activeRestaurant = getActiveRestaurant();
  const restaurantLocation: LatLng = {
    lat: activeRestaurant?.latitude || ARWAL_DEFAULT_CENTER.lat,
    lng: activeRestaurant?.longitude || ARWAL_DEFAULT_CENTER.lng
  };

  // Recalculate Route & Delivery Fee whenever Customer or Restaurant Location changes
  useEffect(() => {
    let isCancelled = false;

    async function recalculateDelivery() {
      setIsLoadingRoute(true);
      try {
        // 1. Calculate Driving Route
        const route = await GoogleRouteService.calculateRoute(restaurantLocation, customerLocation);
        if (isCancelled) return;
        setRouteResult(route);

        // 2. Evaluate Dynamic Delivery Pricing & Zone
        const calc = DeliveryCalculator.calculate(
          route.distanceKm,
          dbSettings?.deliveryChargeSlabs,
          dbSettings?.maxDeliveryRadius || 15
        );
        if (isCancelled) return;
        setDeliveryCalc(calc);
      } catch (err) {
        console.error('[CheckoutView] Error recalculating delivery:', err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    }

    recalculateDelivery();
    return () => {
      isCancelled = true;
    };
  }, [customerLocation, restaurantLocation.lat, restaurantLocation.lng, dbSettings]);

  // Handle GPS "Use My Location" Button Action (Clickable option with distance check & reverse geocode)
  const handleUseGps = async () => {
    setIsLocatingGps(true);
    setErrorMsg('');
    try {
      const pos = await LocationService.getCurrentPosition();
      setCustomerLocation(pos);
      try {
        const geo = await LocationService.reverseGeocode(pos);
        if (geo && geo.formattedAddress) {
          setAddress(geo.formattedAddress);
        }
      } catch (e) {
        console.warn('[CheckoutView] Reverse geocoding error:', e);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch GPS location.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Handle Address Selection from Places Search Box or Map
  const handleAddressSelect = (selectedAddr: string, location: LatLng, selectedPlaceId?: string) => {
    setCustomerLocation(location);
    if (selectedPlaceId) setPlaceId(selectedPlaceId);
  };

  // Financial Computations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = deliveryCalc.isDeliverable ? deliveryCalc.deliveryFee : 0;
  const total = subtotal - couponDiscount + deliveryFee;

  // Handle Form Submit & Order Placement
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Check store open status
    if (storeStatus && !storeStatus.isOpen) {
      setErrorMsg(`Sorry! Store is closed right now. (${storeStatus.message})`);
      return;
    }

    if (!deliveryCalc.isDeliverable) {
      setErrorMsg(deliveryCalc.rejectionReason || 'Delivery not available for this address.');
      return;
    }

    if (subtotal < (dbSettings?.minimumOrder || 100)) {
      setErrorMsg(`Minimum order amount is ₹${dbSettings?.minimumOrder || 100}. Please add more items.`);
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Please enter your Detailed Manual Delivery Address / Street / Village.');
      return;
    }

    if (!landmark.trim()) {
      setErrorMsg('Please enter a mandatory Landmark or nearby famous spot (e.g. Near Sadar Hospital, Opposite SBI Bank).');
      return;
    }

    const fullFormattedAddress = `Address: ${address.trim()}, Landmark: ${landmark.trim()}, ${city.trim()} ${pincode.trim()}`;

    setLoading(true);

    try {
      let activeCustomer = currentUser;

      // Guest Customer Auto-Registration
      if (!activeCustomer) {
        const guestRes = await registerGuestCustomer({
          name,
          phone,
          address: fullFormattedAddress,
          email,
          city,
          pincode,
          latitude: customerLocation.lat,
          longitude: customerLocation.lng
        });
        if (guestRes.success && guestRes.customer) {
          activeCustomer = guestRes.customer;
          onProfileUpdateSuccess(guestRes.customer);
        } else {
          setErrorMsg(guestRes.message || 'Failed to register guest session.');
          setLoading(false);
          return;
        }
      } else {
        // Update customer profile with latest delivery address & lat/lng
        const updateRes = await updateCustomerProfile({
          ...activeCustomer,
          name,
          phone,
          address: fullFormattedAddress,
          city,
          pincode,
          latitude: customerLocation.lat,
          longitude: customerLocation.lng
        });
        if (updateRes.success && updateRes.customer) {
          onProfileUpdateSuccess(updateRes.customer);
          activeCustomer = updateRes.customer;
        }
      }

      const orderItemsPayload = cart.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        variant: item.variant,
        price: item.price,
        qty: item.qty,
        restaurantId: item.restaurantId || activeRestaurant?.id || 'rest1'
      }));

      const estDeliveryLabel = routeResult?.durationText || '25-35 mins';

      const additionalFields = {
        restaurantId: activeRestaurant?.id || 'rest1',
        restaurantName: activeRestaurant?.name || 'ArwalEats Kitchen',
        delivery_zone: deliveryCalc.zoneName,
        customer_lat: customerLocation.lat,
        customer_lng: customerLocation.lng,
        restaurant_lat: restaurantLocation.lat,
        restaurant_lng: restaurantLocation.lng,
        distance_km: routeResult?.distanceKm || deliveryCalc.distanceKm,
        estimated_time: estDeliveryLabel,
        delivery_fee: deliveryFee,
        grand_total: total,
        placeId,
        route_summary: routeResult?.routeSummary || `${address}`
      };

      const res = await placeOrder(
        activeCustomer!.customerId,
        subtotal,
        couponDiscount,
        deliveryFee,
        total,
        paymentMethod,
        appliedCoupon ? appliedCoupon.coupon : '',
        orderItemsPayload,
        estDeliveryLabel,
        additionalFields
      );

      if (res.success && res.orderId) {
        onOrderSuccess(res.orderId);
      } else {
        setErrorMsg(res.message || 'Failed to place order.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while placing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="checkout-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-black text-brand-text mb-1">Interactive Smart Checkout</h1>
          <p className="text-xs text-brand-text-sec font-semibold">
            Google Maps powered driving routes, live distance calculation & instant delivery verification
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-2xl text-xs font-bold w-max">
          <Sparkles size={16} className="text-emerald-600 animate-pulse" />
          <span>Automatic Google Places & GPS Routing</span>
        </div>
      </div>

      {/* Guest Mode Banner */}
      {!currentUser && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-semibold flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold text-amber-950">Guest Checkout Mode Active</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              No registration required! Enter your recipient details and pick your address on the Google Map below to place your order directly.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-3">
          <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-rose-950">Checkout Attention Required</p>
            <p className="text-[11px] font-semibold text-rose-700/90 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer Details & Zomato Style Google Map */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recipient Details Section */}
          <div className="bg-white border border-brand-card p-6 rounded-3xl space-y-4 shadow-xs">
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-brand-text flex items-center gap-2 border-b border-brand-card/40 pb-3">
              <User size={18} className="text-brand-accent" />
              <span>Recipient Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* Email Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-text mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!currentUser}
                  placeholder="e.g. name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Interactive Zomato/Swiggy Google Map Section */}
          <div className="bg-white border border-brand-card p-6 rounded-3xl space-y-4 shadow-xs">
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-brand-text flex items-center gap-2 border-b border-brand-card/40 pb-3">
              <MapPin size={18} className="text-brand-accent" />
              <span>Smart Delivery Address & Google Map Route</span>
            </h3>

            {/* Google Map Component */}
            <CheckoutMap
              restaurantLocation={restaurantLocation}
              restaurantName={activeRestaurant?.name || 'ArwalEats Main Kitchen'}
              restaurantPhone={activeRestaurant?.phone || '+91 81021 23746'}
              restaurantAddress={activeRestaurant?.address || 'Bariatu Road, Arwal, Bihar'}
              customerLocation={customerLocation}
              customerAddress={address}
              routeResult={routeResult}
              deliveryCalc={deliveryCalc}
              onAddressSelect={handleAddressSelect}
              onUseCurrentLocation={handleUseGps}
              isLocatingGps={isLocatingGps}
              isLoadingRoute={isLoadingRoute}
            />

            {/* Mandatory Manual Delivery Address & Landmark Fields */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Mandatory Manual Street / Village Address Textarea */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Detailed Manual Delivery Address / Street / Village <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter or edit your street, village, mohalla, or area address..."
                  className="w-full p-3 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent resize-none placeholder:text-zinc-400"
                />
              </div>

              {/* Mandatory Landmark */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">
                  Landmark / Nearby Famous Spot <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Sadar Hospital, Opp. SBI Bank, Village Crossing"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/10"
                />
              </div>
            </div>

            {/* City & Pincode */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">City / Sector *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{6}"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Payment Method */}
        <div className="lg:col-span-5 space-y-6">
          {/* Payment Method Selector */}
          <div className="bg-white border border-brand-card p-6 rounded-3xl space-y-4 shadow-xs">
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-brand-text flex items-center gap-2 border-b border-brand-card/40 pb-3">
              <CreditCard size={18} className="text-brand-accent" />
              <span>Payment Option</span>
            </h3>

            <div className="space-y-2.5">
              {/* Cash on Delivery */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent font-bold shadow-xs'
                    : 'border-brand-card/70 bg-brand-bg hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="accent-brand-accent"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Cash / Pay on Delivery (COD)</p>
                    <p className="text-[10px] text-slate-500 font-medium">Pay via Cash or UPI QR to driver at doorstep</p>
                  </div>
                </div>
                <BadgeCheck size={18} className={paymentMethod === 'COD' ? 'text-brand-accent' : 'text-slate-300'} />
              </label>

              {/* Online UPI Instant */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent font-bold shadow-xs'
                    : 'border-brand-card/70 bg-brand-bg hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="accent-brand-accent"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Instant UPI Payment</p>
                    <p className="text-[10px] text-slate-500 font-medium">Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
                <BadgeCheck size={18} className={paymentMethod === 'UPI' ? 'text-brand-accent' : 'text-slate-300'} />
              </label>
            </div>
          </div>

          {/* Order Summary & Final Total */}
          <div className="bg-white border border-brand-card p-6 rounded-3xl space-y-4 shadow-xs">
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-brand-text flex items-center gap-2 border-b border-brand-card/40 pb-3">
              <ShoppingBag size={18} className="text-brand-accent" />
              <span>Checkout Order Summary</span>
            </h3>

            {/* Cart Items List */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <p className="text-slate-900 font-bold">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{item.variant} × {item.qty}</p>
                  </div>
                  <span className="text-slate-800 font-extrabold">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Bill Calculation Breakup */}
            <div className="border-t border-slate-200/80 pt-3 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="text-slate-900 font-bold">₹{subtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount ({appliedCoupon?.coupon})</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Delivery Charge</span>
                {deliveryCalc.isDeliverable ? (
                  deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-black uppercase tracking-wider text-xs">FREE</span>
                  ) : (
                    <span className="text-slate-900 font-extrabold">₹{deliveryFee}</span>
                  )
                ) : (
                  <span className="text-rose-600 font-bold text-xs">N/A</span>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 uppercase tracking-wide">Grand Total</span>
                <span className="text-xl font-black text-brand-accent">₹{total}</span>
              </div>
            </div>

            {/* Submit Order Button */}
            <button
              type="submit"
              disabled={loading || !deliveryCalc.isDeliverable}
              className="w-full py-4 bg-brand-accent text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-brand-accent/25 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Place Order • ₹{total}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
