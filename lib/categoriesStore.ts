import { supabase } from '@/lib/supabase';
import { Category, CategoryStatus } from '@/lib/types';

export interface CategoryWithCounts extends Category {
  total_products: number;
  total_companies: number;
}

export type CreateCategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCategoryInput = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Fetch all categories from Supabase with total_products and total_companies counts
 */
export async function getCategories(): Promise<CategoryWithCounts[]> {
  // 1. Fetch categories
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });

  if (categoriesError) {
    console.error('Error fetching categories from Supabase:', categoriesError);
    throw new Error(categoriesError.message);
  }

  const categories = (categoriesData || []) as Category[];

  if (categories.length === 0) {
    return [];
  }

  // 2. Fetch products to calculate total_products where category_id matches
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('category_id');

  if (productsError) {
    console.warn('Warning fetching products for category count:', productsError.message);
  }

  const productCountsMap: Record<string, number> = {};
  if (productsData) {
    for (const p of productsData) {
      if (p.category_id) {
        productCountsMap[p.category_id] = (productCountsMap[p.category_id] || 0) + 1;
      }
    }
  }

  // 3. Fetch discounts to calculate total_companies where category_id matches
  const { data: discountsData, error: discountsError } = await supabase
    .from('discounts')
    .select('category_id, company_id');

  if (discountsError) {
    console.warn('Warning fetching discounts for category company count:', discountsError.message);
  }

  const companyCountsMap: Record<string, Set<string>> = {};
  if (discountsData) {
    for (const d of discountsData) {
      if (d.category_id) {
        if (!companyCountsMap[d.category_id]) {
          companyCountsMap[d.category_id] = new Set<string>();
        }
        if (d.company_id) {
          companyCountsMap[d.category_id].add(d.company_id);
        }
      }
    }
  }

  // 4. Combine into CategoryWithCounts
  return categories.map((cat) => ({
    ...cat,
    total_products: productCountsMap[cat.id] || 0,
    total_companies: companyCountsMap[cat.id] ? companyCountsMap[cat.id].size : 0,
  }));
}

/**
 * Fetch a single category by ID or unique_id
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  if (!id) return null;

  // Primary key check
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (data) return data as Category;

  // Fallback unique_id check
  const { data: dataByUniqueId } = await supabase
    .from('categories')
    .select('*')
    .eq('unique_id', id)
    .single();

  return (dataByUniqueId || null) as Category | null;
}

/**
 * Create a new category in Supabase
 */
export async function createCategory(category: CreateCategoryInput): Promise<Category> {
  const payload = {
    ...category,
    status: (category.status || 'Active') as CategoryStatus,
  };

  const { data, error } = await supabase
    .from('categories')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating category in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Category;
}

/**
 * Update an existing category in Supabase
 */
export async function updateCategory(id: string, updates: UpdateCategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Category;
}

/**
 * Delete a category from Supabase
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
