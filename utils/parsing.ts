import * as XLSX from 'xlsx';
import { Product, GoodsReceipt, OpenOrder, Sale, ShcDataRow, PlanogramRow, OrgStructureRow, CategoryRelationRow } from '../db';
import { ShcDataType } from './types';

export const parseDateToObj = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
};
  
export const parseDateToSortableFormat = (dateStr: string | undefined): string => {
  if (!dateStr) return '00000000';
  const parts = dateStr.match(/(\d+)/g);
  if (!parts || parts.length < 3) return '00000000';
  let [day, month, year] = parts;
  if (day.length === 4) { // Handle YYYY/DD/MM
      [year, day, month] = parts;
  } else if (month.length === 4) { // Handle MM/YYYY/DD
      [month, year, day] = parts;
  } // Assume DD/MM/YYYY otherwise
  
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear.padStart(4, '0')}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
};

export const productRowMapper = (row: { [key: string]: string }): Product => {
    const parseNum = (val: string | undefined) => {
        if (val === undefined) return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const estimatedReceivings: { date: string, quantity: number }[] = [];
    const dateRegex = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;
    for (const key in row) {
        if (dateRegex.test(key.trim())) {
            const quantity = parseNum(row[key]);
            if (quantity > 0) {
                estimatedReceivings.push({ date: key.trim(), quantity });
            }
        }
    }
    
    const rawProductId = row['ITEM NR SHORT']?.trim() ?? '';
    let processedProductId = rawProductId;
    if (/^\d+$/.test(rawProductId)) {
        processedProductId = String(parseInt(rawProductId, 10));
    }

    return {
        warehouseId: row['WH NR']?.trim() ?? '',
        productId: processedProductId,
        productId_lower: processedProductId.toLowerCase(),
        fullProductId: row['ITEM NR FULL']?.trim() ?? '',
        name: row['ITEM DESC']?.trim() ?? '',
        caseSize: parseNum(row['CASE SIZE']),
        shelfLifeAtReceiving: parseNum(row['W-DATE DAYS']),
        shelfLifeAtStore: parseNum(row['S-DATE DAYS']),
        customerShelfLife: parseNum(row['C-DATE DAYS']),
        price: parseNum(row['RETAIL PRICE']),
        status: row['ITEM STATUS']?.trim() ?? '',
        promoDate: row['ADV DATE']?.trim() ?? '',
        supplierId: row['SUPPLIER NR']?.trim() ?? '',
        supplierName: row['SUPPLIER NAME']?.trim() ?? '',
        stockOnHand: parseNum(row['STOCK ON HAND']),
        storeAllocationToday: parseNum(row['STORE ALLOC C']),
        storeAllocationTotal: parseNum(row['STORE ALLOC C <']),
        estimatedReceivings: estimatedReceivings,
        dispoGroup: row['DISPO GROUP']?.trim() ?? '',
        itemGroup: row['ITEM GROUP']?.trim() ?? '',
        orderArea: row['ORDER AREA']?.trim() ?? '',
        cartonsPerLayer: parseNum(row['LAYER FACTOR']),
        duessFactor: parseNum(row['DUESS FACTOR']),
        cartonsPerPallet: parseNum(row['EURO FACTOR']),
        itemLocked: row['ITEM LOCKED']?.trim() ?? '',
        slotNr: row['SLOT NR']?.trim() ?? '',
        unprocessedDeliveryQty: parseNum(row['UNPROC DEL QTY']),
    };
};
  
export const goodsReceiptRowMapper = (row: { [key: string]: string }): GoodsReceipt => {
  const parseNum = (val: string | undefined) => {
      if (val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
  };
  
  const fullProductId = row['ITEM NR']?.trim() ?? '';
  let productId = '';
  if (fullProductId && fullProductId.length > 4) {
      const productIdWithoutLast4 = fullProductId.slice(0, -4);
      if (/^\d+$/.test(productIdWithoutLast4)) {
          productId = String(parseInt(productIdWithoutLast4, 10));
      } else {
          productId = productIdWithoutLast4;
      }
  }
  
  const deliveryDate = row['DELIVERY DATE']?.trim() ?? '';
  const bestBeforeDate = row['BEST BEFORE DATE']?.trim() ?? '';

  return {
      warehouseId: row['WH NR']?.trim() ?? '',
      fullProductId: fullProductId,
      deliveryNote: row['DELIVERY NOTE']?.trim() ?? '',
      productId: productId,
      name: row['ITEM DESC']?.trim() ?? '',
      deliveryUnit: row['DELIVERY UNIT OF MEASURE (CASES)']?.trim() ?? '',
      deliveryQtyUom: parseNum(row['DELIVERY QTY (in UOM)']),
      caseSize: parseNum(row['CASE SIZE']),
      deliveryQtyPcs: parseNum(row['DELIVERY QTY (in PIECES)']),
      poNr: row['PO NR']?.trim() ?? '',
      deliveryDate,
      bestBeforeDate,
      bolNr: row['BOL NR']?.trim() ?? '',
      supplierId: row['SUPPLIER NR']?.trim() ?? '',
      supplierName: row['SUPPLIER DESC']?.trim() ?? '',
      intSupplierNr: row['INT SUPPLIER NR']?.trim() ?? '',
      intItemNr: row['INT ITEM NR']?.trim() ?? '',
      caseGtin: row['CASE GTIN']?.trim() ?? '',
      liaReference: row['LIA REFERENCE']?.trim() ?? '',
      deliveryDateSortable: parseDateToSortableFormat(deliveryDate),
      bestBeforeDateSortable: parseDateToSortableFormat(bestBeforeDate),
  };
};

export const openOrderRowMapper = (row: { [key: string]: string }): OpenOrder => {
  const parseNum = (val: string | undefined) => {
      if (val === undefined) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
  };

  const fullProductId = row['ITEM NR']?.trim() ?? '';
  let productId = '';
  if (fullProductId && fullProductId.length > 4) {
      const productIdWithoutLast4 = fullProductId.slice(0, -4);
      if (/^\d+$/.test(productIdWithoutLast4)) {
          productId = String(parseInt(productIdWithoutLast4, 10));
      } else {
          productId = productIdWithoutLast4;
      }
  }

  const deliveryDateStr = row['DELIVERY DATE']?.trim();
  const creationDateStr = row['CREATION DATE']?.trim();
  
  const deliveryDate = parseDateToObj(deliveryDateStr);
  const creationDate = parseDateToObj(creationDateStr);
  
  let deliveryLeadTime = -1;
  if (deliveryDate && creationDate) {
      const timeDiff = deliveryDate.getTime() - creationDate.getTime();
      deliveryLeadTime = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  return {
      warehouseId: row['WH NR']?.trim() ?? '',
      fullProductId,
      poNr: row['PO NR']?.trim() ?? '',
      productId: productId,
      name: row['ITEM DESC']?.trim() ?? '',
      orderUnit: row['ORDER UNIT OF MEASURE (CASES)']?.trim() ?? '',
      orderQtyUom: parseNum(row['ORDER QTY (in UOM)']),
      caseSize: parseNum(row['CASE SIZE']),
      orderQtyPcs: parseNum(row['ORDER QTY (in PIECES)']),
      supplierId: row['SUPPLIER NR']?.trim() ?? '',
      supplierName: row['SUPPLIER DESC']?.trim() ?? '',
      deliveryDate: deliveryDateStr ?? '',
      creationDate: creationDateStr ?? '',
      deliveryLeadTime,
      deliveryDateSortable: parseDateToSortableFormat(deliveryDateStr)
  };
};
  
export const saleRowMapper = (row: string[]): Sale | null => {
    if (row.length < 5) return null;
    
    const resaleDate = row[0]?.trim() ?? '';
    const warehouseId = row[1]?.trim() ?? '';
    // row[2] is warehouse name, we skip it
    const productId = row[3]?.trim() ?? '';
    const productName = row[4]?.trim() ?? '';
    
    // Handle cases where quantity is split into multiple columns
    const quantityRaw = row.slice(5).join('').replace(/"/g, '').replace(/,/g, '').trim();

    const quantity = parseFloat(quantityRaw);

    if (!resaleDate || !warehouseId || !productId || !productName || isNaN(quantity)) {
        return null;
    }

    return {
        resaleDate,
        warehouseId,
        productId,
        productName,
        quantity,
        resaleDateSortable: parseDateToSortableFormat(resaleDate),
    };
};

// --- SHC vs Planogram Parsers ---

const normalizeNumericString = (numStr: string | undefined): string => {
    if (!numStr) return '';
    const trimmed = numStr.trim();
    if (/^\d+$/.test(trimmed)) {
        return String(parseInt(trimmed, 10));
    }
    return trimmed;
};

export const shcRowMapper = (row: string[]): ShcDataRow => ({
    storeNumber: normalizeNumericString(row[0]),
    itemNumber: normalizeNumericString(row[2]),
    itemDescription: row[3]?.trim() || '',
    piecesInBox: parseInt(row[4], 10) || 0,
    itemStatus: row[5]?.trim() || '',
    itemGroup: row[9]?.trim() || '',
    shelfCapacity: parseInt(row[19], 10) || 0,
    shelfCapacityUnit: row[21]?.trim() || '',
});

export const parsePlanogramFileContents = (rows: any[][]): PlanogramRow[] => {
    const data: PlanogramRow[] = [];
    let lastSectionDescX23 = '';
    let lastSectionDescX24 = '';
    let lastSectionDescX25 = '';

    const startIndex = rows[0]?.[0]?.toString().toLowerCase().includes('section') ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i].map(cell => String(cell ?? '')); // Ensure all cells are strings
        const currentSectionDescX23 = row[2]?.trim() || lastSectionDescX23;
        const currentSectionDescX24 = row[3]?.trim() || lastSectionDescX24;
        const currentSectionDescX25 = row[4]?.trim() || lastSectionDescX25;
        
        if (row[5]?.trim()) {
            data.push({
                generalStoreArea: currentSectionDescX23,
                settingSpecificallyFor: currentSectionDescX24,
                settingWidth: currentSectionDescX25,
                itemNumber: normalizeNumericString(row[5]),
                itemName: row[6]?.trim(),
                targetShc: parseInt(row[7], 10) || 0,
                facings: parseInt(row[8], 10) || 0,
                depth: parseInt(row[9], 10) || 0,
            });
        }

        lastSectionDescX23 = currentSectionDescX23;
        lastSectionDescX24 = currentSectionDescX24;
        lastSectionDescX25 = currentSectionDescX25;
    }
    return data;
};

export const orgStructureRowMapper = (row: string[]): OrgStructureRow => ({
    storeNumber: normalizeNumericString(row[0]),
    storeName: row[1]?.trim() || '',
    warehouseId: row[3]?.trim().substring(0, 3) || '',
    areaManager: row[12]?.trim() || '',
    headOfSales: row[13]?.trim() || '',
});

export const categoryRelationRowMapper = (row: { [key: string]: string }): CategoryRelationRow => {
    const storeName = row['StoreName']?.trim() || '';
    const storeNumberMatch = storeName.match(/(\d{4})$/);
    const storeNumber = storeNumberMatch ? String(parseInt(storeNumberMatch[1], 10)) : '';

    return {
        generalStoreArea: row['CategoryHierarchy03']?.trim() || '',
        settingSpecificallyFor: row['CategoryHierarchy04']?.trim() || '',
        settingWidth: row['CategoryHierarchy05']?.trim() || '',
        storeNumber,
    };
};

export const parseShcFile = (dataType: ShcDataType, buffer: ArrayBuffer): any[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (dataType === 'categoryRelation') {
        const data = XLSX.utils.sheet_to_json(sheet) as { [key: string]: any }[];
        const stringifiedData = data.map(rowObject => {
            const newObj: { [key: string]: string } = {};
            for (const key in rowObject) {
                newObj[key] = String(rowObject[key] ?? '');
            }
            return newObj;
        });
        return stringifiedData.map(categoryRelationRowMapper).filter(Boolean);
    }
    
    // For other types, parse as an array of arrays
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (rows.length === 0) return [];
    
    // Ensure all cells are strings for consistent mapping
    let stringRows = rows.map(row => row.map(cell => String(cell ?? '')));
    
    // Skip header row for non-planogram files
    if (dataType !== 'planogram' && stringRows.length > 0) {
        stringRows.shift();
    }

    switch(dataType) {
        case 'shc':
            // Pre-filter the raw string rows before mapping for performance.
            const filteredRows = stringRows.filter(row => {
                const itemStatus = row[5]?.trim(); // Column F (6th column) is Item Status
                const shelfCapacityUnit = row[21]?.trim(); // Column V (22nd column) is Shelf capacity unit description
                return itemStatus === '8' && shelfCapacityUnit === 'C';
            });
            return filteredRows.map(shcRowMapper).filter(Boolean);
        case 'planogram':
             // The original `parsePlanogramFileContents` function expects raw rows to handle header detection and fill-down logic
            return parsePlanogramFileContents(rows);
        case 'orgStructure':
            return stringRows.map(orgStructureRowMapper).filter(Boolean);
        default:
            return [];
    }
};
