import { supabase } from '@/lib/supabase';
import { Product, Company, Category } from '@/lib/types';

export interface ProductWithDetails extends Product {
  company_name?: string;
  category_name?: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'company' | 'category'>;
export type UpdateProductInput = Partial<CreateProductInput>;

export interface DropdownOption {
  id: string; // UUID primary key
  name: string;
  unique_id?: string;
}

/**
 * Fetch all companies for select dropdowns
 */
export async function getCompanyOptions(): Promise<DropdownOption[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, unique_id')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching company options:', error);
    return [];
  }

  return (data || []) as DropdownOption[];
}

/**
 * Fetch all categories for select dropdowns
 */
export async function getCategoryOptions(): Promise<DropdownOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, unique_id')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching category options:', error);
    return [];
  }

  return (data || []) as DropdownOption[];
}

/**
 * Fetch all products joined with company and category details
 */
export async function getProducts(): Promise<ProductWithDetails[]> {
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      company:companies(id, name, unique_id),
      category:categories(id, name, unique_id)
    `)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching products from Supabase:', productsError);
    throw new Error(productsError.message);
  }

  if (!productsData || productsData.length === 0) {
    return [];
  }

  return productsData.map((p: any) => {
    const comp = Array.isArray(p.company) ? p.company[0] : p.company;
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;

    return {
      ...p,
      base_price: Number(p.base_price || 0),
      purchase_price: Number(p.purchase_price || 0),
      selling_price: Number(p.selling_price || 0),
      quantity: Number(p.quantity || 0),
      low_stock: Number(p.low_stock ?? p.low_stock_threshold ?? 10),
      company_name: comp?.name || 'Unassigned',
      category_name: cat?.name || 'Unassigned',
      company: comp || undefined,
      category: cat || undefined,
    } as ProductWithDetails;
  });
}

/**
 * Fetch a single product by ID or unique_id
 */
export async function getProductById(id: string): Promise<ProductWithDetails | null> {
  if (!id) return null;

  // Primary key check
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      company:companies(id, name, unique_id),
      category:categories(id, name, unique_id)
    `)
    .eq('id', id)
    .single();

  if (data) {
    const comp = Array.isArray(data.company) ? data.company[0] : data.company;
    const cat = Array.isArray(data.category) ? data.category[0] : data.category;

    return {
      ...data,
      base_price: Number(data.base_price || 0),
      purchase_price: Number(data.purchase_price || 0),
      selling_price: Number(data.selling_price || 0),
      quantity: Number(data.quantity || 0),
      low_stock: Number(data.low_stock ?? data.low_stock_threshold ?? 10),
      company_name: comp?.name || 'Unassigned',
      category_name: cat?.name || 'Unassigned',
      company: comp || undefined,
      category: cat || undefined,
    } as ProductWithDetails;
  }

  // Fallback unique_id check
  const { data: dataByUniqueId } = await supabase
    .from('products')
    .select(`
      *,
      company:companies(id, name, unique_id),
      category:categories(id, name, unique_id)
    `)
    .eq('unique_id', id)
    .single();

  if (dataByUniqueId) {
    const comp = Array.isArray(dataByUniqueId.company) ? dataByUniqueId.company[0] : dataByUniqueId.company;
    const cat = Array.isArray(dataByUniqueId.category) ? dataByUniqueId.category[0] : dataByUniqueId.category;

    return {
      ...dataByUniqueId,
      base_price: Number(dataByUniqueId.base_price || 0),
      purchase_price: Number(dataByUniqueId.purchase_price || 0),
      selling_price: Number(dataByUniqueId.selling_price || 0),
      quantity: Number(dataByUniqueId.quantity || 0),
      low_stock: Number(dataByUniqueId.low_stock ?? dataByUniqueId.low_stock_threshold ?? 10),
      company_name: comp?.name || 'Unassigned',
      category_name: cat?.name || 'Unassigned',
      company: comp || undefined,
      category: cat || undefined,
    } as ProductWithDetails;
  }

  return null;
}

/**
 * Create a new product in Supabase
 */
export async function createProduct(product: CreateProductInput): Promise<Product> {
  const payload = {
    ...product,
    base_price: Number(product.base_price || 0),
    purchase_price: Number(product.purchase_price || 0),
    selling_price: Number(product.selling_price || 0),
    quantity: Number(product.quantity || 0),
    low_stock: Number(product.low_stock ?? 10),
  };

  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating product in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Product;
}

/**
 * Update an existing product in Supabase
 */
export async function updateProduct(id: string, updates: UpdateProductInput): Promise<Product> {
  const payload: any = { ...updates };
  if (updates.base_price !== undefined) payload.base_price = Number(updates.base_price);
  if (updates.purchase_price !== undefined) payload.purchase_price = Number(updates.purchase_price);
  if (updates.selling_price !== undefined) payload.selling_price = Number(updates.selling_price);
  if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
  if (updates.low_stock !== undefined) payload.low_stock = Number(updates.low_stock);

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Product;
}

/**
 * Delete a product from Supabase
 */
export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
