import { useState, useEffect, FormEvent } from 'react';
import { Trash2, Plus, Minus, Ticket, X, ArrowRight, ShoppingBag, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { CartItem, Coupon, Restaurant } from '../types';
import { validateCoupon } from '../services/dbSimulator';
import { StoreStatus, getRestaurantStatus } from '../utils/storeStatus';
import { Store } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQty: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (appliedCoupon: Coupon | null, discount: number) => void;
  setCurrentView: (view: string) => void;
  storeStatus?: StoreStatus;
  restaurants?: Restaurant[];
}

export default function CartView({
  cart,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
  setCurrentView,
  storeStatus,
  restaurants = [],
}: CartViewProps) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [brokenCartImages, setBrokenCartImages] = useState<Record<string, boolean>>({});

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal - couponDiscount;

  // Check if any restaurant in cart is closed
  const closedRestaurantNames = cart
    .map(item => {
      const rest = restaurants.find(r => r.id === item.restaurantId);
      if (rest) {
        const status = getRestaurantStatus(rest);
        if (!rest.active || !status.isOpen) {
          return rest.name;
        }
      }
      return null;
    })
    .filter((name): name is string => name !== null);

  const hasClosedRestaurant = closedRestaurantNames.length > 0;

  // Auto validate / update coupon if subtotal changes and a coupon was active
  useEffect(() => {
    if (appliedCoupon) {
      if (subtotal < appliedCoupon.minimumOrder) {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError(`Coupon removed: Order subtotal fell below minimum ₹${appliedCoupon.minimumOrder}`);
        setCouponSuccess('');
      } else {
        // Re-calculate discount
        let discount = 0;
        if (appliedCoupon.discountType === 'Percentage') {
          discount = Math.round((subtotal * appliedCoupon.value) / 100);
        } else {
          discount = appliedCoupon.value;
        }
        setCouponDiscount(discount);
      }
    }
  }, [subtotal, appliedCoupon]);

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    if (!couponCode.trim()) return;

    try {
      const res = await validateCoupon(couponCode, subtotal);
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discount);
        setCouponSuccess(`Coupon "${res.coupon.coupon}" applied! Saved ₹${res.discount}`);
        setCouponCode('');
      } else {
        setCouponError(res.message);
      }
    } catch (err) {
      setCouponError('Failed to validate coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponSuccess('');
    setCouponError('');
  };

  if (cart.length === 0) {
    return (
      <div id="cart-empty" className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-brand-card/40 flex items-center justify-center text-brand-accent mx-auto animate-bounce">
          <ShoppingBag size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-black text-brand-text">Your Cart is Empty</h2>
          <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
            Mouth-watering Biryanis, juicy burgers, and spicy starters are waiting! Add something delicious to start your ArwalEats journey.
          </p>
        </div>
        <button
          onClick={() => setCurrentView('menu')}
          className="px-6 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-sm transition-all shadow-md shadow-brand-accent/20 cursor-pointer inline-flex items-center gap-2"
        >
          Browse Restaurant Menu
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div id="cart-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16">
      <h1 className="font-display text-3xl font-black text-brand-text mb-2">My Food Cart</h1>
      <p className="text-xs text-brand-text-sec font-semibold mb-8">Review items, apply coupons, and checkout</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div id="cart-items-list" className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-brand-card shadow-sm hover:shadow-md transition-all"
            >
              {/* Item Top Row on Mobile: Image + Details */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Item Image */}
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden shrink-0 bg-brand-bg-sec flex items-center justify-center">
                  {brokenCartImages[item.id] || !item.image ? (
                    <div className="h-full w-full bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex items-center justify-center font-display text-xs font-black text-brand-accent uppercase">
                      🍲
                    </div>
                  ) : (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenCartImages(prev => ({ ...prev, [item.id]: true }))}
                      className="h-full w-full object-cover" 
                    />
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold text-brand-accent uppercase bg-brand-accent/5 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {restaurants.find(r => r.id === item.restaurantId) && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                        <Store size={8} />
                        <span>{restaurants.find(r => r.id === item.restaurantId)?.name}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-sm md:text-base text-brand-text truncate mt-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-brand-text-sec font-semibold">Variant: {item.variant}</p>
                  <p className="text-xs font-black text-brand-text mt-0.5">₹{item.price}</p>
                </div>
              </div>

              {/* Quantity Selector & Remove - Full Width at bottom on Mobile */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-brand-card/30">
                <div className="flex items-center border border-brand-card bg-brand-bg rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                    className="p-1 rounded hover:bg-brand-card text-brand-text transition-colors cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-3 text-xs font-bold text-brand-text">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    className="p-1 rounded hover:bg-brand-card text-brand-text transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm font-black text-brand-text w-16 text-right">
                    ₹{item.price * item.qty}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 rounded-xl text-brand-text-sec hover:text-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Notice */}
          <div className="p-3 bg-brand-card/20 rounded-xl border border-brand-card/40 flex items-center gap-2 text-xs text-brand-text-sec">
            <Clock size={16} className="text-brand-accent shrink-0" />
            <span className="font-semibold">Estimated Delivery Time: <strong className="text-brand-text">25 - 35 mins</strong> to your location.</span>
          </div>
        </div>

        {/* Right: Bill Summary & Coupons */}
        <div id="cart-summary" className="space-y-6">
          {/* Coupons Section */}
          <div className="bg-white p-5 rounded-2xl border border-brand-card shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-brand-text flex items-center gap-1.5">
              <Ticket size={18} className="text-brand-accent" />
              Have a Promo Code?
            </h3>

            {appliedCoupon ? (
              <div className="p-3 bg-brand-success/10 border border-brand-success/30 rounded-xl flex items-center justify-between animate-fadeIn">
                <div>
                  <p className="text-xs font-bold text-brand-success">Coupon Applied: {appliedCoupon.coupon}</p>
                  <p className="text-[10px] text-brand-text-sec font-bold">Saved ₹{couponDiscount} on this order</p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="p-1 rounded-full hover:bg-brand-success/20 text-brand-accent transition-colors cursor-pointer"
                  title="Remove Coupon"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                      setCouponSuccess('');
                    }}
                    placeholder="E.g., FAST30"
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold border border-brand-card rounded-xl focus:outline-none focus:border-brand-accent bg-brand-bg text-brand-text"
                  />
                  {couponCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setCouponCode('');
                        setCouponError('');
                        setCouponSuccess('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-text-sec hover:text-brand-accent transition-colors rounded-full cursor-pointer"
                      title="Clear Promo Code"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  Apply
                </button>
              </form>
            )}

            {/* Error / Success Feedback */}
            {couponError && (
              <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 text-[10px] font-semibold animate-fadeIn">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span>{couponError}</span>
              </div>
            )}
            {couponSuccess && (
              <div className="flex items-center gap-1.5 p-2 bg-brand-success/10 text-brand-success rounded-lg border border-brand-success/20 text-[10px] font-semibold animate-fadeIn">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0"></span>
                <span>{couponSuccess}</span>
              </div>
            )}
          </div>

          {/* Bill Breakup */}
          <div className="bg-white p-5 rounded-2xl border border-brand-card shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-brand-text border-b border-brand-card/50 pb-2">
              Bill Summary
            </h3>

            <div className="space-y-2.5 text-xs font-semibold text-brand-text-sec">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="text-brand-text">₹{subtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-brand-success font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              <div className="flex justify-between items-center bg-brand-bg-sec/50 p-2.5 rounded-xl border border-brand-card/30 mt-1.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-brand-text font-bold">Delivery Fee</span>
                  <span className="text-[8px] text-brand-text-sec font-medium">Charged based on your location</span>
                </div>
                <span className="text-[9px] text-brand-accent font-black uppercase tracking-wider bg-brand-accent/5 px-2 py-0.5 rounded-md">Calculated at Checkout</span>
              </div>

              {subtotal < 100 && (
                <p className="text-[10px] text-brand-accent font-bold mt-1 bg-brand-accent/5 p-2 rounded-lg leading-relaxed">
                  ⚠️ Minimum order amount is ₹100. Please add more items to checkout.
                </p>
              )}
            </div>

            <div className="h-px bg-brand-card/50 my-2" />

            <div className="flex justify-between items-center">
              <span className="font-display font-bold text-sm text-brand-text">Grand Total</span>
              <span className="font-display text-lg font-black text-brand-text">₹{total}</span>
            </div>

             {/* Restaurant Closed Warning */}
             {hasClosedRestaurant && (
               <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3 flex items-start gap-2 text-left animate-fadeIn">
                 <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                 <div>
                   <p className="text-[11px] font-black uppercase text-red-500 tracking-wider">Restaurant Closed</p>
                   <p className="text-[10px] text-brand-text font-bold leading-normal mt-0.5">
                     Your order contains dishes from closed restaurant: {closedRestaurantNames.join(', ')}. Please remove them to proceed.
                   </p>
                 </div>
               </div>
             )}

             {/* Store Closed Warning */}
             {storeStatus && !storeStatus.isOpen && !hasClosedRestaurant && (
               <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3 flex items-start gap-2 text-left animate-fadeIn">
                 <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                 <div>
                   <p className="text-[11px] font-black uppercase text-red-500 tracking-wider">Ordering Suspended</p>
                   <p className="text-[10px] text-brand-text font-bold leading-normal mt-0.5">
                     {storeStatus.message || "We are currently closed. Please check back during our opening hours!"}
                   </p>
                 </div>
               </div>
             )}

             {/* Checkout Action Button */}
             <button
               onClick={() => {
                 if (storeStatus && !storeStatus.isOpen) return;
                 if (hasClosedRestaurant) return;
                 onCheckout(appliedCoupon, couponDiscount);
               }}
               disabled={subtotal < 100 || (storeStatus && !storeStatus.isOpen) || hasClosedRestaurant}
               className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                 (subtotal < 100 || (storeStatus && !storeStatus.isOpen) || hasClosedRestaurant)
                   ? 'bg-brand-card text-brand-text-sec cursor-not-allowed opacity-60'
                   : 'bg-brand-accent hover:bg-brand-accent-hover text-white shadow-brand-accent/20 cursor-pointer'
               }`}
             >
               {hasClosedRestaurant ? (
                 <>Items from Closed Restaurant</>
               ) : storeStatus && !storeStatus.isOpen ? (
                 <>Store Currently Closed 🕒</>
               ) : subtotal < 100 ? (
                 <>Subtotal Under ₹100</>
               ) : (
                 <>
                   Proceed to Checkout
                   <ArrowRight size={16} />
                 </>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
