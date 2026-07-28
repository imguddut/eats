import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit, Trash2, Copy, Eye, ArrowUp, ArrowDown, Check, X,
  Search, Filter, Image as ImageIcon, Calendar, Tag, Link as LinkIcon,
  Sparkles, Clock, RefreshCw, Layers
} from 'lucide-react';
import { Banner, Restaurant, MenuItem, Category } from '../types';
import {
  getAdminBanners, saveBanner, deleteBanner, toggleBannerStatus,
  reorderBanners, getRestaurants, getMenuItems
} from '../services/dbSimulator';
import BannerSlider from './BannerSlider';

export default function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);

  // Initial Form Data State
  const initialFormState: Partial<Banner> = {
    title: '',
    subtitle: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
    mobileImage: '',
    desktopImage: '',
    buttonText: 'Order Now',
    buttonLink: '',
    couponCode: '',
    offerBadge: '🔥 Special Offer',
    redirectType: 'none',
    restaurantId: '',
    categoryId: '',
    productId: '',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    priority: 1,
    status: 'active',
    showCountdown: false,
    countdownDate: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState<Partial<Banner>>(initialFormState);

  // Load Banners, Restaurants, Menu Items
  const loadData = async () => {
    setLoading(true);
    try {
      const [bannerList, restList, menuList] = await Promise.all([
        getAdminBanners(),
        getRestaurants(),
        getMenuItems(),
      ]);
      setBanners(bannerList);
      setRestaurants(restList);
      setMenuItems(menuList);
    } catch (err) {
      console.error('Failed to load banner management data:', err);
      setErrorMsg('Failed to connect to Google Sheets server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Banners
  const filteredBanners = banners.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.couponCode && b.couponCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Open Form for Add
  const handleAddNew = () => {
    setEditingBanner(null);
    setFormData({
      ...initialFormState,
      priority: banners.length + 1,
    });
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({ ...banner });
    setIsFormOpen(true);
  };

  // Duplicate Banner
  const handleDuplicate = async (banner: Banner) => {
    setSaving(true);
    try {
      const duplicated: Partial<Banner> = {
        ...banner,
        bannerId: undefined,
        title: `${banner.title} (Copy)`,
        priority: banners.length + 1,
        createdAt: new Date().toISOString(),
      };
      await saveBanner(duplicated);
      setSuccessMsg('Banner duplicated successfully!');
      await loadData();
    } catch (err) {
      setErrorMsg('Failed to duplicate banner.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Banner Status
  const handleToggleStatus = async (bannerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleBannerStatus(bannerId, nextStatus as any);
      setBanners((prev) =>
        prev.map((b) => (b.bannerId === bannerId ? { ...b, status: nextStatus as any } : b))
      );
      setSuccessMsg(`Banner marked as ${nextStatus}!`);
    } catch (err) {
      setErrorMsg('Failed to update status.');
    }
  };

  // Delete Banner
  const handleDelete = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await deleteBanner(bannerId);
      setBanners((prev) => prev.filter((b) => b.bannerId !== bannerId));
      setSuccessMsg('Banner deleted successfully!');
    } catch (err) {
      setErrorMsg('Failed to delete banner.');
    }
  };

  // Reorder Banner Priority (Up/Down)
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newBanners = [...banners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBanners.length) return;

    // Swap priority values
    const tempPrio = newBanners[index].priority;
    newBanners[index].priority = newBanners[targetIndex].priority;
    newBanners[targetIndex].priority = tempPrio;

    // Swap array positions
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    setBanners(newBanners);

    const bannerOrders = newBanners.map((b, i) => ({
      bannerId: b.bannerId,
      priority: i + 1,
    }));

    try {
      await reorderBanners(bannerOrders);
      setSuccessMsg('Banner order updated!');
    } catch (err) {
      console.error('Failed to reorder banners:', err);
    }
  };

  // Form Image File Upload & Client Compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'image' | 'mobileImage' | 'desktopImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData((prev) => ({ ...prev, [fieldName]: compressedDataUrl }));
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Submit Banner Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setErrorMsg('Banner Title is required.');
      return;
    }
    if (!formData.image?.trim()) {
      setErrorMsg('Banner Image is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await saveBanner(formData);
      setSuccessMsg('Banner saved successfully!');
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setErrorMsg('Failed to save banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card/40 border border-brand-card p-6 rounded-3xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={16} />
            <span>Marketing Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-brand-text">
            Promotional Banner Management
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-sec mt-1">
            Create, schedule, and reorder high-converting promotional banners for ArwalEats HomeView.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-3 rounded-2xl bg-brand-card/60 hover:bg-brand-card text-brand-text transition-all cursor-pointer"
            title="Refresh Banners"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleAddNew}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-[#ef4444] to-[#f43f5e] hover:from-[#e11d48] hover:to-[#db2777] text-white font-bold text-sm shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add New Banner</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-400 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs font-semibold text-rose-500 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3.5 text-brand-text-sec" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search banner title, coupon code..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-card/40 border border-brand-card rounded-2xl text-xs font-semibold text-brand-text focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-brand-text-sec hidden sm:block" />
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-brand-card/40 text-brand-text-sec hover:text-brand-text'
            }`}
          >
            All ({banners.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-brand-card/40 text-brand-text-sec hover:text-brand-text'
            }`}
          >
            Active ({banners.filter((b) => b.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-gray-600 text-white shadow-md'
                : 'bg-brand-card/40 text-brand-text-sec hover:text-brand-text'
            }`}
          >
            Inactive ({banners.filter((b) => b.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Banner Cards Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-brand-text-sec space-y-3">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold">Loading promotional banners...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="p-12 bg-brand-card/20 border border-brand-card/50 rounded-3xl text-center space-y-3">
          <ImageIcon className="mx-auto text-brand-text-sec" size={40} />
          <h3 className="text-base font-bold text-brand-text">No Promotional Banners Found</h3>
          <p className="text-xs text-brand-text-sec">Create your first dynamic promotional banner to display on customer home screen.</p>
          <button
            type="button"
            onClick={handleAddNew}
            className="py-2.5 px-5 rounded-2xl bg-rose-500 text-white font-bold text-xs transition-all hover:bg-rose-600 cursor-pointer"
          >
            Create Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanners.map((banner, index) => (
            <motion.div
              key={banner.bannerId}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-card/40 border border-brand-card/80 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-rose-500/50 transition-all"
            >
              {/* Image Preview Container */}
              <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 backdrop-blur-md text-white border border-white/20">
                    Priority #{banner.priority}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(banner.bannerId, banner.status)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all ${
                      banner.status === 'active'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {banner.status}
                  </button>
                </div>

                {/* Bottom Overlay Title & Subtitle */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  {banner.offerBadge && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white mb-1">
                      {banner.offerBadge}
                    </span>
                  )}
                  <h3 className="font-display font-black text-base line-clamp-1">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-xs text-gray-200 line-clamp-1">{banner.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Card Meta Body */}
              <div className="p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between text-brand-text-sec gap-1 border-b border-brand-card/60 pb-2">
                  <span>Redirect: <strong className="text-brand-text capitalize">{banner.redirectType || 'none'}</strong></span>
                  {banner.couponCode && (
                    <span className="font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                      {banner.couponCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-brand-text-sec">
                  <Calendar size={13} />
                  <span>{banner.startDate || 'Start'} to {banner.endDate || 'End'}</span>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 bg-brand-card/60 border-t border-brand-card/60 flex items-center justify-between gap-1">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleReorder(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-xl hover:bg-brand-card text-brand-text disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(index, 'down')}
                    disabled={index === filteredBanners.length - 1}
                    className="p-1.5 rounded-xl hover:bg-brand-card text-brand-text disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Edit / Preview / Duplicate / Delete */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewBanner(banner);
                      setIsPreviewOpen(true);
                    }}
                    className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                    title="Live Preview"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(banner)}
                    className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                    title="Duplicate Banner"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(banner)}
                    className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.bannerId)}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT BANNER MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-bg border border-brand-card/80 rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-brand-card/60 pb-4 mb-4">
              <h2 className="text-xl font-display font-black text-brand-text">
                {editingBanner ? 'Edit Promotional Banner' : 'Create New Banner'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-brand-text-sec hover:text-brand-text cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-brand-text">Banner Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Flat ₹100 OFF"
                    required
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-brand-text">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g. On orders above ₹299"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-1 text-brand-text">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed offer details shown on banner..."
                  className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Main Image URL & Upload */}
              <div>
                <label className="block mb-1 text-brand-text">Main Banner Image URL / Upload *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={formData.image || ''}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    required
                    className="flex-1 p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                  <label className="py-3 px-4 rounded-2xl bg-brand-card/60 border border-brand-card text-brand-text cursor-pointer hover:bg-brand-card font-bold flex items-center gap-1.5">
                    <ImageIcon size={16} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, 'image')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Offer Badge & Coupon Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-brand-text">Offer Badge Text</label>
                  <input
                    type="text"
                    value={formData.offerBadge || ''}
                    onChange={(e) => setFormData({ ...formData, offerBadge: e.target.value })}
                    placeholder="e.g. 🔥 30% OFF or ⚡ Limited"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-brand-text">Coupon Code</label>
                  <input
                    type="text"
                    value={formData.couponCode || ''}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. ARWAL100"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Button & Redirect Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-brand-text">Button Label</label>
                  <input
                    type="text"
                    value={formData.buttonText || ''}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="e.g. Order Now"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-brand-text">Click Action / Redirect Type</label>
                  <select
                    value={formData.redirectType || 'none'}
                    onChange={(e) => setFormData({ ...formData, redirectType: e.target.value as any })}
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  >
                    <option value="none">No Action</option>
                    <option value="restaurant">Filter Restaurant</option>
                    <option value="category">Filter Category</option>
                    <option value="product">Open Product</option>
                    <option value="coupon">Copy Coupon Code</option>
                    <option value="external">External Link</option>
                  </select>
                </div>
              </div>

              {/* Redirect Target Pickers */}
              {formData.redirectType === 'restaurant' && (
                <div>
                  <label className="block mb-1 text-brand-text">Select Restaurant</label>
                  <select
                    value={formData.restaurantId || ''}
                    onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Target Restaurant</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.cuisine})</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.redirectType === 'category' && (
                <div>
                  <label className="block mb-1 text-brand-text">Category Name</label>
                  <input
                    type="text"
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    placeholder="e.g. Biryani, Pizza, Burger"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {formData.redirectType === 'external' && (
                <div>
                  <label className="block mb-1 text-brand-text">External Link URL</label>
                  <input
                    type="url"
                    value={formData.buttonLink || ''}
                    onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                    placeholder="https://example.com/offer"
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Dates & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-brand-text">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-brand-text">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-brand-text">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Countdown Timer Configuration */}
              <div className="p-4 bg-brand-card/20 border border-brand-card/50 rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-brand-text">
                  <input
                    type="checkbox"
                    checked={formData.showCountdown || false}
                    onChange={(e) => setFormData({ ...formData, showCountdown: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500"
                  />
                  <span>Show Live Countdown Timer on Banner</span>
                </label>

                {formData.showCountdown && (
                  <div>
                    <label className="block mb-1 text-brand-text-sec">Countdown Expiry Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.countdownDate || ''}
                      onChange={(e) => setFormData({ ...formData, countdownDate: e.target.value })}
                      className="w-full p-3 bg-brand-card/30 border border-brand-card rounded-2xl text-brand-text focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-card/60">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-3 px-5 rounded-2xl bg-brand-card/50 text-brand-text hover:bg-brand-card transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Banner</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {isPreviewOpen && previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-bg border border-brand-card/80 rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-brand-card/60 pb-3">
              <h3 className="font-display font-black text-lg text-brand-text flex items-center gap-2">
                <Eye className="text-rose-500" size={18} />
                <span>Customer Home Screen Live Preview</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-brand-text-sec hover:text-brand-text cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <BannerSlider banners={[previewBanner]} />

            <div className="text-right">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="py-2.5 px-5 rounded-2xl bg-rose-500 text-white font-bold text-xs cursor-pointer hover:bg-rose-600"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
