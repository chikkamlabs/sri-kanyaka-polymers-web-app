import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/lib/types';

export interface OrderListItem {
  id: string;
  unique_id: string;
  dealer_id: string;
  dealer_name: string;
  dealer_unique_id: string;
  status: OrderStatus;
  items_count: number;
  created_at: string;
  notes?: string | null;
}

export interface OpenOrderDetail {
  id: string;
  unique_id: string;
  status: OrderStatus;
  notes?: string | null;
  created_at: string;
  dealer: {
    id: string;
    unique_id: string;
    name: string;
    shop_name: string;
    current_credit: number;
    credit_limit: number;
    mobile: string;
  };
  items: {
    id: string;
    product_id: string;
    product_name: string;
    product_unique_id: string;
    unit: string;
    purchase_price: number; // p.p
    requested_quantity: number;
    released_quantity: number;
    selling_price: number;
  }[];
}

export interface UpdateOrderItemPayload {
  id: string;
  released_quantity: number;
  selling_price: number;
}

/**
 * Fetches all orders with dealer details and item counts.
 * Supports date range and search filtering.
 */
export async function getOrders(filters?: {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  search?: string;
}): Promise<OrderListItem[]> {
  let query = supabase
    .from('orders')
    .select(`
      id,
      unique_id,
      dealer_id,
      status,
      notes,
      created_at,
      dealer:dealers(id, unique_id, name),
      order_items(id)
    `)
    .order('created_at', { ascending: false });

  if (filters?.fromDate) {
    const fromIso = `${filters.fromDate}T00:00:00.000Z`;
    query = query.gte('created_at', fromIso);
  }

  if (filters?.toDate) {
    const toIso = `${filters.toDate}T23:59:59.999Z`;
    query = query.lte('created_at', toIso);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders from Supabase:', error);
    throw new Error(error.message);
  }

  let ordersList: OrderListItem[] = (data || []).map((row: any) => {
    const dealerObj = Array.isArray(row.dealer) ? row.dealer[0] : row.dealer;
    const itemsCount = Array.isArray(row.order_items) ? row.order_items.length : 0;

    return {
      id: row.id,
      unique_id: row.unique_id,
      dealer_id: row.dealer_id,
      dealer_name: dealerObj?.name || 'Unknown Dealer',
      dealer_unique_id: dealerObj?.unique_id || 'N/A',
      status: row.status as OrderStatus,
      items_count: itemsCount,
      created_at: row.created_at,
      notes: row.notes,
    };
  });

  // Client-side text search for Search (order id, dealer name, dealer_id)
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    ordersList = ordersList.filter(
      (o) =>
        o.unique_id.toLowerCase().includes(q) ||
        o.dealer_name.toLowerCase().includes(q) ||
        o.dealer_unique_id.toLowerCase().includes(q)
    );
  }

  return ordersList;
}

/**
 * Fetches order details by order UUID, including dealer info and order_items with product details (p.p).
 */
export async function getOrderDetailsById(orderId: string): Promise<OpenOrderDetail> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      unique_id,
      status,
      notes,
      created_at,
      dealer:dealers(
        id,
        unique_id,
        name,
        shop_name,
        current_credit,
        credit_limit,
        mobile
      ),
      order_items(
        id,
        product_id,
        requested_quantity,
        released_quantity,
        selling_price,
        product:products(
          id,
          name,
          unique_id,
          unit,
          purchase_price,
          selling_price
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    console.error('Error fetching order detail from Supabase:', error);
    throw new Error(error?.message || 'Order not found.');
  }

  const dealerObj = Array.isArray(data.dealer) ? data.dealer[0] : data.dealer;

  const rawItems = (data.order_items || []) as any[];
  const formattedItems = rawItems.map((item: any) => {
    const prod = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      id: item.id,
      product_id: item.product_id,
      product_name: prod?.name || 'Unknown Product',
      product_unique_id: prod?.unique_id || 'PROD-N/A',
      unit: prod?.unit || 'PCS',
      purchase_price: Number(prod?.purchase_price || 0), // p.p from product
      requested_quantity: Number(item.requested_quantity || 0),
      released_quantity: Number(item.released_quantity || 0),
      selling_price: Number(item.selling_price || prod?.selling_price || 0),
    };
  });

  return {
    id: data.id,
    unique_id: data.unique_id,
    status: data.status as OrderStatus,
    notes: data.notes,
    created_at: data.created_at,
    dealer: {
      id: dealerObj?.id || '',
      unique_id: dealerObj?.unique_id || '',
      name: dealerObj?.name || 'Unknown Dealer',
      shop_name: dealerObj?.shop_name || '',
      current_credit: Number(dealerObj?.current_credit || 0),
      credit_limit: Number(dealerObj?.credit_limit || 0),
      mobile: dealerObj?.mobile || '',
    },
    items: formattedItems,
  };
}

/**
 * Updates order items (released_quantity and selling_price) in Supabase.
 * Also updates order status and timestamps.
 */
export async function updateOrderItems(
  orderId: string,
  items: UpdateOrderItemPayload[],
  status?: OrderStatus
): Promise<void> {
  if (!orderId) {
    throw new Error('Order ID is required.');
  }

  const now = new Date().toISOString();

  // 1. Update each order item
  for (const item of items) {
    const { error: itemError } = await supabase
      .from('order_items')
      .update({
        released_quantity: Math.max(0, Math.floor(Number(item.released_quantity || 0))),
        selling_price: Number(item.selling_price || 0),
        updated_at: now,
      })
      .eq('id', item.id);

    if (itemError) {
      console.error(`Error updating order item ${item.id}:`, itemError);
      throw new Error(`Failed to update item: ${itemError.message}`);
    }
  }

  // 2. Update order updated_at and status if provided
  const updatePayload: any = {
    updated_at: now,
  };
  if (status) {
    updatePayload.status = status;
  }

  const { error: orderError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (orderError) {
    console.error('Error updating order status in Supabase:', orderError);
    throw new Error(`Failed to update order: ${orderError.message}`);
  }
}
