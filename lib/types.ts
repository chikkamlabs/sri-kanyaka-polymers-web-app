// PostgreSQL ENUM Types
export type ProfileRole = 'Admin';
export type CompanyStatus = 'Active' | 'Inactive' | 'Hold';
export type CategoryStatus = 'Active' | 'Inactive';
export type DealerTransactionType = 'Credit' | 'Debit';
export type OrderStatus = 'Submitted' | 'Approved' | 'Delivered';
export type CustomerTransactionCalculation = 'sum' | 'subtract';

// Database Schema Interfaces
export interface Profile {
  id: string; // UUID (FK -> auth.users.id)
  name: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string; // UUID
  unique_id: string; // COMP-ABCD0269
  name: string;
  mobile: string | null;
  address: string | null;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string; // UUID
  unique_id: string; // CAT-ABCD0269
  name: string;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string; // UUID
  unique_id: string; // PROD-1001
  name: string; // Product Name
  company_id: string; // UUID (FK -> companies.id)
  category_id: string; // UUID (FK -> categories.id)
  base_price: number;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  low_stock: number;
  unit: string;
  created_at: string;
  updated_at: string;

  // Optional joins
  company?: Company;
  category?: Category;
}

export interface Dealer {
  id: string; // UUID
  unique_id: string; // DLR-1001
  name: string;
  mobile: string;
  shop_name: string;
  details: string | null;
  current_credit: number;
  credit_limit: number;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerTransaction {
  id: string; // UUID
  dealer_id: string; // UUID (FK -> dealers.id)
  calc: DealerTransactionType;
  amount: number;
  credit_after_transaction: number;
  created_at: string;
  updated_at: string;

  // Optional join
  dealer?: Dealer;
}

export interface Discount {
  id: string; // UUID
  company_id: string; // UUID (FK -> companies.id)
  category_id: string; // UUID (FK -> categories.id)
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  created_at: string;
  updated_at: string;

  // Optional joins
  company?: Company;
  category?: Category;
}

export interface Order {
  id: string; // UUID
  unique_id: string; // ORDER-25-07-1001
  dealer_id: string; // UUID (FK -> dealers.id)
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Optional joins
  dealer?: Dealer;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string; // UUID
  order_id: string; // UUID (FK -> orders.id)
  product_id: string; // UUID (FK -> products.id)
  requested_quantity: number;
  released_quantity: number;
  selling_price: number;
  created_at: string;
  updated_at: string;

  // Optional join
  product?: Product;
}

export interface Setting {
  id: string; // UUID
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string; // UUID
  name: string;
  mobile: string | null;
  points: number;
  credit: number;
  location: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTransaction {
  id: string; // UUID
  customer_id: string; // UUID (FK -> customers.id)
  calculation: CustomerTransactionCalculation;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Optional join
  customer?: Customer;
}

export interface Distributor {
  id: string; // UUID
  distributor_code: string;
  name: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string; // UUID
  purchase_id: string;
  distributor_id: string; // UUID (FK -> distributors.id)
  quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Optional joins
  distributor?: Distributor;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string; // UUID
  purchase_id: string; // UUID (FK -> purchases.id)
  product_id: string; // UUID (FK -> products.id)
  product_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;

  // Optional join
  product?: Product;
}

// Database type definition for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> };
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Company> };
      categories: { Row: Category; Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Category> };
      products: { Row: Product; Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Product> };
      dealers: { Row: Dealer; Insert: Omit<Dealer, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Dealer> };
      dealer_transactions: { Row: DealerTransaction; Insert: Omit<DealerTransaction, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DealerTransaction> };
      discounts: { Row: Discount; Insert: Omit<Discount, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Discount> };
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<OrderItem> };
      settings: { Row: Setting; Insert: Omit<Setting, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Setting> };
      customers: { Row: Customer; Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Customer> };
      customer_transactions: { Row: CustomerTransaction; Insert: Omit<CustomerTransaction, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<CustomerTransaction> };
      distributors: { Row: Distributor; Insert: Omit<Distributor, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Distributor> };
      purchases: { Row: Purchase; Insert: Omit<Purchase, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<Purchase> };
      purchase_items: { Row: PurchaseItem; Insert: Omit<PurchaseItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }; Update: Partial<PurchaseItem> };
    };
  };
}
