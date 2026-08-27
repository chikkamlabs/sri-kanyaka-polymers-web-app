-- Sri Kanyaka Polymers - Internal ERP Database Schema
-- Production-ready PostgreSQL schema designed for Supabase SQL Editor
-- Target: Supabase PostgreSQL with Row Level Security (RLS)

-- ==============================================================================
-- 1. Extensions
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. ENUM Types
-- ==============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
        CREATE TYPE profile_role AS ENUM ('Admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
        CREATE TYPE company_status AS ENUM ('Active', 'Inactive', 'Hold');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_status') THEN
        CREATE TYPE category_status AS ENUM ('Active', 'Inactive');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dealer_transaction_type') THEN
        CREATE TYPE dealer_transaction_type AS ENUM ('Credit', 'Debit');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('Submitted', 'Approved', 'Delivered');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_transaction_calculation') THEN
        CREATE TYPE customer_transaction_calculation AS ENUM ('sum', 'subtract');
    END IF;
END $$;

-- ==============================================================================
-- 3. Helper Functions
-- ==============================================================================

-- Reusable trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if the authenticated user is an Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Admin'::profile_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate effective price with cascading percentage discounts (D1, D2, D3, D4)
CREATE OR REPLACE FUNCTION calculate_discounted_price(
    p_base_price NUMERIC,
    p_d1 NUMERIC DEFAULT 0,
    p_d2 NUMERIC DEFAULT 0,
    p_d3 NUMERIC DEFAULT 0,
    p_d4 NUMERIC DEFAULT 0
)
RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    v_price := p_base_price;
    v_price := v_price * (1.0 - (COALESCE(p_d1, 0) / 100.0));
    v_price := v_price * (1.0 - (COALESCE(p_d2, 0) / 100.0));
    v_price := v_price * (1.0 - (COALESCE(p_d3, 0) / 100.0));
    v_price := v_price * (1.0 - (COALESCE(p_d4, 0) / 100.0));
    RETURN ROUND(v_price, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to automatically create a profile record when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'ERP Administrator'),
        'Admin'::profile_role
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. Tables
-- ==============================================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role profile_role NOT NULL DEFAULT 'Admin'::profile_role,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    status company_status NOT NULL DEFAULT 'Active'::company_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status category_status NOT NULL DEFAULT 'Active'::category_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'PCS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: dealers
CREATE TABLE IF NOT EXISTS public.dealers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    details TEXT,
    current_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: dealer_transactions
CREATE TABLE IF NOT EXISTS public.dealer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
    calc dealer_transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    credit_after_transaction NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: discounts
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    d1 NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    d2 NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    d3 NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    d4 NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL,
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'Submitted'::order_status,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    requested_quantity INTEGER NOT NULL,
    released_quantity INTEGER NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: settings
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT,
    points NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    location TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: customer_transactions
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    calculation customer_transaction_calculation NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: distributors
CREATE TABLE IF NOT EXISTS public.distributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: purchases
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id TEXT NOT NULL,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Submitted',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: purchase_items
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. Constraints
-- ==============================================================================

-- Unique Display IDs
ALTER TABLE public.companies ADD CONSTRAINT companies_unique_id_key UNIQUE (unique_id);
ALTER TABLE public.categories ADD CONSTRAINT categories_unique_id_key UNIQUE (unique_id);
ALTER TABLE public.products ADD CONSTRAINT products_unique_id_key UNIQUE (unique_id);
ALTER TABLE public.dealers ADD CONSTRAINT dealers_unique_id_key UNIQUE (unique_id);
ALTER TABLE public.orders ADD CONSTRAINT orders_unique_id_key UNIQUE (unique_id);
ALTER TABLE public.settings ADD CONSTRAINT settings_key_unique_key UNIQUE (key);
ALTER TABLE public.distributors ADD CONSTRAINT distributors_distributor_code_key UNIQUE (distributor_code);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_purchase_id_key UNIQUE (purchase_id);

-- Multi-column Unique Constraints
ALTER TABLE public.discounts ADD CONSTRAINT discounts_company_category_unique UNIQUE (company_id, category_id);

-- Check Constraints
ALTER TABLE public.products ADD CONSTRAINT products_base_price_check CHECK (base_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_purchase_price_check CHECK (purchase_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_selling_price_check CHECK (selling_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_quantity_check CHECK (quantity >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_low_stock_check CHECK (low_stock >= 0);

ALTER TABLE public.dealers ADD CONSTRAINT dealers_credit_limit_check CHECK (credit_limit >= 0);

ALTER TABLE public.dealer_transactions ADD CONSTRAINT dealer_transactions_amount_check CHECK (amount > 0);

ALTER TABLE public.discounts ADD CONSTRAINT discounts_d1_check CHECK (d1 >= 0 AND d1 <= 100);
ALTER TABLE public.discounts ADD CONSTRAINT discounts_d2_check CHECK (d2 >= 0 AND d2 <= 100);
ALTER TABLE public.discounts ADD CONSTRAINT discounts_d3_check CHECK (d3 >= 0 AND d3 <= 100);
ALTER TABLE public.discounts ADD CONSTRAINT discounts_d4_check CHECK (d4 >= 0 AND d4 <= 100);

ALTER TABLE public.order_items ADD CONSTRAINT order_items_requested_quantity_check CHECK (requested_quantity > 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_released_quantity_check CHECK (released_quantity >= 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_selling_price_check CHECK (selling_price >= 0);

ALTER TABLE public.customer_transactions ADD CONSTRAINT customer_transactions_amount_check CHECK (amount > 0);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_quantity_check CHECK (quantity >= 0);
ALTER TABLE public.purchase_items ADD CONSTRAINT purchase_items_quantity_check CHECK (quantity > 0);

-- ==============================================================================
-- 6. Indexes
-- ==============================================================================

-- Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_dealer_transactions_dealer_id ON public.dealer_transactions(dealer_id);

CREATE INDEX IF NOT EXISTS idx_discounts_company_id ON public.discounts(company_id);
CREATE INDEX IF NOT EXISTS idx_discounts_category_id ON public.discounts(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_dealer_id ON public.orders(dealer_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_distributor_id ON public.purchases(distributor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items(product_id);

-- Frequently Searched Fields Indexes
CREATE INDEX IF NOT EXISTS idx_companies_unique_id ON public.companies(unique_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

CREATE INDEX IF NOT EXISTS idx_categories_unique_id ON public.categories(unique_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

CREATE INDEX IF NOT EXISTS idx_products_unique_id ON public.products(unique_id);

CREATE INDEX IF NOT EXISTS idx_dealers_unique_id ON public.dealers(unique_id);
CREATE INDEX IF NOT EXISTS idx_dealers_name ON public.dealers(name);
CREATE INDEX IF NOT EXISTS idx_dealers_mobile ON public.dealers(mobile);
CREATE INDEX IF NOT EXISTS idx_dealers_shop_name ON public.dealers(shop_name);

CREATE INDEX IF NOT EXISTS idx_orders_unique_id ON public.orders(unique_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_location ON public.customers(location);

CREATE INDEX IF NOT EXISTS idx_distributors_distributor_code ON public.distributors(distributor_code);
CREATE INDEX IF NOT EXISTS idx_distributors_name ON public.distributors(name);

CREATE INDEX IF NOT EXISTS idx_purchases_purchase_id ON public.purchases(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);

-- ==============================================================================
-- 7. Triggers
-- ==============================================================================

-- Triggers for automatic updated_at timestamp updates
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dealers_updated_at
    BEFORE UPDATE ON public.dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_dealer_transactions_updated_at
    BEFORE UPDATE ON public.dealer_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_discounts_updated_at
    BEFORE UPDATE ON public.discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customer_transactions_updated_at
    BEFORE UPDATE ON public.customer_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_distributors_updated_at
    BEFORE UPDATE ON public.distributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_items_updated_at
    BEFORE UPDATE ON public.purchase_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for auth.users signup -> profiles creation
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. Enable RLS
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 9. Policies
-- ==============================================================================

-- Policy: Profiles
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to update own profile or Admin full access"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Policy: Companies
CREATE POLICY "Allow authenticated users to read companies"
    ON public.companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Categories
CREATE POLICY "Allow authenticated users to read categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Products
CREATE POLICY "Allow authenticated users to read products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write products"
    ON public.products FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Dealers
CREATE POLICY "Allow authenticated users to read dealers"
    ON public.dealers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write dealers"
    ON public.dealers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Dealer Transactions
CREATE POLICY "Allow authenticated users to read dealer transactions"
    ON public.dealer_transactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write dealer transactions"
    ON public.dealer_transactions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Discounts
CREATE POLICY "Allow authenticated users to read discounts"
    ON public.discounts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write discounts"
    ON public.discounts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Orders
CREATE POLICY "Allow authenticated users to read orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Order Items
CREATE POLICY "Allow authenticated users to read order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write order items"
    ON public.order_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Settings
CREATE POLICY "Allow authenticated users to read settings"
    ON public.settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Customers
CREATE POLICY "Allow authenticated users to read customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Customer Transactions
CREATE POLICY "Allow authenticated users to read customer transactions"
    ON public.customer_transactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write customer transactions"
    ON public.customer_transactions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Distributors
CREATE POLICY "Allow authenticated users to read distributors"
    ON public.distributors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write distributors"
    ON public.distributors FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Purchases
CREATE POLICY "Allow authenticated users to read purchases"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write purchases"
    ON public.purchases FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Purchase Items
CREATE POLICY "Allow authenticated users to read purchase items"
    ON public.purchase_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to write purchase items"
    ON public.purchase_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
