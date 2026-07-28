import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Store, Compass, Navigation, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, Search, Clock, AlertTriangle, CheckCircle2, 
  Sparkles, ShieldAlert, Loader2, Crosshair, PhoneCall, Info, Layers, Route
} from 'lucide-react';
import { LatLng, LocationService } from '../services/LocationService';
import { RouteResult, GoogleRouteService } from '../services/GoogleRouteService';
import { DeliveryCalculationResult } from '../services/DeliveryCalculator';
import { PlacePrediction, AutocompleteService } from '../services/AutocompleteService';

interface CheckoutMapProps {
  restaurantLocation: LatLng;
  restaurantName: string;
  restaurantPhone: string;
  restaurantAddress: string;
  customerLocation: LatLng;
  customerAddress: string;
  routeResult: RouteResult | null;
  deliveryCalc: DeliveryCalculationResult;
  onAddressSelect: (address: string, location: LatLng, placeId?: string) => void;
  onUseCurrentLocation: () => void;
  isLocatingGps: boolean;
  isLoadingRoute: boolean;
}

export default function CheckoutMap({
  restaurantLocation,
  restaurantName,
  restaurantPhone,
  restaurantAddress,
  customerLocation,
  customerAddress,
  routeResult,
  deliveryCalc,
  onAddressSelect,
  onUseCurrentLocation,
  isLocatingGps,
  isLoadingRoute
}: CheckoutMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Google Maps SDK Refs
  const gMapRef = useRef<google.maps.Map | null>(null);
  const gRestaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const gCustomerMarkerRef = useRef<google.maps.Marker | null>(null);
  const gPolylineRef = useRef<google.maps.Polyline | null>(null);
  const gPolylineGlowRef = useRef<google.maps.Polyline | null>(null);

  // Leaflet Map Refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const restaurantMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);

  // Search Box & View Controls State
  const [searchInput, setSearchInput] = useState(customerAddress);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [selectedMarkerInfo, setSelectedMarkerInfo] = useState<'restaurant' | 'customer' | null>(null);

  // Check if Google Maps JS SDK is available in window
  const isGoogleMapsAvailable = typeof window !== 'undefined' && Boolean(window.google?.maps?.Map);

  // Sync search input with prop changes
  useEffect(() => {
    if (customerAddress && customerAddress !== searchInput) {
      setSearchInput(customerAddress);
    }
  }, [customerAddress]);

  // Handle Live Address & Village Search
  const handleSearchChange = async (val: string) => {
    setSearchInput(val);
    if (!val.trim()) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsSearching(true);
    setShowPredictions(true);
    try {
      const results = await AutocompleteService.getPlacePredictions(val);
      setPredictions(results);
    } catch (err) {
      console.error('[CheckoutMap] Search predictions error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Suggestion Item Click
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setSearchInput(prediction.fullAddress);
    try {
      const details = await AutocompleteService.getPlaceDetails(prediction);
      onAddressSelect(details.formattedAddress, details.location, prediction.placeId);
    } catch (err) {
      console.error('[CheckoutMap] Prediction selection error:', err);
    }
  };

  // -------------------------------------------------------------
  // ENGINE 1: NATIVE GOOGLE MAPS SDK RENDERER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isGoogleMapsAvailable || !mapContainerRef.current) return;

    const maps = window.google.maps;

    // 1. Initialize Google Map Instance pointing by default to customer location initially
    if (!gMapRef.current) {
      gMapRef.current = new maps.Map(mapContainerRef.current, {
        center: { lat: customerLocation.lat, lng: customerLocation.lng },
        zoom: 15,
        maxZoom: 21,
        minZoom: 3,
        mapTypeId: mapType === 'satellite' ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
      });

      // Google Map Tap-to-Pin Click Listener
      gMapRef.current.addListener('click', async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          try {
            const geocode = await LocationService.reverseGeocode({ lat, lng });
            onAddressSelect(geocode.formattedAddress, { lat, lng }, geocode.placeId);
          } catch (err) {
            console.error('[GoogleMap] Tap pin geocode error:', err);
          }
        }
      });
    }

    const map = gMapRef.current;

    // Toggle Map Type
    map.setMapTypeId(mapType === 'satellite' ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP);

    // 2. Clear Previous Overlays
    if (gRestaurantMarkerRef.current) gRestaurantMarkerRef.current.setMap(null);
    if (gCustomerMarkerRef.current) gCustomerMarkerRef.current.setMap(null);
    if (gPolylineRef.current) gPolylineRef.current.setMap(null);
    if (gPolylineGlowRef.current) gPolylineGlowRef.current.setMap(null);

    // 3. Restaurant Marker (Red 🍴 Icon)
    gRestaurantMarkerRef.current = new maps.Marker({
      position: { lat: restaurantLocation.lat, lng: restaurantLocation.lng },
      map,
      title: restaurantName,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    gRestaurantMarkerRef.current.addListener('click', () => {
      setSelectedMarkerInfo('restaurant');
    });

    // 4. Draggable Customer Marker (Blue 🏠 Icon)
    gCustomerMarkerRef.current = new maps.Marker({
      position: { lat: customerLocation.lat, lng: customerLocation.lng },
      map,
      title: 'Delivery Address',
      draggable: true,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    gCustomerMarkerRef.current.addListener('click', () => {
      setSelectedMarkerInfo('customer');
    });

    gCustomerMarkerRef.current.addListener('dragend', async () => {
      const pos = gCustomerMarkerRef.current?.getPosition();
      if (pos) {
        const lat = pos.lat();
        const lng = pos.lng();
        try {
          const geocode = await LocationService.reverseGeocode({ lat, lng });
          onAddressSelect(geocode.formattedAddress, { lat, lng }, geocode.placeId);
        } catch (err) {
          console.error('[GoogleMap] Drag pin error:', err);
        }
      }
    });

    // 5. Draw Drivable Polyline Route Line
    if (routeResult && routeResult.path.length > 0) {
      const googlePath = routeResult.path.map((p) => new maps.LatLng(p.lat, p.lng));

      // Glow outer line
      gPolylineGlowRef.current = new maps.Polyline({
        path: googlePath,
        geodesic: true,
        strokeColor: '#60a5fa',
        strokeOpacity: 0.45,
        strokeWeight: 9,
        map
      });

      // Core route line
      gPolylineRef.current = new maps.Polyline({
        path: googlePath,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        map
      });
    }

    // 6. Point camera directly to customer location
    map.setCenter({ lat: customerLocation.lat, lng: customerLocation.lng });
    map.setZoom(16);

  }, [isGoogleMapsAvailable, restaurantLocation, customerLocation, routeResult, mapType]);

  // -------------------------------------------------------------
  // ENGINE 2: LEAFLET & OPENSTREETMAP HD RENDERER (FALLBACK ENGINE)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isGoogleMapsAvailable || !mapContainerRef.current) return;

    // 1. Initialize Leaflet Map Instance
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [customerLocation.lat, customerLocation.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Tile Layer Switcher
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (mapType === 'street') {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(map);
    }

    // Clear Previous Leaflet Overlays
    if (restaurantMarkerRef.current) map.removeLayer(restaurantMarkerRef.current);
    if (customerMarkerRef.current) map.removeLayer(customerMarkerRef.current);
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    circlesRef.current.forEach((c) => map.removeLayer(c));
    circlesRef.current = [];

    // Radius Overlay Circles
    const zones = [
      { radius: 3000, color: '#10b981', opacity: 0.12 },
      { radius: 5000, color: '#eab308', opacity: 0.08 },
      { radius: 10000, color: '#f97316', opacity: 0.05 },
      { radius: 15000, color: '#ef4444', opacity: 0.03 }
    ];

    zones.forEach((z) => {
      const circle = L.circle([restaurantLocation.lat, restaurantLocation.lng], {
        radius: z.radius,
        color: z.color,
        fillColor: z.color,
        fillOpacity: z.opacity,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(map);
      circlesRef.current.push(circle);
    });

    // Custom Leaflet Markers
    const restaurantIcon = L.divIcon({
      className: 'custom-map-marker-restaurant',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: white;
          cursor: pointer;
          transform: translate(-50%, -50%);
        ">🍴</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    restaurantMarkerRef.current = L.marker([restaurantLocation.lat, restaurantLocation.lng], {
      icon: restaurantIcon,
      title: restaurantName
    }).addTo(map);

    restaurantMarkerRef.current.on('click', () => setSelectedMarkerInfo('restaurant'));

    const customerIcon = L.divIcon({
      className: 'custom-map-marker-customer',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: white;
          cursor: pointer;
          transform: translate(-50%, -50%);
        ">🏠</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], {
      icon: customerIcon,
      title: 'Delivery Address',
      draggable: true
    }).addTo(map);

    customerMarkerRef.current.on('click', () => setSelectedMarkerInfo('customer'));

    customerMarkerRef.current.on('dragend', async () => {
      const pos = customerMarkerRef.current?.getLatLng();
      if (pos) {
        try {
          const geocode = await LocationService.reverseGeocode({ lat: pos.lat, lng: pos.lng });
          onAddressSelect(geocode.formattedAddress, { lat: pos.lat, lng: pos.lng }, geocode.placeId);
        } catch (err) {
          console.error('[Leaflet] Drag pin geocode error:', err);
        }
      }
    });

    // Map Tap-to-Pin Handler
    map.off('click');
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      try {
        const geocode = await LocationService.reverseGeocode({ lat, lng });
        onAddressSelect(geocode.formattedAddress, { lat, lng }, geocode.placeId);
      } catch (err) {
        console.error('[Leaflet] Map click geocode error:', err);
      }
    });

    // Draw Drivable Polyline
    if (routeResult && routeResult.path.length > 0) {
      const latLngPath: L.LatLngExpression[] = routeResult.path.map((p) => [p.lat, p.lng]);
      polylineRef.current = L.polyline(latLngPath, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    } else {
      polylineRef.current = L.polyline([
        [restaurantLocation.lat, restaurantLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ], {
        color: '#2563eb',
        weight: 4,
        opacity: 0.7,
        dashArray: '6, 8'
      }).addTo(map);
    }

    // Point camera directly to customer location
    map.setView([customerLocation.lat, customerLocation.lng], 16);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [isGoogleMapsAvailable, restaurantLocation, customerLocation, routeResult, mapType]);

  // Recalculate size when fullscreen toggles
  useEffect(() => {
    if (gMapRef.current && window.google?.maps) {
      window.google.maps.event.trigger(gMapRef.current, 'resize');
    }
    if (leafletMapRef.current) {
      setTimeout(() => leafletMapRef.current?.invalidateSize(), 300);
    }
  }, [isFullscreen]);

  // Map Controls Helpers
  const handleZoomIn = () => {
    if (isGoogleMapsAvailable && gMapRef.current) {
      gMapRef.current.setZoom((gMapRef.current.getZoom() || 15) + 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (isGoogleMapsAvailable && gMapRef.current) {
      gMapRef.current.setZoom((gMapRef.current.getZoom() || 15) - 1);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (isGoogleMapsAvailable && gMapRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(restaurantLocation.lat, restaurantLocation.lng));
      bounds.extend(new window.google.maps.LatLng(customerLocation.lat, customerLocation.lng));
      gMapRef.current.fitBounds(bounds, { top: 60, bottom: 120, left: 50, right: 50 });
    } else if (leafletMapRef.current) {
      const bounds = L.latLngBounds([
        [restaurantLocation.lat, restaurantLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ]);
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  return (
    <div className={`relative w-full overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-4' : 'rounded-3xl border border-brand-card/60 shadow-xl bg-white'}`}>
      
      {/* 1. Google Places & OpenStreetMap Search Bar Header */}
      <div className="relative p-4 bg-white border-b border-slate-100 z-20">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-slate-100/90 rounded-2xl px-3.5 py-2.5 border border-slate-200 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/10 transition-all">
            <Search size={18} className="text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchInput.trim() && setShowPredictions(true)}
              placeholder="Search village (e.g. Bhadasi, Wasilpur, Kaler, Karpi), street..."
              className="w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
            />
            {isSearching && <Loader2 size={16} className="animate-spin text-brand-accent shrink-0 ml-1" />}
          </div>

          {/* GPS Current Location Button */}
          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={isLocatingGps}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-2xl hover:bg-rose-100 transition-all shrink-0 cursor-pointer disabled:opacity-50 border border-rose-200/60"
            title="Use My Current GPS Location"
          >
            {isLocatingGps ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
            <span className="hidden sm:inline">Use GPS</span>
          </button>
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        <AnimatePresence>
          {showPredictions && predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-100"
            >
              {predictions.map((p) => (
                <button
                  key={p.placeId}
                  type="button"
                  onClick={() => handleSelectPrediction(p)}
                  className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <MapPin size={16} className="text-brand-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.mainText}</p>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{p.secondaryText}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Point Selection Instruction Banner */}
      <div className="bg-brand-accent/5 border-b border-brand-accent/10 px-4 py-1.5 flex items-center justify-between text-[11px] font-bold text-brand-accent z-10">
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="animate-pulse shrink-0" />
          <span>Tap anywhere on map or drag 🏠 pin to pick your exact village or house location!</span>
        </span>
      </div>

      {/* 2. Interactive Map Container */}
      <div className={`relative w-full ${isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[380px] md:h-[440px]'}`}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Custom Map Floating Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 z-10">
          {/* Map Layer Switcher Toggle (Street HD vs Satellite) */}
          <button
            type="button"
            onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
            className={`p-2 rounded-xl border shadow-md transition-all cursor-pointer font-bold text-[10px] flex items-center gap-1 ${
              mapType === 'satellite'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
            }`}
            title={mapType === 'street' ? 'Switch to Satellite View' : 'Switch to Street View'}
          >
            <Layers size={18} />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 bg-white/95 backdrop-blur-md text-slate-700 rounded-xl border border-slate-200 shadow-md hover:bg-white transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 bg-white/95 backdrop-blur-md text-slate-700 rounded-xl border border-slate-200 shadow-md hover:bg-white transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={isLocatingGps}
            className="p-2 bg-white/95 backdrop-blur-md text-rose-600 rounded-xl border border-rose-200 shadow-md hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
            title="Use My Current GPS Location"
          >
            {isLocatingGps ? <Loader2 size={18} className="animate-spin text-rose-600" /> : <Navigation size={18} className="text-rose-600" />}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white/95 backdrop-blur-md text-slate-700 rounded-xl border border-slate-200 shadow-md hover:bg-white transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Marker Click InfoWindows */}
        <AnimatePresence>
          {selectedMarkerInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-4 right-4 top-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xl z-20 flex items-center justify-between"
            >
              {selectedMarkerInfo === 'restaurant' ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold shrink-0">
                    🍴
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{restaurantName}</h4>
                    <p className="text-[10px] font-medium text-slate-500">{restaurantAddress}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Open • 11:00 AM - 11:00 PM • {restaurantPhone}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold shrink-0">
                    🏠
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Your Delivery Address</h4>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{customerAddress}</p>
                    <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                      Road Distance: {routeResult?.distanceKm || deliveryCalc.distanceKm} km • ETA: {routeResult?.durationText || '25-35 mins'}
                    </p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedMarkerInfo(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-xs font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isLoadingRoute && (
          <div className="absolute inset-0 bg-white/30 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="bg-white/95 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-2">
              <Loader2 size={18} className="animate-spin text-brand-accent" />
              <span className="text-xs font-bold text-slate-800">Calculating driving road route & ETA...</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Premium Zomato / Swiggy Style Floating Delivery Card */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route size={18} className="text-brand-accent" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Drivable Route Calculation</span>
          </div>
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
            deliveryCalc.zoneColor === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            deliveryCalc.zoneColor === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            deliveryCalc.zoneColor === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200' :
            deliveryCalc.zoneColor === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            'bg-slate-100 text-slate-600 border-slate-300'
          }`}>
            {deliveryCalc.zoneBadgeText}
          </span>
        </div>

        {/* Live Delivery Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Road Distance</span>
            <span className="text-sm font-black text-slate-900 mt-0.5">
              {routeResult?.distanceKm !== undefined ? `${routeResult.distanceKm} km` : `${deliveryCalc.distanceKm} km`}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1 border-x border-slate-200/60">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Estimated Arrival</span>
            <span className="text-sm font-black text-slate-900 mt-0.5">
              {routeResult?.durationText || '25-35 mins'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Delivery Charge</span>
            <span className="text-sm font-black text-brand-accent mt-0.5">
              {deliveryCalc.deliveryFee === 0 ? 'FREE' : `₹${deliveryCalc.deliveryFee}`}
            </span>
          </div>
        </div>

        {/* Route Summary Detail Line */}
        {routeResult?.routeSummary && (
          <div className="bg-slate-100/70 px-3.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 flex items-center gap-2 border border-slate-200/50">
            <Navigation size={14} className="text-brand-accent shrink-0" />
            <span className="truncate">Route Summary: <strong className="text-slate-800 font-bold">{routeResult.routeSummary}</strong></span>
          </div>
        )}

        {/* Out of Range Rejection Alert */}
        {!deliveryCalc.isDeliverable && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3 text-rose-800">
            <ShieldAlert size={20} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold">Delivery Not Available</h5>
              <p className="text-[11px] font-medium mt-0.5 text-rose-700/90">{deliveryCalc.rejectionReason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
