import { supabase } from '@/lib/supabase';
import { Distributor, Purchase } from '@/lib/types';

export interface DistributorWithPurchases extends Distributor {
  total_purchases: number;
}

export type CreateDistributorInput = Omit<Distributor, 'id' | 'created_at' | 'updated_at'> & { id?: string };
export type UpdateDistributorInput = Partial<Omit<Distributor, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Fetch all distributors from Supabase along with total purchases count
 */
export async function getDistributors(): Promise<DistributorWithPurchases[]> {
  // 1. Fetch distributors
  const { data: distributorsData, error: distributorsError } = await supabase
    .from('distributors')
    .select('*')
    .order('created_at', { ascending: false });

  if (distributorsError) {
    console.error('Error fetching distributors from Supabase:', distributorsError);
    throw new Error(distributorsError.message);
  }

  const distributors = (distributorsData || []) as Distributor[];

  if (distributors.length === 0) {
    return [];
  }

  // 2. Fetch purchases to compute total purchases per distributor_id
  const { data: purchasesData, error: purchasesError } = await supabase
    .from('purchases')
    .select('distributor_id');

  if (purchasesError) {
    console.warn('Warning fetching purchases for count:', purchasesError.message);
  }

  const purchaseCountsMap: Record<string, number> = {};
  if (purchasesData) {
    for (const p of purchasesData) {
      if (p.distributor_id) {
        purchaseCountsMap[p.distributor_id] = (purchaseCountsMap[p.distributor_id] || 0) + 1;
      }
    }
  }

  // 3. Map distributors to DistributorWithPurchases
  return distributors.map((d) => ({
    ...d,
    total_purchases: purchaseCountsMap[d.id] || 0,
  }));
}

/**
 * Fetch a single distributor by ID (UUID or distributor_code)
 */
export async function getDistributorById(id: string): Promise<DistributorWithPurchases | null> {
  if (!id) return null;

  // Try fetching by UUID primary key
  let { data, error } = await supabase
    .from('distributors')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  // Fallback to query by distributor_code
  if (!data) {
    const { data: dataByCode } = await supabase
      .from('distributors')
      .select('*')
      .eq('distributor_code', id)
      .maybeSingle();

    data = dataByCode;
  }

  if (!data) return null;

  // Fetch purchases count
  const { data: purchasesData } = await supabase
    .from('purchases')
    .select('id')
    .eq('distributor_id', data.id);

  const totalPurchases = purchasesData ? purchasesData.length : 0;

  return {
    ...(data as Distributor),
    total_purchases: totalPurchases,
  };
}

/**
 * Auto-generate next distributor code starting from distri-101
 * If existing codes are distri-101, distri-102, returns next distri-XXX
 */
export async function getNextDistributorCode(): Promise<string> {
  const { data, error } = await supabase
    .from('distributors')
    .select('distributor_code');

  if (error || !data || data.length === 0) {
    return 'distri-101';
  }

  let maxNum = 100;
  for (const item of data) {
    const code = item.distributor_code || '';
    // Match codes like distri-101, distri-102 or case-insensitive
    const match = code.match(/distri[-_]?(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `distri-${maxNum + 1}`;
}

/**
 * Create a new distributor in Supabase
 */
export async function createDistributor(distributor: CreateDistributorInput): Promise<Distributor> {
  const payload = {
    distributor_code: distributor.distributor_code.trim(),
    name: distributor.name.trim(),
    location: distributor.location ? distributor.location.trim() : null,
    notes: distributor.notes ? distributor.notes.trim() : null,
  };

  const { data, error } = await supabase
    .from('distributors')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating distributor in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Distributor;
}

/**
 * Update an existing distributor in Supabase
 */
export async function updateDistributor(id: string, updates: UpdateDistributorInput): Promise<Distributor> {
  const payload: Record<string, any> = {};

  if (updates.distributor_code !== undefined) {
    payload.distributor_code = updates.distributor_code.trim();
  }
  if (updates.name !== undefined) {
    payload.name = updates.name.trim();
  }
  if (updates.location !== undefined) {
    payload.location = updates.location ? updates.location.trim() : null;
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes ? updates.notes.trim() : null;
  }

  const { data, error } = await supabase
    .from('distributors')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating distributor in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Distributor;
}

/**
 * Delete a distributor from Supabase
 */
export async function deleteDistributor(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('distributors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting distributor from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
