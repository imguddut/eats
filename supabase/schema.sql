-- ============================================================================
-- ARWALEATS - SUPABASE POSTGRESQL DATABASE SCHEMA & RLS POLICIES
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_name TEXT NOT NULL DEFAULT 'ArwalEats',
    phone TEXT DEFAULT '+91 81021 23746',
    whatsapp TEXT DEFAULT '7973638639',
    address TEXT DEFAULT 'Bariatu Road, Arwal, Bihar 804401',
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    minimum_order NUMERIC(10, 2) DEFAULT 100,
    opening_time TEXT DEFAULT '11:00 AM',
    closing_time TEXT DEFAULT '11:00 PM',
    is_closed BOOLEAN DEFAULT FALSE,
    closed_message TEXT DEFAULT 'We are currently closed for online orders.',
    latitude NUMERIC(10, 6) DEFAULT 25.0143,
    longitude NUMERIC(10, 6) DEFAULT 84.6784,
    google_maps_api_key TEXT,
    max_delivery_radius NUMERIC(10, 2) DEFAULT 15,
    delivery_charge_slabs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    customer_id TEXT PRIMARY KEY,
    firebase_uid TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password TEXT,
    address TEXT,
    city TEXT DEFAULT 'Arwal',
    pincode TEXT DEFAULT '804401',
    provider TEXT DEFAULT 'email',
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    cuisine TEXT,
    image TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.5,
    delivery_time TEXT DEFAULT '25-35 mins',
    active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    delivery_radius NUMERIC(10, 2) DEFAULT 15,
    latitude NUMERIC(10, 6) DEFAULT 25.0143,
    longitude NUMERIC(10, 6) DEFAULT 84.6784,
    is_closed BOOLEAN DEFAULT FALSE,
    opening_time TEXT DEFAULT '11:00 AM',
    closing_time TEXT DEFAULT '11:00 PM',
    closed_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    variant TEXT DEFAULT 'Regular',
    price NUMERIC(10, 2) NOT NULL,
    image TEXT,
    available BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    profit_margin NUMERIC(5, 2) DEFAULT 0,
    diet_type TEXT DEFAULT 'veg',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'COD',
    status TEXT DEFAULT 'Pending',
    coupon TEXT,
    estimated_delivery_time TEXT,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    restaurant_name TEXT,
    delivery_zone TEXT,
    customer_lat NUMERIC(10, 6),
    customer_lng NUMERIC(10, 6),
    restaurant_lat NUMERIC(10, 6),
    restaurant_lng NUMERIC(10, 6),
    distance_km NUMERIC(10, 2),
    estimated_time TEXT,
    grand_total NUMERIC(10, 2),
    place_id TEXT,
    route_summary TEXT,
    delivery_boy_name TEXT,
    delivery_boy_phone TEXT,
    vehicle_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT REFERENCES public.orders(order_id) ON DELETE CASCADE,
    item_id TEXT,
    name TEXT NOT NULL,
    variant TEXT DEFAULT 'Regular',
    price NUMERIC(10, 2) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    restaurant_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    coupon TEXT PRIMARY KEY,
    discount_type TEXT DEFAULT 'percentage',
    value NUMERIC(10, 2) NOT NULL,
    minimum_order NUMERIC(10, 2) DEFAULT 0,
    expiry TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.banners (
    banner_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image TEXT NOT NULL,
    button_text TEXT DEFAULT 'Order Now',
    button_link TEXT,
    coupon_code TEXT,
    category_id TEXT,
    restaurant_id TEXT,
    offer_badge TEXT,
    redirect_type TEXT DEFAULT 'none',
    background_color TEXT DEFAULT '#0f172a',
    text_color TEXT DEFAULT '#ffffff',
    priority INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    show_countdown BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DROP EXISTING POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Public Read Settings" ON public.settings;
DROP POLICY IF EXISTS "Public Read Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public Read Menu" ON public.menu;
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Insert OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "Public Insert Customers" ON public.customers;
DROP POLICY IF EXISTS "Public Update Customers" ON public.customers;
DROP POLICY IF EXISTS "Public Read Customers" ON public.customers;

DROP POLICY IF EXISTS "Public All Settings" ON public.settings;
DROP POLICY IF EXISTS "Public All Restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public All Menu" ON public.menu;
DROP POLICY IF EXISTS "Public All Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public All Banners" ON public.banners;
DROP POLICY IF EXISTS "Public All Orders" ON public.orders;
DROP POLICY IF EXISTS "Public All OrderItems" ON public.order_items;
DROP POLICY IF EXISTS "Public All Customers" ON public.customers;

-- ROW LEVEL SECURITY (RLS) POLICIES FOR FULL CRUD & SEED IMPORT ACCESS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public All Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Restaurants" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Menu" ON public.menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All OrderItems" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public All Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- ENABLE SUPABASE REALTIME FOR LIVE SYNCHRONIZATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
