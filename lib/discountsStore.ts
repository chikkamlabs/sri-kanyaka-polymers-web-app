import { supabase } from '@/lib/supabase';
import { Discount, Company, Category } from '@/lib/types';

export interface DiscountWithDetails extends Discount {
  company_name?: string;
  category_name?: string;
}

export type CreateDiscountInput = Omit<Discount, 'id' | 'created_at' | 'updated_at' | 'company' | 'category'>;
export type UpdateDiscountInput = Partial<CreateDiscountInput>;

/**
 * Recalculates and updates purchase_price for all products with matching company_id and category_id.
 * Calculation steps requested:
 * 1. Calculate discount for base with d1, then base = base - discount
 * 2. Calculate discount for base with d2, then base = base - discount
 * 3. Calculate discount for base with d3, then base = base - discount
 * 4. Add d4 percentage to the remaining base to get purchase_price
 * 5. Round off purchase_price to 3 decimal places
 */
export async function calculatepp(
  company_id: string,
  category_id: string,
  d1: number,
  d2: number,
  d3: number,
  d4: number
): Promise<number> {
  if (!company_id || !category_id) return 0;

  // 1. Search all products with company_id and category_id
  const { data: products, error } = await supabase
    .from('products')
    .select('id, base_price')
    .eq('company_id', company_id)
    .eq('category_id', category_id);

  if (error) {
    console.error('Error fetching products for calculatepp:', error);
    throw new Error(error.message);
  }

  if (!products || products.length === 0) {
    return 0;
  }

  const numD1 = Number(d1 || 0);
  const numD2 = Number(d2 || 0);
  const numD3 = Number(d3 || 0);
  const numD4 = Number(d4 || 0);

  let updatedCount = 0;

  for (const product of products) {
    let currentBase = Number(product.base_price || 0);

    // Apply d1
    const d1Discount = currentBase * (numD1 / 100);
    currentBase = currentBase - d1Discount;

    // Apply d2
    const d2Discount = currentBase * (numD2 / 100);
    currentBase = currentBase - d2Discount;

    // Apply d3
    const d3Discount = currentBase * (numD3 / 100);
    currentBase = currentBase - d3Discount;

    // Add d4 to remaining base
    const d4Amount = currentBase * (numD4 / 100);
    const rawPurchasePrice = currentBase + d4Amount;

    // Round off to 3 decimals
    const purchase_price = Math.round(rawPurchasePrice * 1000) / 1000;

    const { error: updateErr } = await supabase
      .from('products')
      .update({ purchase_price })
      .eq('id', product.id);

    if (updateErr) {
      console.error(`Error updating purchase_price for product ${product.id}:`, updateErr);
    } else {
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Fetch all discounts joined with company and category details
 */
export async function getDiscounts(): Promise<DiscountWithDetails[]> {
  const { data: discountsData, error: discountsError } = await supabase
    .from('discounts')
    .select(`
      *,
      company:companies(id, name, unique_id),
      category:categories(id, name, unique_id)
    `)
    .order('created_at', { ascending: false });

  if (discountsError) {
    console.error('Error fetching discounts from Supabase:', discountsError);
    throw new Error(discountsError.message);
  }

  if (!discountsData || discountsData.length === 0) {
    return [];
  }

  return discountsData.map((d: any) => {
    const comp = Array.isArray(d.company) ? d.company[0] : d.company;
    const cat = Array.isArray(d.category) ? d.category[0] : d.category;

    return {
      ...d,
      d1: Number(d.d1 || 0),
      d2: Number(d.d2 || 0),
      d3: Number(d.d3 || 0),
      d4: Number(d.d4 || 0),
      company_name: comp?.name || 'Unassigned',
      category_name: cat?.name || 'Unassigned',
      company: comp || undefined,
      category: cat || undefined,
    } as DiscountWithDetails;
  });
}

/**
 * Fetch a single discount by ID (UUID)
 */
export async function getDiscountById(id: string): Promise<DiscountWithDetails | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('discounts')
    .select(`
      *,
      company:companies(id, name, unique_id),
      category:categories(id, name, unique_id)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const comp = Array.isArray(data.company) ? data.company[0] : data.company;
  const cat = Array.isArray(data.category) ? data.category[0] : data.category;

  return {
    ...data,
    d1: Number(data.d1 || 0),
    d2: Number(data.d2 || 0),
    d3: Number(data.d3 || 0),
    d4: Number(data.d4 || 0),
    company_name: comp?.name || 'Unassigned',
    category_name: cat?.name || 'Unassigned',
    company: comp || undefined,
    category: cat || undefined,
  } as DiscountWithDetails;
}

/**
 * Create a new discount in Supabase
 */
export async function createDiscount(discount: CreateDiscountInput): Promise<Discount> {
  const payload = {
    company_id: discount.company_id,
    category_id: discount.category_id,
    d1: Number(discount.d1 || 0),
    d2: Number(discount.d2 || 0),
    d3: Number(discount.d3 || 0),
    d4: Number(discount.d4 || 0),
  };

  const { data, error } = await supabase
    .from('discounts')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating discount in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Discount;
}

/**
 * Update an existing discount in Supabase
 */
export async function updateDiscount(id: string, updates: UpdateDiscountInput): Promise<Discount> {
  const payload: any = {};
  if (updates.company_id !== undefined) payload.company_id = updates.company_id;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.d1 !== undefined) payload.d1 = Number(updates.d1 || 0);
  if (updates.d2 !== undefined) payload.d2 = Number(updates.d2 || 0);
  if (updates.d3 !== undefined) payload.d3 = Number(updates.d3 || 0);
  if (updates.d4 !== undefined) payload.d4 = Number(updates.d4 || 0);

  const { data, error } = await supabase
    .from('discounts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating discount in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Discount;
}

/**
 * Delete a discount from Supabase
 */
export async function deleteDiscount(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting discount from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
