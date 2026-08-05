import { supabase } from '@/lib/supabase';
import { Company, CompanyStatus } from '@/lib/types';

export interface CompanyWithCounts extends Company {
  total_categories: number;
  total_products: number;
}

export type CreateCompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Fetch all companies from Supabase along with product and category/discount counts
 */
export async function getCompanies(): Promise<CompanyWithCounts[]> {
  // 1. Fetch companies
  const { data: companiesData, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (companiesError) {
    console.error('Error fetching companies from Supabase:', companiesError);
    throw new Error(companiesError.message);
  }

  const companies = (companiesData || []) as Company[];

  if (companies.length === 0) {
    return [];
  }

  // 2. Fetch products to calculate total_products per company_id
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('company_id');

  if (productsError) {
    console.warn('Warning fetching products for count:', productsError.message);
  }

  const productCountsMap: Record<string, number> = {};
  if (productsData) {
    for (const p of productsData) {
      if (p.company_id) {
        productCountsMap[p.company_id] = (productCountsMap[p.company_id] || 0) + 1;
      }
    }
  }

  // 3. Fetch discounts to calculate total_categories per company_id
  const { data: discountsData, error: discountsError } = await supabase
    .from('discounts')
    .select('company_id, category_id');

  if (discountsError) {
    console.warn('Warning fetching discounts for count:', discountsError.message);
  }

  const categoryCountsMap: Record<string, Set<string>> = {};
  if (discountsData) {
    for (const d of discountsData) {
      if (d.company_id) {
        if (!categoryCountsMap[d.company_id]) {
          categoryCountsMap[d.company_id] = new Set<string>();
        }
        if (d.category_id) {
          categoryCountsMap[d.company_id].add(d.category_id);
        }
      }
    }
  }

  // 4. Combine into CompanyWithCounts
  return companies.map((c) => ({
    ...c,
    total_products: productCountsMap[c.id] || 0,
    total_categories: categoryCountsMap[c.id] ? categoryCountsMap[c.id].size : 0,
  }));
}

/**
 * Fetch a single company by ID or unique_id
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  if (!id) return null;

  // Primary key check
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (data) return data as Company;

  // Fallback unique_id check
  const { data: dataByUniqueId } = await supabase
    .from('companies')
    .select('*')
    .eq('unique_id', id)
    .single();

  return (dataByUniqueId || null) as Company | null;
}

/**
 * Create a new company in Supabase
 */
export async function createCompany(company: CreateCompanyInput): Promise<Company> {
  const payload = {
    ...company,
    status: (company.status || 'Active') as CompanyStatus,
  };

  const { data, error } = await supabase
    .from('companies')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating company in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Company;
}

/**
 * Update an existing company in Supabase
 */
export async function updateCompany(id: string, updates: UpdateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Company;
}

/**
 * Delete a company from Supabase
 */
export async function deleteCompany(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting company from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
