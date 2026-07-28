import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, ClipboardCheck, Clock, CheckCircle2, Truck, ShoppingBag, MapPin, Phone, MessageSquare, Compass, Play, Zap, AlertCircle, Check, Star, Store } from 'lucide-react';
import { Order, OrderItem, Customer, OrderStatus, Restaurant } from '../types';
import { getCustomerOrders, updateOrderStatus, getCustomerReviews, saveCustomerReview, getRestaurants } from '../services/dbSimulator';

interface OrdersViewProps {
  currentUser: Customer;
  setCurrentView: (view: string) => void;
  activeOrderHighlightId?: string;
}

export default function OrdersView({
  currentUser,
  setCurrentView,
  activeOrderHighlightId,
}: OrdersViewProps) {
  const [orders, setOrders] = useState<Array<Order & { items: OrderItem[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(activeOrderHighlightId || null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const loadOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = (await getCustomerOrders(currentUser.customerId)) || [];
      setOrders(res);
      setReviews(await getCustomerReviews());
      const rests = await getRestaurants();
      setRestaurants(rests);
      if (res.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res[0].orderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !feedbackText.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanAddress = currentUser.address || '';
      const cleanCity = currentUser.city || 'Arwal';
      const userAddress = cleanAddress 
        ? (cleanAddress.toLowerCase().includes(cleanCity.toLowerCase()) 
            ? cleanAddress 
            : `${cleanAddress}, ${cleanCity}`) 
        : cleanCity;

      await saveCustomerReview({
        orderId: selectedOrderId,
        customerId: currentUser.customerId,
        name: currentUser.name,
        address: userAddress,
        rating,
        feedback: feedbackText.trim()
      });
      setFeedbackText('');
      setRating(5);
      setReviews(await getCustomerReviews());
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    loadOrders(true);

    // Set up real-time live tracking interval (polls every 4 seconds)
    const intervalId = setInterval(() => {
      loadOrders(false);
    }, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser, selectedOrderId]);

  // Handle active highlighting
  useEffect(() => {
    if (activeOrderHighlightId) {
      setSelectedOrderId(activeOrderHighlightId);
    }
  }, [activeOrderHighlightId]);

  const activeOrder = orders.find((o) => o.orderId === selectedOrderId);
  const activeStatus = activeOrder
    ? activeOrder.status
    : 'Pending';
  const existingReview = activeOrder ? reviews.find((r: any) => r.orderId === activeOrder.orderId) : undefined;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'text-brand-warning bg-brand-warning/10 border-brand-warning/30';
      case 'Accepted':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'Preparing':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'Out for Delivery':
        return 'text-brand-accent bg-brand-accent/10 border-brand-accent/30';
      case 'Delivered':
        return 'text-brand-success bg-brand-success/10 border-brand-success/30';
      case 'Cancelled':
      case 'Rejected':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      default:
        return 'text-brand-text-sec bg-brand-bg-sec border-brand-card';
    }
  };

  // Timeline Step Configurations
  const timelineSteps = [
    { label: 'Order Placed', status: 'Pending', desc: 'Awaiting kitchen partner confirmation', icon: ClipboardList },
    { label: 'Accepted', status: 'Accepted', desc: 'Partner kitchen confirmed your order', icon: CheckCircle2 },
    { label: 'Preparing', status: 'Preparing', desc: 'Food is being freshly prepared', icon: Clock },
    { label: 'Out for Delivery', status: 'Out for Delivery', desc: 'Rider is carrying your order', icon: Truck },
    { label: 'Delivered', status: 'Delivered', desc: 'Enjoy your hot, fresh meal!', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: OrderStatus) => {
    const sequence: OrderStatus[] = ['Pending', 'Accepted', 'Preparing', 'Out for Delivery', 'Delivered'];
    return sequence.indexOf(status);
  };

  const activeStepIdx = getStepIndex(activeStatus);

  if (loading) {
    return (
      <div id="orders-loading" className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-brand-text-sec">Fetching your meal history...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div id="orders-empty" className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-brand-card/40 flex items-center justify-center text-brand-accent mx-auto">
          <ClipboardList size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-black text-brand-text">No Orders Placed Yet</h2>
          <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
            Ready to order? You have no pending or past orders. Let's customize your first delicious cart!
          </p>
        </div>
        <button
          onClick={() => setCurrentView('menu')}
          className="px-6 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-sm transition-all shadow-md shadow-brand-accent/20 cursor-pointer inline-flex items-center gap-2"
        >
          Explore Food Menu
          <Compass size={16} />
        </button>
      </div>
    );
  }

  return (
    <div id="orders-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-brand-text">Track My Orders</h1>
          <p className="text-xs text-brand-text-sec font-semibold">Live order tracking and historic items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: History Sidebar */}
        <div id="orders-history-sidebar" className="space-y-4">
          <h3 className="font-display font-bold text-sm text-brand-text uppercase tracking-wider bg-brand-card/20 px-3 py-1.5 rounded-lg border border-brand-card/40">
            Order History ({orders.length})
          </h3>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {orders.map((order) => {
              const currentStatus = order.status;
              const dateObj = new Date(order.date);
              const formattedDate = dateObj.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <button
                  key={order.orderId}
                  onClick={() => setSelectedOrderId(order.orderId)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    selectedOrderId === order.orderId
                      ? 'bg-white border-brand-accent shadow-md'
                      : 'bg-brand-bg-sec/50 border-brand-card hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-black text-brand-text">
                      {order.orderId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${getStatusColor(currentStatus)}`}>
                      {currentStatus}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-brand-text-sec font-semibold">
                    <span>{formattedDate}</span>
                    <span className="text-brand-text font-bold">₹{order.total}</span>
                  </div>

                  <p className="text-[10px] text-brand-text-sec font-bold truncate">
                    {order.items.map(item => `${item.name} (${item.variant}) x${item.qty}`).join(', ')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Active tracking details */}
        <div id="order-tracking-panel" className="lg:col-span-2 space-y-6">
          {activeOrder ? (
            <div className="bg-white p-6 rounded-2xl border border-brand-card shadow-sm space-y-6">
              {/* Order Info Panel Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-brand-card/50 pb-4">
                <div>
                  <p className="text-[10px] text-brand-text-sec font-bold uppercase tracking-wider">Tracking Order</p>
                  <h3 className="font-mono text-lg font-black text-brand-text">{activeOrder.orderId}</h3>
                  {(() => {
                    const name = activeOrder.restaurantName || (activeOrder.restaurantId && restaurants.find(r => r.id === activeOrder.restaurantId)?.name);
                    if (name) {
                      return (
                        <p className="text-[11px] text-amber-700 font-bold mt-1.5 flex items-center gap-1 bg-amber-50/50 border border-amber-200/40 px-2 py-0.5 rounded-lg w-fit">
                          <Store size={12} className="text-amber-500" />
                          Ordered from: <span>{name}</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-brand-text-sec font-bold">Total Payment ({activeOrder.paymentMethod})</p>
                  <p className="font-display font-bold text-base text-brand-accent">₹{activeOrder.total}</p>
                </div>
              </div>

              {/* Rider Rejection Info Alert */}
              {activeOrder.riderRejected && !activeOrder.deliveryBoyName && (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 flex gap-3 items-start text-left animate-fadeIn">
                  <div className="text-red-500 shrink-0 mt-0.5 animate-pulse">
                    <AlertCircle size={18} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                      Rider Re-routing In Progress
                    </h5>
                    <p className="text-[10px] text-red-600/90 font-semibold leading-relaxed">
                      Delivery partner <strong>{activeOrder.lastRejectedRiderName || 'previously assigned'}</strong> had to decline/release this order. We are actively looking for another available delivery partner to pick up your order immediately. Thank you for your patience!
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Timeline Tracker */}
              {(activeStatus === 'Cancelled' || activeStatus === 'Rejected') ? (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-5 text-center space-y-2">
                  <AlertCircle className="text-red-500 mx-auto animate-bounce" size={32} style={{ animationDuration: '3s' }} />
                  <h4 className="font-display font-black text-red-700 text-sm">
                    This order was {activeStatus === 'Cancelled' ? 'Cancelled' : 'Rejected'}
                  </h4>
                  <p className="text-[11px] text-red-600/80 font-bold max-w-sm mx-auto">
                    {activeStatus === 'Cancelled' 
                      ? 'This order has been cancelled.' 
                      : 'We regret to inform you that our partner kitchen could not fulfill this order. Contact our support for assistance or details.'}
                  </p>
                </div>
              ) : (
                <div id="live-timeline" className="py-2 space-y-8 relative">
                  {/* Vertical line connector */}
                  <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-brand-card" />

                  {timelineSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isCompleted = idx <= activeStepIdx;
                    const isCurrent = idx === activeStepIdx;

                    return (
                      <div key={step.status} className="flex gap-4 relative z-10 items-start">
                        {/* Circle Status Indicator */}
                        <div
                          className={`h-12 w-12 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isCompleted
                              ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20'
                              : 'bg-white border-brand-card text-brand-text-sec'
                          } ${isCurrent ? 'scale-110 ring-4 ring-brand-accent/10' : ''}`}
                        >
                          <StepIcon size={20} />
                        </div>

                        {/* Text details */}
                        <div className="pt-1.5 space-y-0.5">
                          <h4
                            className={`text-xs md:text-sm font-bold ${
                              isCompleted ? 'text-brand-text' : 'text-brand-text-sec'
                            }`}
                          >
                            {step.label}
                            {isCurrent && (
                              <span className="ml-2 text-[9px] font-bold text-brand-warning bg-brand-warning/10 border border-brand-warning/20 px-2 py-0.5 rounded-md uppercase animate-pulse">
                                In Progress
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-brand-text-sec font-semibold">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delivery Boy Details Card */}
              {activeOrder && (activeStatus === 'Accepted' || activeStatus === 'Preparing' || activeStatus === 'Out for Delivery' || activeStatus === 'Delivered') && activeOrder.deliveryBoyName && (
                <div className="bg-brand-accent/5 border border-brand-accent/15 rounded-xl p-4 space-y-3 animate-fadeIn">
                  <h4 className="text-xs font-black text-brand-text uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={14} className="text-brand-accent animate-pulse" />
                    Delivery Rider Allocated
                  </h4>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-black text-xs uppercase">
                        {activeOrder.deliveryBoyName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-brand-text">{activeOrder.deliveryBoyName}</p>
                        <p className="text-[10px] text-brand-text-sec font-bold">
                          {activeOrder.vehicleNumber ? `Vehicle: ${activeOrder.vehicleNumber}` : 'Delivery Partner'}
                        </p>
                      </div>
                    </div>
                    {activeOrder.deliveryBoyPhone && (
                      <a
                        href={`tel:${activeOrder.deliveryBoyPhone}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Phone size={12} />
                        <span>Call {activeOrder.deliveryBoyName.split(' ')[0]}</span>
                      </a>
                    )}
                  </div>
                  {(activeOrder.estimatedDeliveryTime || activeOrder.deliveryNotes) && (
                    <div className="border-t border-brand-card/50 pt-2.5 space-y-1 text-[10px] text-brand-text-sec font-bold">
                      {activeOrder.estimatedDeliveryTime && (
                        <div className="flex justify-between">
                          <span>Estimated delivery:</span>
                          <span className="text-brand-accent font-black">{activeOrder.estimatedDeliveryTime}</span>
                        </div>
                      )}
                      {activeOrder.deliveryNotes && (
                        <p className="text-[10px] text-brand-text-sec italic font-semibold mt-1 bg-white border border-brand-card/40 p-2 rounded-lg">
                          Rider notes: "{activeOrder.deliveryNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback / Review Section */}
              {activeStatus === 'Delivered' && (
                <div className="bg-brand-success/5 border border-brand-success/20 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-brand-success/15 flex items-center justify-center text-brand-success">
                      <Star size={14} className="fill-brand-success" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-brand-text uppercase tracking-wider">
                        {existingReview ? 'Your Delivered Feedback' : 'How was your meal?'}
                      </h4>
                      <p className="text-[10px] text-brand-text-sec font-semibold">
                        {existingReview ? 'Thank you for sharing your experience with us!' : 'Share feedback with name and address to help others in Arwal'}
                      </p>
                    </div>
                  </div>

                  {existingReview ? (
                    <div className="bg-white border border-brand-card/40 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-0.5 text-brand-warning">
                          {[...Array(existingReview.rating)].map((_, i) => (
                            <Star key={i} size={13} className="fill-brand-warning text-brand-warning" />
                          ))}
                          {[...Array(5 - existingReview.rating)].map((_, i) => (
                            <Star key={i} size={13} className="text-brand-card" />
                          ))}
                        </div>
                        <span className="text-[9px] font-bold text-brand-text-sec bg-brand-bg px-2 py-0.5 rounded border border-brand-card/20">
                          Recorded
                        </span>
                      </div>
                      <p className="text-xs text-brand-text-sec font-medium leading-relaxed italic">
                        "{existingReview.feedback}"
                      </p>
                      <div className="pt-2 border-t border-brand-card/20 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-brand-text">{existingReview.name}</p>
                          <p className="text-[9px] text-brand-text-sec font-medium">{existingReview.address}</p>
                        </div>
                        <p className="text-[9px] text-brand-text-sec font-semibold">
                          {new Date(existingReview.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitFeedback} className="space-y-3">
                      {/* Rating selection (Stars) */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand-text-sec uppercase tracking-wider">Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              type="button"
                              key={starVal}
                              onClick={() => setRating(starVal)}
                              className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                size={20}
                                className={starVal <= rating ? 'fill-brand-warning text-brand-warning' : 'text-brand-card hover:text-brand-warning/60'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text area */}
                      <div className="space-y-1">
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Write your honest review (e.g. food quality, hygiene, delivery rider experience...)"
                          rows={3}
                          required
                          className="w-full text-xs font-semibold p-3 border border-brand-card/60 hover:border-brand-accent/40 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent rounded-xl outline-none placeholder:text-brand-text-sec/50 bg-white transition-all resize-none"
                        />
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={isSubmitting || !feedbackText.trim()}
                        className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-brand-accent/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} />
                        Submit Feedback
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Order Items Breakdown Box */}
              <div className="bg-brand-bg-sec/50 border border-brand-card rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-1">
                  <ClipboardCheck size={14} className="text-brand-accent" />
                  Order Items
                </h4>

                <div className="space-y-2 divider-y divider-brand-card/30">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-brand-text">{item.name}</span>
                        <p className="text-[10px] text-brand-text-sec font-semibold">
                          Variant: {item.variant} | Qty: {item.qty}
                        </p>
                      </div>
                      <span className="font-bold text-brand-text">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-brand-card/50 pt-2.5 flex justify-between items-center text-xs font-semibold text-brand-text-sec">
                  <div className="space-y-0.5">
                    <p>Subtotal: ₹{activeOrder.subtotal}</p>
                    {activeOrder.discount > 0 && <p className="text-brand-success font-bold">Discount: -₹{activeOrder.discount}</p>}
                    <p>Delivery Fee: ₹{activeOrder.deliveryFee}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold">Total Bill</span>
                    <p className="font-display font-black text-sm text-brand-text">₹{activeOrder.total}</p>
                  </div>
                </div>
              </div>

              {/* Help & Contact Support Line */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-brand-text-sec font-semibold">Need help with your order?</span>
                <a
                  href={`https://wa.me/918102123746?text=Hi, need assistance with my order: ${activeOrder.orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-card hover:border-brand-accent hover:text-brand-accent text-brand-text font-bold transition-colors"
                >
                  <MessageSquare size={12} />
                  WhatsApp Support
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-brand-card rounded-2xl">
              <p className="text-sm font-semibold text-brand-text-sec">Select an order from the sidebar to track it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
