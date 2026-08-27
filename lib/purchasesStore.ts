import { supabase } from '@/lib/supabase';
import { Purchase, PurchaseItem, Distributor, Product } from '@/lib/types';

export interface PurchaseListItem {
  id: string;
  purchase_id: string;
  distributor_id: string;
  distributor_name: string;
  distributor_code: string;
  distributor_location: string | null;
  quantity: number;
  total_items_quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface PurchaseDetailItem {
  id: string;
  product_id: string;
  product_name: string;
  product_unique_id?: string;
  company_name?: string;
  category_name?: string;
  quantity: number;
}

export interface PurchaseDetail {
  id: string;
  purchase_id: string;
  distributor_id: string;
  distributor_name: string;
  distributor_code: string;
  distributor_location: string | null;
  quantity: number;
  total_items_quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: PurchaseDetailItem[];
}

export interface DistributorOption {
  id: string;
  distributor_code: string;
  name: string;
  location: string | null;
}

export interface ProductPurchaseOption {
  id: string;
  unique_id: string;
  name: string;
  company_id: string;
  company_name: string;
  category_id: string;
  category_name: string;
  purchase_price: number;
  quantity: number;
  unit: string;
}

export interface CreatePurchasePayload {
  purchase_id: string;
  distributor_id: string;
  status?: string;
  notes?: string | null;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
  }[];
}

export interface UpdatePurchasePayload {
  purchase_id?: string;
  distributor_id?: string;
  status?: string;
  notes?: string | null;
  items?: {
    id?: string;
    product_id: string;
    product_name: string;
    quantity: number;
  }[];
}

/**
 * Generate auto-incremented Purchase ID in the format: purchase-yymm-101 (+1 for each new purchase)
 * E.g., purchase-2608-101, purchase-2608-102
 */
export async function generatePurchaseId(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `purchase-${yy}${mm}-`;

  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('purchase_id')
      .ilike('purchase_id', `${prefix}%`)
      .order('purchase_id', { ascending: false });

    if (error) {
      console.warn('Could not query existing purchases for sequence:', error);
      return `${prefix}101`;
    }

    if (!data || data.length === 0) {
      return `${prefix}101`;
    }

    let highestNum = 100;
    for (const row of data) {
      if (row.purchase_id) {
        const parts = row.purchase_id.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
    }

    return `${prefix}${highestNum + 1}`;
  } catch (err) {
    console.error('Error generating purchase_id:', err);
    return `${prefix}101`;
  }
}

/**
 * Fetch all distributors for dropdown selection
 */
export async function getDistributorsForPurchase(): Promise<DistributorOption[]> {
  const { data, error } = await supabase
    .from('distributors')
    .select('id, distributor_code, name, location')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching distributors:', error);
    throw new Error(error.message);
  }

  return (data || []) as DistributorOption[];
}

/**
 * Fetch all products with company & category for product search & selection
 */
export async function getProductsForPurchase(): Promise<ProductPurchaseOption[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      unique_id,
      name,
      purchase_price,
      quantity,
      unit,
      company_id,
      category_id,
      company:companies(id, name),
      category:categories(id, name)
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching products for purchase:', error);
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => {
    const comp = Array.isArray(p.company) ? p.company[0] : p.company;
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;

    return {
      id: p.id,
      unique_id: p.unique_id || 'N/A',
      name: p.name,
      company_id: p.company_id,
      company_name: comp?.name || 'Unknown Company',
      category_id: p.category_id,
      category_name: cat?.name || 'General',
      purchase_price: Number(p.purchase_price) || 0,
      quantity: p.quantity || 0,
      unit: p.unit || 'PCS',
    };
  });
}

/**
 * Fetch purchases list with date filtering and search
 */
