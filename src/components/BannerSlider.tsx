import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock, Tag, ExternalLink, ArrowRight, Copy, Check } from 'lucide-react';
import { Banner } from '../types';

interface BannerSliderProps {
  banners: Banner[];
  loading?: boolean;
  onBannerClick?: (banner: Banner) => void;
}

export default function BannerSlider({ banners, loading = false, onBannerClick }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active unexpired banners filtering
  const activeBanners = React.useMemo(() => {
    if (!banners || banners.length === 0) return [];
    return banners.filter(b => b.status === 'active');
  }, [banners]);

  // Next slide helper
  const nextSlide = useCallback(() => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length);
  }, [activeBanners.length]);

  // Prev slide helper
  const prevSlide = useCallback(() => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  // Auto sliding timer (5 seconds)
  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered) return;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isHovered, nextSlide]);

  // Touch Swipe Handlers for Mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }
  };

  // Copy Coupon Code
  const handleCopyCoupon = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // Countdown timer hook for active banner
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const currentBanner = activeBanners[currentIndex];
    if (!currentBanner || !currentBanner.showCountdown || !currentBanner.countdownDate) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const target = new Date(currentBanner.countdownDate!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, activeBanners]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 my-4">
        <div className="w-full h-48 sm:h-64 md:h-80 bg-brand-card/40 rounded-3xl animate-pulse flex items-center justify-center border border-brand-card/50">
          <div className="space-y-3 text-center">
            <div className="w-48 h-6 bg-brand-card/60 rounded-xl mx-auto animate-pulse" />
            <div className="w-64 h-4 bg-brand-card/60 rounded-xl mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state if no active banners
  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex];

  return (
    <div
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 my-4 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative overflow-hidden rounded-3xl shadow-2xl border border-brand-card/60 bg-brand-card/30 group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.bannerId || currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            onClick={() => onBannerClick && onBannerClick(currentBanner)}
            className="relative w-full h-52 sm:h-72 md:h-84 lg:h-96 cursor-pointer overflow-hidden flex items-center"
            style={{ backgroundColor: currentBanner.backgroundColor || '#0f172a' }}
          >
            {/* Background Image with Responsive Fallback */}
            <picture className="absolute inset-0 w-full h-full">
              {currentBanner.desktopImage && (
                <source media="(min-width: 768px)" srcSet={currentBanner.desktopImage} />
              )}
              {currentBanner.mobileImage && (
                <source media="(max-width: 767px)" srcSet={currentBanner.mobileImage} />
              )}
              <img
                src={currentBanner.image}
                alt={currentBanner.title}
                loading="lazy"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </picture>

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent sm:w-3/4 md:w-2/3" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

            {/* Banner Card Content */}
            <div className="relative z-10 p-5 sm:p-8 md:p-12 max-w-xl text-white space-y-2 sm:space-y-3">
              {/* Offer Badge & Countdown Row */}
              <div className="flex flex-wrap items-center gap-2">
                {currentBanner.offerBadge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30 uppercase tracking-wider">
                    {currentBanner.offerBadge}
                  </span>
                )}

                {/* Countdown Timer */}
                {timeLeft && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                    <Clock size={13} className="animate-pulse" />
                    <span>
                      Ends in: {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
                    </span>
                  </span>
                )}
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-xl sm:text-3xl md:text-4xl font-display font-black leading-tight tracking-tight drop-shadow-md text-white">
                {currentBanner.title}
              </h2>

              {currentBanner.subtitle && (
                <p className="text-xs sm:text-base font-medium text-gray-200 line-clamp-2 drop-shadow">
                  {currentBanner.subtitle}
                </p>
              )}

              {/* Description (desktop) */}
              {currentBanner.description && (
                <p className="hidden md:block text-xs text-gray-300 line-clamp-2">
                  {currentBanner.description}
                </p>
              )}

              {/* Action Button & Coupon Pill Row */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {currentBanner.buttonText && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBannerClick) onBannerClick(currentBanner);
                    }}
                    className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold shadow-xl shadow-rose-500/30 flex items-center gap-2 transition-all transform hover:scale-105 cursor-pointer"
                  >
                    <span>{currentBanner.buttonText}</span>
                    {currentBanner.redirectType === 'external' ? (
                      <ExternalLink size={14} />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                  </button>
                )}

                {/* Coupon Code Pill */}
                {currentBanner.couponCode && (
                  <button
                    type="button"
                    onClick={(e) => handleCopyCoupon(e, currentBanner.couponCode!)}
                    className="py-2 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    title="Click to copy coupon code"
                  >
                    <Tag size={13} className="text-rose-400" />
                    <span>CODE: <strong className="tracking-wider text-rose-300 font-mono">{currentBanner.couponCode}</strong></span>
                    {copiedCoupon === currentBanner.couponCode ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} className="text-gray-300" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Previous & Next Navigation Controls (Desktop) */}
        {activeBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-rose-500 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0 cursor-pointer shadow-lg z-20"
              aria-label="Previous Slide"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-rose-500 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 cursor-pointer shadow-lg z-20"
              aria-label="Next Slide"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Pagination Indicators / Dots */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {activeBanners.map((banner, idx) => (
              <button
                key={banner.bannerId || idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-6 bg-rose-500 shadow-md shadow-rose-500/50' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
