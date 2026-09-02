import { supabase } from '@/lib/supabase';

export interface DashboardMetrics {
  totalProducts: number;
  totalCustomers: number;
  todayOrders: number;
  todayPayments: number;
  totalCredit: number;
}

/**
 * Get start and end ISO strings for today in local time
 */
function getTodayDateRange(): { startIso: string; endIso: string; todayDateStr: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${y}-${m}-${d}`;

  return {
    startIso: startOfDay.toISOString(),
    endIso: endOfDay.toISOString(),
    todayDateStr,
  };
}

/**
 * 1. Total products (count)
 */
export async function getTotalProductsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('Error getting total products count:', error);
      const { data } = await supabase.from('products').select('id');
      return data?.length || 0;
    }
    return count || 0;
  } catch (err) {
    console.error('Failed to get products count:', err);
    return 0;
  }
}

/**
 * 2. Total customers (count)
 */
export async function getTotalCustomersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('Error getting total customers count:', error);
      const { data } = await supabase.from('customers').select('id');
      return data?.length || 0;
    }
    return count || 0;
  } catch (err) {
    console.error('Failed to get customers count:', err);
    return 0;
  }
}

/**
 * 3. Today Orders (count)
 */
export async function getTodayOrdersCount(): Promise<number> {
  try {
    const { startIso, endIso, todayDateStr } = getTodayDateRange();

    // Query orders created today
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at');

    if (error) {
      console.warn('Error getting orders for today:', error);
      return 0;
    }

    const todayOrders = (data || []).filter((ord) => {
      if (!ord.created_at) return false;
      const orderDate = ord.created_at.split('T')[0];
      const ordTime = new Date(ord.created_at).getTime();
      return orderDate === todayDateStr || (ordTime >= new Date(startIso).getTime() && ordTime <= new Date(endIso).getTime());
    });

    return todayOrders.length;
  } catch (err) {
    console.error('Failed to get today orders count:', err);
    return 0;
  }
}

/**
 * 4. Today payments (sum of value of dealers transactions where type = sum and date is today)
 */
export async function getTodayPaymentsSum(): Promise<number> {
  try {
    const { startIso, endIso, todayDateStr } = getTodayDateRange();

    // Try dealer_transactions and fallback to dealers_transactions
    let txRows: any[] = [];
    const { data, error } = await supabase
      .from('dealer_transactions')
      .select('*');

    if (error || !data) {
      const { data: fallbackData } = await supabase
        .from('dealers_transactions')
        .select('*');
      txRows = fallbackData || [];
    } else {
      txRows = data || [];
    }

    // Also check customer_transactions in case user records payments there as type = sum
    const { data: custTxData } = await supabase
      .from('customer_transactions')
      .select('*');

    let totalSum = 0;

    // Filter dealer transactions for today where type/calc is 'sum' (or credit/sum)
    for (const tx of txRows) {
      const txDate = tx.created_at ? tx.created_at.split('T')[0] : '';
      const txTime = tx.created_at ? new Date(tx.created_at).getTime() : 0;
      const isToday = txDate === todayDateStr || (txTime >= new Date(startIso).getTime() && txTime <= new Date(endIso).getTime());

      if (isToday) {
        const calcVal = String(tx.calc || tx.type || tx.calculation || '').toLowerCase();
        // Check if type/calc is 'sum' or 'credit'
        if (calcVal === 'sum' || calcVal === 'credit') {
          totalSum += Number(tx.amount || 0);
        }
      }
    }

    // Also include customer transactions if type/calculation = sum for today
    for (const ctx of custTxData || []) {
      const ctxDate = ctx.created_at ? ctx.created_at.split('T')[0] : '';
      const ctxTime = ctx.created_at ? new Date(ctx.created_at).getTime() : 0;
      const isToday = ctxDate === todayDateStr || (ctxTime >= new Date(startIso).getTime() && ctxTime <= new Date(endIso).getTime());

      if (isToday) {
        const calcVal = String(ctx.calculation || ctx.calc || ctx.type || '').toLowerCase();
        if (calcVal === 'sum') {
          totalSum += Number(ctx.amount || 0);
        }
      }
    }

    return totalSum;
  } catch (err) {
    console.error('Failed to get today payments sum:', err);
    return 0;
  }
}

/**
 * 5. Total credit (sum of dealers.current_credit)
 */
export async function getTotalCreditSum(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('current_credit');

    if (error) {
      console.warn('Error getting dealers credit sum:', error);
      return 0;
    }

    const totalCredit = (data || []).reduce((acc, d) => acc + (Number(d.current_credit) || 0), 0);
    return totalCredit;
  } catch (err) {
    console.error('Failed to get total credit sum:', err);
    return 0;
  }
}

/**
 * Fetch all dashboard metrics together
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalProducts, totalCustomers, todayOrders, todayPayments, totalCredit] = await Promise.all([
    getTotalProductsCount(),
    getTotalCustomersCount(),
    getTodayOrdersCount(),
    getTodayPaymentsSum(),
    getTotalCreditSum(),
  ]);

  return {
    totalProducts,
    totalCustomers,
    todayOrders,
    todayPayments,
    totalCredit,
  };
}