export async function getPurchases(filters?: {
  fromDate?: string;
  toDate?: string;
  search?: string;
}): Promise<PurchaseListItem[]> {
  let query = supabase
    .from('purchases')
    .select(`
      id,
      purchase_id,
      distributor_id,
      quantity,
      status,
      notes,
      created_at,
      updated_at,
      distributor:distributors(id, distributor_code, name, location),
      purchase_items(id, quantity)
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
    console.error('Error fetching purchases:', error);
    throw new Error(error.message);
  }

  const list: PurchaseListItem[] = (data || []).map((row: any) => {
    const distObj = Array.isArray(row.distributor) ? row.distributor[0] : row.distributor;
    const items = (row.purchase_items || []) as { id: string; quantity: number }[];
    
    // Sum of quantity across all purchase_items for this purchase
    const totalItemsQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return {
      id: row.id,
      purchase_id: row.purchase_id,
      distributor_id: row.distributor_id,
      distributor_name: distObj?.name || 'Unknown Distributor',
      distributor_code: distObj?.distributor_code || 'N/A',
      distributor_location: distObj?.location || null,
      quantity: row.quantity ?? totalItemsQuantity,
      total_items_quantity: totalItemsQuantity,
      status: row.status || 'Submitted',
      notes: row.notes || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      items_count: items.length,
    };
  });

  // Filter search by distributor name or distributor_id / code or purchase_id
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    return list.filter((item) => {
      const matchName = item.distributor_name.toLowerCase().includes(q);
      const matchDistCode = item.distributor_code.toLowerCase().includes(q);
      const matchDistId = item.distributor_id.toLowerCase().includes(q);
      const matchPurchaseId = item.purchase_id.toLowerCase().includes(q);
      return matchName || matchDistCode || matchDistId || matchPurchaseId;
    });
  }

  return list;
}

/**
 * Fetch a single purchase by ID with all its items and product info
 */
export async function getPurchaseById(id: string): Promise<PurchaseDetail | null> {
  if (!id) return null;

  // 1. Fetch purchase + distributor
  let { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .select(`
      id,
      purchase_id,
      distributor_id,
      quantity,
      status,
      notes,
      created_at,
      updated_at,
      distributor:distributors(id, distributor_code, name, location)
    `)
    .eq('id', id)
    .maybeSingle();

  // If not found by UUID, try by purchase_id string
  if (!purchaseData) {
    const { data: purchaseByCode } = await supabase
      .from('purchases')
      .select(`
        id,
        purchase_id,
        distributor_id,
        quantity,
        status,
        notes,
        created_at,
        updated_at,
        distributor:distributors(id, distributor_code, name, location)
      `)
      .eq('purchase_id', id)
      .maybeSingle();

    purchaseData = purchaseByCode;
  }

  if (purchaseError || !purchaseData) {
    return null;
  }

  // 2. Fetch purchase_items with products
  const { data: itemsData, error: itemsError } = await supabase
    .from('purchase_items')
    .select(`
      id,
      product_id,
      product_name,
      quantity,
      product:products(
        id,
        unique_id,
        name,
        company:companies(id, name),
        category:categories(id, name)
      )
    `)
    .eq('purchase_id', purchaseData.id)
    .order('created_at', { ascending: true });

  if (itemsError) {
    console.error('Error fetching purchase items:', itemsError);
  }

  const items: PurchaseDetailItem[] = (itemsData || []).map((it: any) => {
    const prod = Array.isArray(it.product) ? it.product[0] : it.product;
    const comp = prod?.company ? (Array.isArray(prod.company) ? prod.company[0] : prod.company) : null;
    const cat = prod?.category ? (Array.isArray(prod.category) ? prod.category[0] : prod.category) : null;

    return {
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name || prod?.name || 'Product',
      product_unique_id: prod?.unique_id,
      company_name: comp?.name,
      category_name: cat?.name,
      quantity: Number(it.quantity) || 0,
    };
  });

  const distObj = Array.isArray(purchaseData.distributor) ? purchaseData.distributor[0] : purchaseData.distributor;
  const totalItemsQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: purchaseData.id,
    purchase_id: purchaseData.purchase_id,
    distributor_id: purchaseData.distributor_id,
    distributor_name: distObj?.name || 'Unknown Distributor',
    distributor_code: distObj?.distributor_code || 'N/A',
    distributor_location: distObj?.location || null,
    quantity: purchaseData.quantity ?? totalItemsQuantity,
    total_items_quantity: totalItemsQuantity,
    status: purchaseData.status || 'Submitted',
    notes: purchaseData.notes || null,
    created_at: purchaseData.created_at,
    updated_at: purchaseData.updated_at,
    items,
  };
}

/**
 * Create a new purchase along with its items
 */
export async function createPurchase(payload: CreatePurchasePayload): Promise<Purchase> {
  const totalQuantity = payload.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  // 1. Insert into purchases table
  const { data: purchaseRow, error: purchaseError } = await supabase
    .from('purchases')
    .insert([
      {
        purchase_id: payload.purchase_id.trim(),
        distributor_id: payload.distributor_id,
        quantity: totalQuantity,
        status: payload.status || 'Submitted',
        notes: payload.notes ? payload.notes.trim() : null,
      },
    ])
    .select()
    .single();

  if (purchaseError) {
    console.error('Error inserting purchase:', purchaseError);
    throw new Error(purchaseError.message);
  }

  // 2. Insert items into purchase_items table
  if (payload.items && payload.items.length > 0) {
    const itemsToInsert = payload.items.map((item) => ({
      purchase_id: purchaseRow.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: Number(item.quantity) || 1,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error inserting purchase items:', itemsError);
      // Attempt rollback of purchase row if items fail
      await supabase.from('purchases').delete().eq('id', purchaseRow.id);
      throw new Error(`Failed to insert purchase items: ${itemsError.message}`);
    }
  }

  return purchaseRow as Purchase;
}

/**
 * Update an existing purchase and synchronise its purchase_items
 */
export async function updatePurchase(id: string, payload: UpdatePurchasePayload): Promise<void> {
  const updateData: Record<string, any> = {};

  if (payload.purchase_id !== undefined) updateData.purchase_id = payload.purchase_id.trim();
  if (payload.distributor_id !== undefined) updateData.distributor_id = payload.distributor_id;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.notes !== undefined) updateData.notes = payload.notes ? payload.notes.trim() : null;

  if (payload.items) {
    const totalQuantity = payload.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    updateData.quantity = totalQuantity;
  }

  // 1. Update purchase header
  const { error: purchaseError } = await supabase
    .from('purchases')
    .update(updateData)
    .eq('id', id);

  if (purchaseError) {
    console.error('Error updating purchase:', purchaseError);
    throw new Error(purchaseError.message);
  }

  // 2. Update items if provided
  if (payload.items) {
    // Delete existing purchase items
    const { error: deleteError } = await supabase
      .from('purchase_items')
      .delete()
      .eq('purchase_id', id);

    if (deleteError) {
      console.error('Error removing old purchase items:', deleteError);
      throw new Error(deleteError.message);
    }

    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((item) => ({
        purchase_id: id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: Number(item.quantity) || 1,
      }));

      const { error: insertError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Error inserting new purchase items:', insertError);
        throw new Error(insertError.message);
      }
    }
  }
}

/**
 * Delete a purchase and cascade deletes items
 */
export async function deletePurchase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting purchase:', error);
    throw new Error(error.message);
  }

  return true;
}
