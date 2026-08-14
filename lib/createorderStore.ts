import { supabase } from '@/lib/supabase';
import { Dealer, Product, Order, OrderItem } from '@/lib/types';

export interface DealerOrderOption {
  id: string; // UUID primary key
  unique_id: string; // Dealer_id (e.g. DLR-1001)
  name: string;
  shop_name: string;
  current_credit: number;
  credit_limit: number;
  mobile: string;
}

export interface ProductOrderOption {
  id: string; // UUID primary key
  unique_id: string; // Product_id (e.g. PROD-1001)
  name: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  unit: string;
  company_name?: string;
  category_name?: string;
}

export interface NewOrderItem {
  product_id: string;
  product_name: string;
  product_unique_id: string;
  purchase_price: number;
  requested_quantity: number;
  unit: string;
}

export interface CreateOrderPayload {
  unique_id: string;
  dealer_id: string;
  notes?: string | null;
  items: {
    product_id: string;
    requested_quantity: number;
    purchase_price: number;
  }[];
}

/**
 * Generates an auto-incremented Order unique_id in the format: Order-YYMM-1001
 * Example for August 2026: Order-2608-1001
 */
export async function generateOrderUniqueId(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `Order-${yy}${mm}-`;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('unique_id')
      .ilike('unique_id', `${prefix}%`)
      .order('unique_id', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('Could not query existing orders for sequence, using default:', error);
      return `${prefix}1001`;
    }

    if (!data || data.length === 0) {
      return `${prefix}1001`;
    }

    let highestNum = 1000;
    for (const row of data) {
      if (row.unique_id) {
        const parts = row.unique_id.split('-');
        const numPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(numPart) && numPart > highestNum) {
          highestNum = numPart;
        }
      }
    }

    const nextNum = highestNum + 1;
    return `${prefix}${nextNum}`;
  } catch (err) {
    console.error('Error generating unique_id:', err);
    return `${prefix}1001`;
  }
}

/**
 * Fetches all dealers for dealer dropdown with search
 */
export async function getDealersForOrder(): Promise<DealerOrderOption[]> {
  const { data, error } = await supabase
    .from('dealers')
    .select('id, unique_id, name, shop_name, current_credit, credit_limit, mobile')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching dealers for order:', error);
    throw new Error(error.message);
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    unique_id: d.unique_id,
    name: d.name,
    shop_name: d.shop_name,
    current_credit: Number(d.current_credit || 0),
    credit_limit: Number(d.credit_limit || 0),
    mobile: d.mobile,
  }));
}

/**
 * Fetches all products with purchase_price for item selection dropdown with search
 */
export async function getProductsForOrder(): Promise<ProductOrderOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      unique_id,
      name,
      purchase_price,
      selling_price,
      quantity,
      unit,
      company:companies(name),
      category:categories(name)
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching products for order:', error);
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => {
    const comp = Array.isArray(p.company) ? p.company[0] : p.company;
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;

    return {
      id: p.id,
      unique_id: p.unique_id,
      name: p.name,
      purchase_price: Number(p.purchase_price || 0),
      selling_price: Number(p.selling_price || 0),
      quantity: Number(p.quantity || 0),
      unit: p.unit || 'PCS',
      company_name: comp?.name,
      category_name: cat?.name,
    };
  });
}

/**
 * Creates an order in the orders table and its corresponding items in order_items table.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (!payload.dealer_id) {
    throw new Error('Dealer is required.');
  }

  if (!payload.items || payload.items.length === 0) {
    throw new Error('At least one item must be added to the order.');
  }

  // 1. Insert into orders table
  const orderInsertData = {
    unique_id: payload.unique_id,
    dealer_id: payload.dealer_id,
    status: 'Submitted' as const,
    notes: payload.notes || null,
  };

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([orderInsertData])
    .select()
    .single();

  if (orderError) {
    console.error('Error inserting order into Supabase:', orderError);
    throw new Error(orderError.message);
  }

  const orderId = orderData.id;

  // 2. Prepare items for order_items table
  const itemsToInsert = payload.items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    requested_quantity: Math.max(1, Math.floor(Number(item.requested_quantity))),
    released_quantity: 0,
    selling_price: Number(item.purchase_price || 0),
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error inserting order items into Supabase:', itemsError);
    // Cleanup the created order if items insertion failed
    await supabase.from('orders').delete().eq('id', orderId);
    throw new Error(`Failed to save order items: ${itemsError.message}`);
  }

  return orderData as Order;
}
