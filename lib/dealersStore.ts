import { supabase } from '@/lib/supabase';
import { Dealer, DealerTransaction, DealerTransactionType } from '@/lib/types';

export type CreateDealerInput = Omit<Dealer, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDealerInput = Partial<Omit<Dealer, 'id' | 'created_at' | 'updated_at'>>;

export interface CreateDealerTransactionInput {
  dealer_id: string;
  calc: DealerTransactionType; // 'Credit' | 'Debit'
  amount: number;
}

export interface DealerWithTransactionsSummary extends Dealer {
  total_transactions_count?: number;
}

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
 * Create a new dealer in Supabase and record initial credit transaction if current_credit > 0
 */
export async function createDealer(dealer: CreateDealerInput): Promise<Dealer> {
  const currentCredit = Number(dealer.current_credit) || 0;
  const payload = {
    ...dealer,
    current_credit: currentCredit,
    credit_limit: Number(dealer.credit_limit) || 0,
  };

  const { data, error } = await supabase
    .from('dealers')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating dealer in Supabase:', error);
    throw new Error(error?.message || 'Failed to create dealer');
  }

  const createdDealer = data as Dealer;

  // If current_credit is > 0, create an initial transaction in dealer_transactions
  if (currentCredit > 0) {
    const { error: txError } = await supabase
      .from('dealer_transactions')
      .insert([
        {
          dealer_id: createdDealer.id,
          calc: 'Credit',
          amount: currentCredit,
          credit_after_transaction: currentCredit,
        },
      ]);

    if (txError) {
      console.error('Error creating initial dealer transaction:', txError);
    }
  }

  return createdDealer;
}

/**
 * Create multiple dealers in Supabase and record initial transactions if current_credit > 0
 */
export async function createDealers(dealersList: CreateDealerInput[]): Promise<Dealer[]> {
  if (!dealersList || dealersList.length === 0) return [];

  const createdDealers: Dealer[] = [];

  for (const dealer of dealersList) {
    const currentCredit = Number(dealer.current_credit) || 0;
    const payload = {
      ...dealer,
      current_credit: currentCredit,
      credit_limit: Number(dealer.credit_limit) || 0,
    };

    const { data, error } = await supabase
      .from('dealers')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating dealer in Supabase:', error);
      throw new Error(error?.message || `Failed to create dealer "${dealer.name}"`);
    }

    const createdDealer = data as Dealer;
    createdDealers.push(createdDealer);

    // If current_credit > 0, create a transaction in dealer_transactions
    if (currentCredit > 0) {
      const { error: txError } = await supabase
        .from('dealer_transactions')
        .insert([
          {
            dealer_id: createdDealer.id,
            calc: 'Credit',
            amount: currentCredit,
            credit_after_transaction: currentCredit,
          },
        ]);

      if (txError) {
        console.error(`Error creating initial transaction for dealer ${createdDealer.id}:`, txError);
      }
    }
  }

  return createdDealers;
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

/**
 * Fetch dealer transactions from Supabase (optionally filtered by dealer_id)
 */
