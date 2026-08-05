import { supabase } from '@/lib/supabase';
import { Dealer } from '@/lib/types';

export type CreateDealerInput = Omit<Dealer, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDealerInput = Partial<Omit<Dealer, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Fetch all dealers from Supabase
 */
export async function getDealers(): Promise<Dealer[]> {
  const { data, error } = await supabase
    .from('dealers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dealers from Supabase:', error);
    throw new Error(error.message);
  }

  return (data || []) as Dealer[];
}

/**
 * Fetch a single dealer by ID or unique_id
 */
export async function getDealerById(id: string): Promise<Dealer | null> {
  if (!id) return null;

  // Try fetching by primary key UUID first
  const { data, error } = await supabase
    .from('dealers')
    .select('*')
    .eq('id', id)
    .single();

  if (data) return data as Dealer;

  // Fallback to query by unique_id
  const { data: dataByUniqueId } = await supabase
    .from('dealers')
    .select('*')
    .eq('unique_id', id)
    .single();

  return (dataByUniqueId || null) as Dealer | null;
}

/**
 * Create a new dealer in Supabase
 */
export async function createDealer(dealer: CreateDealerInput): Promise<Dealer> {
  const payload = {
    ...dealer,
    current_credit: Number(dealer.current_credit) || 0,
    credit_limit: Number(dealer.credit_limit) || 0,
  };

  const { data, error } = await supabase
    .from('dealers')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating dealer in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Dealer;
}

/**
 * Update an existing dealer in Supabase
 */
export async function updateDealer(id: string, updates: UpdateDealerInput): Promise<Dealer> {
  const payload: Record<string, any> = { ...updates };

  if (updates.current_credit !== undefined) {
    payload.current_credit = Number(updates.current_credit) || 0;
  }
  if (updates.credit_limit !== undefined) {
    payload.credit_limit = Number(updates.credit_limit) || 0;
  }

  const { data, error } = await supabase
    .from('dealers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating dealer in Supabase:', error);
    throw new Error(error.message);
  }

  return data as Dealer;
}

/**
 * Delete a dealer from Supabase
 */
export async function deleteDealer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('dealers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting dealer from Supabase:', error);
    throw new Error(error.message);
  }

  return true;
}
