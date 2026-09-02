import { supabase } from '@/lib/supabase';
import { Customer, CustomerTransaction, CustomerTransactionCalculation } from '@/lib/types';

export interface CustomerWithTotalBills extends Customer {
  total_bills: number;
}

export type CreateCustomerInput = {
  name: string;
  mobile?: string | null;
  points?: number;
  credit?: number;
  location?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CreateCustomerTransactionInput = {
  customer_id: string;
  calculation: CustomerTransactionCalculation;
  amount: number;
  notes?: string | null;
};

export type UpdateCustomerTransactionInput = Partial<CreateCustomerTransactionInput>;

/**
 * Fetch all customers along with their calculated total bills
 * (Sum of customer_transactions where calculation === 'sum')
 */
export async function getCustomersWithTotalBills(search?: string): Promise<CustomerWithTotalBills[]> {
  try {
    // 1. Fetch customers
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,location.ilike.%${q}%`);
    }

    const { data: customersData, error: customersError } = await query;

    if (customersError) {
      console.error('Error fetching customers from Supabase:', customersError);
      throw new Error(customersError.message);
    }

    if (!customersData || customersData.length === 0) {
      return [];
    }

    // 2. Fetch customer_transactions where calculation is 'sum' to compute total bills
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('customer_transactions')
      .select('customer_id, calculation, amount')
      .eq('calculation', 'sum');

    if (transactionsError) {
      console.error('Error fetching customer transactions:', transactionsError);
      // Fallback: return customers with 0 total bills
      return customersData.map((c: any) => ({
        ...c,
        points: Number(c.points) || 0,
        credit: Number(c.credit) || 0,
        total_bills: 0,
      }));
    }

    // 3. Map total bills by customer_id
    const totalsMap: Record<string, number> = {};
    (transactionsData || []).forEach((t: any) => {
      const custId = t.customer_id;
      const amt = Number(t.amount) || 0;
      totalsMap[custId] = (totalsMap[custId] || 0) + amt;
    });

    return customersData.map((c: any) => ({
      ...c,
      points: Number(c.points) || 0,
      credit: Number(c.credit) || 0,
      total_bills: totalsMap[c.id] !== undefined ? totalsMap[c.id] : 0,
    }));
  } catch (err: any) {
    console.error('Error in getCustomersWithTotalBills:', err);
    throw err;
  }
}

/**
 * Fetch a single customer by ID
 */
export async function getCustomerById(id: string): Promise<CustomerWithTotalBills | null> {
  if (!id) return null;

  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return null;
    }

    // Fetch sum transactions for this customer
    const { data: txData } = await supabase
      .from('customer_transactions')
      .select('amount')
      .eq('customer_id', id)
      .eq('calculation', 'sum');

    const totalBills = (txData || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    return {
      ...customer,
      points: Number(customer.points) || 0,
      credit: Number(customer.credit) || 0,
      total_bills: totalBills,
    } as CustomerWithTotalBills;
  } catch (err) {
    console.error('Error getting customer by ID:', err);
    return null;
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const payload = {
    name: input.name.trim(),
    mobile: input.mobile?.trim() || null,
    points: Number(input.points) || 0,
    credit: Number(input.credit) || 0,
    location: input.location?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.mobile !== undefined) payload.mobile = input.mobile?.trim() || null;
  if (input.points !== undefined) payload.points = Number(input.points) || 0;
  if (input.credit !== undefined) payload.credit = Number(input.credit) || 0;
  if (input.location !== undefined) payload.location = input.location?.trim() || null;
  if (input.address !== undefined) payload.address = input.address?.trim() || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Fetch customer transactions, optionally filtered by customer_id
 */
export async function getCustomerTransactions(customerId?: string): Promise<CustomerTransaction[]> {
  try {
    let query = supabase
      .from('customer_transactions')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customer transactions:', error);
      throw new Error(error.message);
    }

    return (data || []) as CustomerTransaction[];
  } catch (err: any) {
    console.error('Error in getCustomerTransactions:', err);
    throw err;
  }
}

/**
 * Fetch a single customer transaction by ID
 */
export async function getCustomerTransactionById(id: string): Promise<CustomerTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('customer_transactions')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as CustomerTransaction;
  } catch (err) {
    console.error('Error in getCustomerTransactionById:', err);
    return null;
  }
}

/**
 * Create a new customer transaction
 */
export async function createCustomerTransaction(input: CreateCustomerTransactionInput): Promise<CustomerTransaction> {
  const amount = Number(input.amount) || 0;
  const payload = {
    customer_id: input.customer_id,
    calculation: input.calculation,
    amount: amount,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('customer_transactions')
    .insert([payload])
    .select('*, customer:customers(*)')
    .single();

  if (error) {
    console.error('Error creating customer transaction:', error);
    throw new Error(error.message);
  }

  // Update customer points:
  // if tap sum: update customers.points = customers.points + (1 * amount / 100)
  // if tap subtract: update customers.points = customers.points - (1 * amount / 100)
  try {
    const { data: customerData, error: custFetchErr } = await supabase
      .from('customers')
      .select('points')
      .eq('id', input.customer_id)
      .single();

    if (!custFetchErr && customerData) {
      const currentPoints = Number(customerData.points) || 0;
      const pointsDelta = (1 * amount) / 100;
      const newPoints = input.calculation === 'sum'
        ? currentPoints + pointsDelta
        : currentPoints - pointsDelta;

      await supabase
        .from('customers')
        .update({
          points: newPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.customer_id);
    }
  } catch (ptsErr) {
    console.error('Error updating customer points after creating transaction:', ptsErr);
  }

  return data as CustomerTransaction;
}

/**
 * Update an existing customer transaction
 */
export async function updateCustomerTransaction(
  id: string,
  input: UpdateCustomerTransactionInput
): Promise<CustomerTransaction> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.customer_id !== undefined) payload.customer_id = input.customer_id;
  if (input.calculation !== undefined) payload.calculation = input.calculation;
  if (input.amount !== undefined) payload.amount = Number(input.amount) || 0;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from('customer_transactions')
    .update(payload)
    .eq('id', id)
    .select('*, customer:customers(*)')
    .single();

  if (error) {
    console.error('Error updating customer transaction:', error);
    throw new Error(error.message);
  }

  return data as CustomerTransaction;
}

/**
 * Delete a customer transaction
 */
export async function deleteCustomerTransaction(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('customer_transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer transaction:', error);
    throw new Error(error.message);
  }

  return true;
}
