import { useState, useEffect, FormEvent } from 'react';
import { User, Phone, MapPin, Ticket, LogOut, Heart, Save, ChevronRight, Copy, Check, AlertTriangle } from 'lucide-react';
import { Customer, MenuItem, Coupon } from '../types';
import { updateCustomerProfile, getCoupons, getMenuItems } from '../services/dbSimulator';
import { initialMenu } from '../data/menu';

interface ProfileViewProps {
  currentUser: Customer;
  onLogout: () => void;
  onProfileUpdateSuccess: (updatedCustomer: Customer) => void;
  setCurrentView: (view: string) => void;
  setSelectedCategory: (cat: string) => void;
}

type ProfileTab = 'info' | 'address' | 'favorites' | 'coupons';

export default function ProfileView({
  currentUser,
  onLogout,
  onProfileUpdateSuccess,
  setCurrentView,
  setSelectedCategory,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');

  // Helper to parse address and zone
  const parseAddressAndZone = (addrStr: string) => {
    const rawAddress = addrStr || '';
    const cleanAddr = rawAddress.replace(/\s*\[Zone:.*?\]/, '').replace(/\s*\[Lat:.*?, Lng:.*?\]/, '').trim();
    return { cleanAddr };
  };

  const initialParsed = parseAddressAndZone(currentUser.address || '');

  // Profile forms
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [address, setAddress] = useState(initialParsed.cleanAddr);
  const [city, setCity] = useState(currentUser.city || 'Arwal');
  const [pincode, setPincode] = useState(currentUser.pincode || '');

  // Keep in sync with currentUser changes
  useEffect(() => {
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setCity(currentUser.city || 'Arwal');
    setPincode(currentUser.pincode || '');
    
    const parsed = parseAddressAndZone(currentUser.address || '');
    setAddress(parsed.cleanAddr);
  }, [currentUser]);

  // Coupons / Favs State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<MenuItem[]>([]);
  const [brokenFavImages, setBrokenFavImages] = useState<Record<string, boolean>>({});

  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch Coupons and Favorites on mount
  useEffect(() => {
    async function loadCoupons() {
      try {
        const list = await getCoupons();
        setCoupons(list);
      } catch (err) {
        console.error(err);
      }
    }

    // Load favorites from local storage
    async function loadFavoritesAndCoupons() {
      try {
        const items = await getMenuItems();
        const favIds: string[] = JSON.parse(localStorage.getItem('arwaleats_favorites') || '[]');
        const favItems = items.filter(item => favIds.includes(item.id));
        setFavorites(favItems);
      } catch (err) {
        console.error(err);
      }
    }

    loadFavoritesAndCoupons();
    loadCoupons();
  }, [activeTab]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');
    setSavingProfile(true);

    if (!name || !phone || !address || !pincode) {
      setFeedbackError('Please complete all required fields.');
      setSavingProfile(false);
      return;
    }

    try {
      const finalAddress = address.trim();

      const updatedData: Customer = {
        ...currentUser,
        name,
        phone,
        address: finalAddress,
        city,
        pincode,
      };

      const res = await updateCustomerProfile(updatedData);
      if (res.success && res.customer) {
        onProfileUpdateSuccess(res.customer);
        setFeedbackSuccess('Profile details and address saved successfully!');
      } else {
        setFeedbackError(res.message);
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to update details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tabsList = [
    { id: 'info', label: 'My Profile', icon: User },
    { id: 'address', label: 'Saved Address', icon: MapPin },
    { id: 'coupons', label: 'My Coupons', icon: Ticket },
    { id: 'favorites', label: 'Favorites', icon: Heart },
  ];

  return (
    <div id="profile-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-brand-text">Customer Dashboard</h1>
          <p className="text-xs text-brand-text-sec font-semibold">Manage profile and active coupons</p>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Nav Tabs */}
        <div className="space-y-2">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/10'
                    : 'bg-white border border-brand-card text-brand-text-sec hover:text-brand-text hover:bg-brand-card/20'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Container */}
        <div className="md:col-span-3 bg-white p-6 rounded-3xl border border-brand-card shadow-sm">
          {/* Tab 1: Profile Info */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="border-b border-brand-card/50 pb-2">
                <h3 className="font-display font-bold text-lg text-brand-text">Profile Information</h3>
                <p className="text-xs text-brand-text-sec font-semibold">Keep your recipient details updated</p>
              </div>

              {feedbackError && (
                <div className="p-3 bg-brand-accent/10 border border-brand-accent/30 rounded-xl text-brand-accent text-xs font-medium">
                  {feedbackError}
                </div>
              )}
              {feedbackSuccess && (
                <div className="p-3 bg-brand-success/10 border border-brand-success/30 rounded-xl text-brand-success text-xs font-medium">
                  {feedbackSuccess}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg/50 text-xs font-semibold text-brand-text-sec cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">Joined Date</label>
                    <input
                      type="text"
                      disabled
                      value={new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg/50 text-xs font-semibold text-brand-text-sec cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                {/* Delivery Address & Range Details */}
                <div className="border-t border-brand-card/40 pt-4 mt-2 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-accent" />
                    Delivery Address & Range Radius
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-brand-text mb-1">Street Address (Manual Input)</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No, Street, landmark etc."
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent text-brand-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-text mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent text-brand-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-text mb-1">Pincode</label>
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="804401"
                        className="w-full px-3 py-2.5 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent text-brand-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-xs shadow-md shadow-brand-accent/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                  >
                    {savingProfile ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={14} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Saved Address Details */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="border-b border-brand-card/50 pb-2">
                <h3 className="font-display font-bold text-lg text-brand-text">Saved Delivery Coordinates</h3>
                <p className="text-xs text-brand-text-sec font-semibold font-semibold">Your default shipping destinations</p>
              </div>

              <div className="p-5 border border-brand-card bg-brand-bg-sec/40 rounded-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-brand-accent/5 rounded-bl-full flex items-center justify-center">
                  <MapPin size={20} className="text-brand-accent shrink-0" />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-0.5 rounded-md">
                    Primary Home
                  </span>
                  <h4 className="font-display font-bold text-sm text-brand-text pt-1">{currentUser.name}</h4>
                  <p className="text-xs text-brand-text-sec font-semibold">{phone}</p>
                </div>

                <p className="text-xs text-brand-text leading-relaxed font-semibold">
                  {address}, {city} - {pincode}
                </p>

                <button
                  onClick={() => setActiveTab('info')}
                  className="text-xs text-brand-accent font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Update Address details <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Coupons List */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="border-b border-brand-card/50 pb-2">
                <h3 className="font-display font-bold text-lg text-brand-text">My Available Coupons</h3>
                <p className="text-xs text-brand-text-sec font-semibold">Copy active promo codes and use at checkout</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.coupon}
                    className="border border-dashed border-brand-accent bg-brand-bg-sec/30 p-4 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded uppercase">
                        {coupon.coupon}
                      </span>
                      <h4 className="text-xs font-bold text-brand-text mt-2">
                        {coupon.discountType === 'Percentage' ? `${coupon.value}% Off` : `₹${coupon.value} Off`}
                      </h4>
                      <p className="text-[10px] text-brand-text-sec font-semibold">Min order: ₹{coupon.minimumOrder}</p>
                    </div>
                    <button
                      onClick={() => handleCopyCode(coupon.coupon)}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                        copiedCode === coupon.coupon
                          ? 'bg-brand-success text-white border-brand-success'
                          : 'bg-white text-brand-text border-brand-card hover:border-brand-accent'
                      }`}
                    >
                      {copiedCode === coupon.coupon ? <Check size={12} /> : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Favorites Foods list */}
          {activeTab === 'favorites' && (
            <div className="space-y-6">
              <div className="border-b border-brand-card/50 pb-2">
                <h3 className="font-display font-bold text-lg text-brand-text">Favorite Foods</h3>
                <p className="text-xs text-brand-text-sec font-semibold">Your bookmarks ready for rapid re-orders</p>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-10 bg-brand-bg rounded-2xl border border-brand-card/60">
                  <p className="text-xs text-brand-text-sec font-bold">No food bookmarked yet.</p>
                  <button
                    onClick={() => setCurrentView('menu')}
                    className="text-xs font-bold text-brand-accent hover:underline mt-2 cursor-pointer"
                  >
                    Browse delicious menu now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.map((item) => (
                    <div
                      key={item.id}
                      className="border border-brand-card bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm"
                    >
                      {brokenFavImages[item.id] || !item.image ? (
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-accent/5 to-brand-warning/10 flex items-center justify-center font-display text-xs font-black text-brand-accent uppercase shrink-0">
                          🍲
                        </div>
                      ) : (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={() => setBrokenFavImages(prev => ({ ...prev, [item.id]: true }))}
                          className="h-12 w-12 rounded-lg object-cover bg-brand-bg-sec shrink-0" 
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-brand-text truncate">{item.name}</h4>
                        <p className="text-[10px] text-brand-text-sec font-semibold">{item.category}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(item.category);
                          setCurrentView('menu');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                      >
                        Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
