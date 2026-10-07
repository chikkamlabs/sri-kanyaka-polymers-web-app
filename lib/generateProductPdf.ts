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
  companyId?: string | null;
  categoryId?: string | null;
}

interface DiscountRecord {
  company_id: string;
  category_id: string;
  d1?: number | null;
  d2?: number | null;
  d3?: number | null;
  d4?: number | null;
}

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

    // Keep the existing discount display exactly as requested.
    const discountText = `D1: ${d1}% | D2: ${d2}% | D3: ${d3}% | D4: ${d4}%`;

    return {
      productId: product.unique_id || product.id.substring(0, 8),
      name: product.name || '—',
      basePrice: Number(product.base_price || 0),
      discount: discountText,
      purchasePrice: Number(product.purchase_price || 0),
      companyId: product.company_id,
      categoryId: product.category_id,
    };
  });
}

export async function generateProductPdf(
  products: ProductPdfInput[]
): Promise<void> {
  const rows = await getProductPdfData(products);

  if (rows.length === 0) {
    throw new Error('No products match the current filters.');
  }

  // ---------------------------------------------------------
  // Fetch Company Names
  // ---------------------------------------------------------

  const companyIds = [
    ...new Set(
      products
        .map((product) => product.company_id)
        .filter(Boolean)
    ),
  ];

  const companyMap = new Map<string, string>();

  if (companyIds.length > 0) {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw new Error(companiesError.message);
    }

    for (const company of companies || []) {
      companyMap.set(company.id, company.name || '—');
    }
  }

  // ---------------------------------------------------------
  // Fetch Category Names
  // ---------------------------------------------------------

  const categoryIds = [
    ...new Set(
      products
        .map((product) => product.category_id)
        .filter(Boolean)
    ),
  ];

  const categoryMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw new Error(categoriesError.message);
    }

    for (const category of categories || []) {
      categoryMap.set(category.id, category.name || '—');
    }
  }

  // ---------------------------------------------------------
  // Create PDF
  // ---------------------------------------------------------

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // ---------------------------------------------------------
  // Main Header
  // ---------------------------------------------------------

  const drawMainHeader = () => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);

    doc.text('Sri Kanyaka Polymers', 14, 16);

    doc.setFontSize(11);
    doc.text('Product Price List', 14, 23);

    doc.setFontSize(9);
    doc.setTextColor(100);

    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      pageWidth - 14,
      16,
      {
        align: 'right',
      }
    );

    doc.setTextColor(0);
  };

  drawMainHeader();

  // ---------------------------------------------------------
  // Group Products By Company + Category
  // ---------------------------------------------------------

  const groups = new Map<
    string,
    {
      companyId: string | null | undefined;
      categoryId: string | null | undefined;
      companyName: string;
      categoryName: string;
      rows: ProductPdfRow[];
    }
  >();

  for (const row of rows) {
    const groupKey = `${row.companyId || 'null'}:${row.categoryId || 'null'}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        companyId: row.companyId,
        categoryId: row.categoryId,
        companyName: row.companyId
          ? companyMap.get(row.companyId) || '—'
          : '—',
        categoryName: row.categoryId
          ? categoryMap.get(row.categoryId) || '—'
          : '—',
        rows: [],
      });
    }

    groups.get(groupKey)!.rows.push(row);
  }

  // ---------------------------------------------------------
  // Render Each Company + Category Group
  // ---------------------------------------------------------

  let firstGroup = true;

  for (const group of groups.values()) {
    // Every new Company + Category starts on a new page.
    if (!firstGroup) {
      doc.addPage();
      drawMainHeader();
    }

    firstGroup = false;

    const drawGroupHeader = () => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);

      doc.text(
        `Company: ${group.companyName}`,
        14,
        32
      );

      doc.text(
        `Category: ${group.categoryName}`,
        14,
        38
      );
    };

    drawGroupHeader();

    autoTable(doc, {
      startY: 43,

      head: [
        [
          'Product ID',
          'Name',
          'B.P',
          'Discounts',
          'P.P',
        ],
      ],

      body: group.rows.map((row) => [
        row.productId,
        row.name,

        row.basePrice.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        }),

        // Existing discount display — unchanged.
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
          cellWidth: 60,
          halign: 'center',
          fontSize: 7.5,
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
        top: 43,
        bottom: 15,
      },

      // If this group's table continues to another page,
      // repeat the main header + Company + Category header.
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          // drawMainHeader();
          drawGroupHeader();
        }
      },
    });
  }

  doc.save('sri-kanyaka-polymers-products.pdf');
}