export async function getDealerTransactions(dealerId?: string): Promise<DealerTransaction[]> {
  try {
    let query = supabase
      .from('dealer_transactions')
      .select(`
        id,
        dealer_id,
        calc,
        amount,
        credit_after_transaction,
        created_at,
        updated_at,
        dealer:dealers(id, unique_id, name, shop_name, mobile, current_credit, credit_limit)
      `)
      .order('created_at', { ascending: false });

    if (dealerId && dealerId.trim()) {
      query = query.eq('dealer_id', dealerId.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error querying dealer_transactions, checking fallback dealers_transactions:', error);
      // Fallback query if table is named dealers_transactions in some environments
      let fallbackQuery = supabase
        .from('dealers_transactions')
        .select(`
          id,
          dealer_id,
          calc,
          amount,
          credit_after_transaction,
          created_at,
          updated_at,
          dealer:dealers(id, unique_id, name, shop_name, mobile, current_credit, credit_limit)
        `)
        .order('created_at', { ascending: false });

      if (dealerId && dealerId.trim()) {
        fallbackQuery = fallbackQuery.eq('dealer_id', dealerId.trim());
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        throw new Error(error.message || fallbackError.message);
      }
      return (fallbackData || []).map((row: any) => ({
        ...row,
        dealer: Array.isArray(row.dealer) ? row.dealer[0] : row.dealer,
      })) as DealerTransaction[];
    }

    return (data || []).map((row: any) => ({
      ...row,
      dealer: Array.isArray(row.dealer) ? row.dealer[0] : row.dealer,
    })) as DealerTransaction[];
  } catch (err: any) {
    console.error('Error fetching dealer transactions:', err);
    throw new Error(err.message || 'Failed to fetch dealer transactions');
  }
}

/**
 * Create a new transaction in dealer_transactions, calculate credit_after_transaction,
 * and update dealers.current_credit (if credit add, if debit subtract).
 */
export async function createDealerTransaction(input: CreateDealerTransactionInput): Promise<DealerTransaction> {
  const amount = Math.abs(Number(input.amount) || 0);
  if (amount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  // 1. Fetch current dealer credit
  const { data: dealerData, error: dealerFetchError } = await supabase
    .from('dealers')
    .select('id, current_credit')
    .eq('id', input.dealer_id)
    .single();

  if (dealerFetchError || !dealerData) {
    throw new Error(dealerFetchError?.message || 'Selected dealer not found.');
  }

  const currentCredit = Number(dealerData.current_credit) || 0;
  // If Credit add, if Debit subtract
  const creditAfterTransaction = input.calc === 'Credit'
    ? currentCredit + amount
    : currentCredit - amount;

  // 2. Insert into dealer_transactions (with fallback to dealers_transactions)
  const txPayload = {
    dealer_id: input.dealer_id,
    calc: input.calc,
    amount: amount,
    credit_after_transaction: creditAfterTransaction,
  };

  let insertedTx: any = null;

  const { data: txData, error: txError } = await supabase
    .from('dealer_transactions')
    .insert([txPayload])
    .select()
    .single();

  if (txError) {
    console.warn('Error inserting into dealer_transactions, trying fallback dealers_transactions:', txError);
    const { data: fallbackTx, error: fallbackError } = await supabase
      .from('dealers_transactions')
      .insert([txPayload])
      .select()
      .single();

    if (fallbackError) {
      throw new Error(txError.message || fallbackError.message);
    }
    insertedTx = fallbackTx;
  } else {
    insertedTx = txData;
  }

  // 3. Update dealers.current_credit
  const { error: dealerUpdateError } = await supabase
    .from('dealers')
    .update({
      current_credit: creditAfterTransaction,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.dealer_id);

  if (dealerUpdateError) {
    console.error('Error updating dealer current_credit:', dealerUpdateError);
  }

  return insertedTx as DealerTransaction;
}

/**
 * Delete a dealer transaction and adjust dealer credit
 */
export async function deleteDealerTransaction(id: string): Promise<boolean> {
  // First fetch the transaction
  let tx: any = null;
  const { data: txData } = await supabase
    .from('dealer_transactions')
    .select('*')
    .eq('id', id)
    .single();

  tx = txData;
  if (!tx) {
    const { data: fbData } = await supabase
      .from('dealers_transactions')
      .select('*')
      .eq('id', id)
      .single();
    tx = fbData;
  }

  if (tx) {
    // Revert dealer current_credit
    const { data: dData } = await supabase
      .from('dealers')
      .select('current_credit')
      .eq('id', tx.dealer_id)
      .single();

    if (dData) {
      const current = Number(dData.current_credit) || 0;
      const amt = Number(tx.amount) || 0;
      // If was Credit, deleting subtracts. If was Debit, deleting adds.
      const reverted = tx.calc === 'Credit' ? current - amt : current + amt;
      await supabase
        .from('dealers')
        .update({
          current_credit: reverted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.dealer_id);
    }

    // Delete transaction row
    await supabase.from('dealer_transactions').delete().eq('id', id);
    await supabase.from('dealers_transactions').delete().eq('id', id);
  }

  return true;
}
