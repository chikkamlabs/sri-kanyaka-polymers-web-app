import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';

export interface ProductPdfInput {
  id: string;
  unique_id?: string | null;
  name?: string | null;
  base_price?: number | null;
  purchase_price?: number | null;
  company_id?: string | null;
  category_id?: string | null;
}

interface ProductPdfRow {
  productId: string;
  name: string;
  basePrice: number;
  discount: string;
  purchasePrice: number;
}

interface DiscountRecord {
  company_id: string;
  category_id: string;
  d1?: number | null;
  d2?: number | null;
  d3?: number | null;
  d4?: number | null;
}

/**
 * Prepare filtered dashboard products for PDF.
 *
 * Important:
 * The dashboard passes only the currently filtered products.
 * Therefore the PDF contains exactly what is visible in the dashboard.
 */
async function getProductPdfData(
  products: ProductPdfInput[]
): Promise<ProductPdfRow[]> {
  if (products.length === 0) {
    return [];
  }

  const { data: discounts, error: discountsError } = await supabase
    .from('discounts')
    .select('company_id, category_id, d1, d2, d3, d4');

  if (discountsError) {
    console.error('Error fetching discounts for PDF:', discountsError);
    throw new Error(discountsError.message);
  }

  const discountMap = new Map<string, DiscountRecord>();

  for (const discount of (discounts || []) as DiscountRecord[]) {
    const key = `${discount.company_id}:${discount.category_id}`;

    discountMap.set(key, {
      company_id: discount.company_id,
      category_id: discount.category_id,
      d1: Number(discount.d1 || 0),
      d2: Number(discount.d2 || 0),
      d3: Number(discount.d3 || 0),
      d4: Number(discount.d4 || 0),
    });
  }

  return products.map((product) => {
    const key = `${product.company_id}:${product.category_id}`;
    const discount = discountMap.get(key);

    const d1 = Number(discount?.d1 || 0);
    const d2 = Number(discount?.d2 || 0);
    const d3 = Number(discount?.d3 || 0);
    const d4 = Number(discount?.d4 || 0);

    const totalDiscount = d1 + d2 + d3 - d4;

    return {
      productId:
        product.unique_id || product.id.substring(0, 8),

      name: product.name || '—',

      basePrice: Number(product.base_price || 0),

      discount: `${totalDiscount}%`,

      purchasePrice: Number(product.purchase_price || 0),
    };
  });
}

/**
 * Generate and download the Products PDF.
 *
 * Only the products passed from the dashboard are included.
 * This means active search/company/category/low-stock filters
 * are respected automatically.
 */
export async function generateProductPdf(
  products: ProductPdfInput[]
): Promise<void> {
  const rows = await getProductPdfData(products);

  if (rows.length === 0) {
    throw new Error('No products match the current filters.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Sri Kanyaka Polymers', 14, 16);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Price List', 14, 23);

  // Generated date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);

  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    196,
    16,
    { align: 'right' }
  );

  doc.setTextColor(0);

  autoTable(doc, {
    startY: 30,

    head: [
      [
        'Product ID',
        'Name',
        'B.P',
        'Discount (d1+d2+d3-d4)',
        'P.P',
      ],
    ],

    body: rows.map((row) => [
      row.productId,
      row.name,
      row.basePrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }),
      row.discount,
      row.purchasePrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }),
    ]),

    theme: 'grid',

    styles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
    },

    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      halign: 'center',
    },

    bodyStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
    },

    columnStyles: {
      0: {
        cellWidth: 27,
      },

      1: {
        cellWidth: 'auto',
      },

      2: {
        cellWidth: 28,
        halign: 'right',
      },

      3: {
        cellWidth: 45,
        halign: 'center',
      },

      4: {
        cellWidth: 30,
        halign: 'right',
      },
    },

    alternateRowStyles: {
      fillColor: [248, 244, 238],
    },

    margin: {
      left: 14,
      right: 14,
    },
  });

  doc.save('sri-kanyaka-polymers-products.pdf');
}