

import {
  getProductDetails,
  getAllGoodsReceiptsForProduct,
  getAllOpenOrdersForProduct,
  getAllSalesForProduct,
  Product,
  GoodsReceipt,
  OpenOrder,
  Sale,
} from './db';

export type SimulationLogEntry = {
  date: string;
  stockStart: number;
  sales: number;
  receipts: number;
  writeOffs: number;
  stockEnd: number;
  notes: string;
};

export type InitialStockBatch = {
    deliveryDate: string;
    bestBeforeDate: string;
    quantity: number;
    isUnknown: boolean;
    isNonCompliant: boolean;
    daysToSell: number;
};

export type SimulationResult = {
  totalWriteOffValue: number;
  daysOfStock: number;
  avgDailySales: number;
  nonCompliantReceiptsCount: number;
  firstWriteOffDate: string | null;
  log: SimulationLogEntry[];
  initialStockComposition: InitialStockBatch[];
  isStockDataComplete: boolean;
};

type SimulationParams = {
    warehouseId: string;
    fullProductId: string;
    overrides?: {
        wDate?: number;
        sDate?: number;
        cDate?: number;
        avgDailySales?: number;
    };
    manualDelivery?: {
        date: string;
        quantity: number;
    }
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
};

const parseSortableDate = (dateStr: string): Date => {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
};

onmessage = async (event: MessageEvent<SimulationParams>) => {
  const { warehouseId, fullProductId, overrides, manualDelivery } = event.data;

  try {
    // 1. Fetch all necessary data
    const productDetails = await getProductDetails(warehouseId, fullProductId);
    if (!productDetails) {
        throw new Error("Product not found");
    }
    
    // Apply overrides
    const wDate = overrides?.wDate ?? productDetails.shelfLifeAtReceiving;
    const sDate = overrides?.sDate ?? productDetails.shelfLifeAtStore;
    const cDate = overrides?.cDate ?? productDetails.customerShelfLife;

    const [allReceipts, allOpenOrders, allSales] = await Promise.all([
        getAllGoodsReceiptsForProduct(warehouseId, fullProductId),
        getAllOpenOrdersForProduct(warehouseId, fullProductId),
        getAllSalesForProduct(warehouseId, productDetails.productId)
    ]);

    // 2. Calculate average daily sales
    const totalSales = allSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueSaleDays = new Set(allSales.map(s => s.resaleDate)).size;
    const calculatedAvgSales = uniqueSaleDays > 0 ? totalSales / uniqueSaleDays : 0;
    const avgDailySales = overrides?.avgDailySales ?? calculatedAvgSales;
    
    // 3. Determine initial stock on hand & non-compliant receipts
    const effectiveStockOnHand = productDetails.stockOnHand + productDetails.unprocessedDeliveryQty;
    let initialStockBatches: InitialStockBatch[] = [];
    let nonCompliantReceiptsCount = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    allReceipts.sort((a, b) => b.deliveryDateSortable.localeCompare(a.deliveryDateSortable));
    
    let remainingStockToAllocate = effectiveStockOnHand;

    for (const receipt of allReceipts) {
        if (remainingStockToAllocate <= 0) break;

        const deliveryDate = parseSortableDate(receipt.deliveryDateSortable);
        const bestBeforeDate = parseSortableDate(receipt.bestBeforeDateSortable);

        const shelfLifeAtReceipt = (bestBeforeDate.getTime() - deliveryDate.getTime()) / (1000 * 3600 * 24);
        const isNonCompliant = shelfLifeAtReceipt < wDate;
        
        const quantityFromThisBatch = Math.min(remainingStockToAllocate, receipt.deliveryQtyPcs);
        
        if (isNonCompliant) {
            // Count all non-compliant receipts, not just those in stock
            nonCompliantReceiptsCount++;
        }

        const daysToSell = Math.max(0, Math.floor((bestBeforeDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) - cDate);

        initialStockBatches.push({
            deliveryDate: formatDate(deliveryDate),
            bestBeforeDate: formatDate(bestBeforeDate),
            quantity: quantityFromThisBatch,
            isUnknown: false,
            isNonCompliant: isNonCompliant,
            daysToSell: daysToSell,
        });
        
        remainingStockToAllocate -= quantityFromThisBatch;
    }

    const isStockDataComplete = remainingStockToAllocate <= 0;
    if (remainingStockToAllocate > 0) {
        initialStockBatches.push({
            deliveryDate: 'Unknown',
            bestBeforeDate: 'Unknown',
            quantity: remainingStockToAllocate,
            isUnknown: true,
            isNonCompliant: true, 
            daysToSell: 0,
        });
    }

    let stock: { quantity: number; bestBefore: Date; sDateHorizon: Date }[] = initialStockBatches
        .filter(b => !b.isUnknown)
        .map(batch => {
            const bestBefore = new Date(batch.bestBeforeDate);
            const sDateHorizon = new Date(bestBefore);
            sDateHorizon.setDate(sDateHorizon.getDate() - sDate);
            return {
                quantity: batch.quantity,
                bestBefore,
                sDateHorizon
            };
        });

    if (!isStockDataComplete) {
        const pessimisticBestBefore = new Date();
        pessimisticBestBefore.setHours(0,0,0,0);
        const pessimisticSDateHorizon = new Date(pessimisticBestBefore);
        pessimisticSDateHorizon.setDate(pessimisticSDateHorizon.getDate() - sDate);
        stock.push({ quantity: remainingStockToAllocate, bestBefore: pessimisticBestBefore, sDateHorizon: pessimisticSDateHorizon });
    }

    stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());
    initialStockBatches.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

    // 4. Prepare future receipts calendar
    const receiptsCalendar: Map<string, number> = new Map();
    for (const order of allOpenOrders) {
        const deliveryDate = formatDate(parseSortableDate(order.deliveryDateSortable));
        receiptsCalendar.set(deliveryDate, (receiptsCalendar.get(deliveryDate) || 0) + order.orderQtyPcs);
    }
    
    if (manualDelivery && manualDelivery.date && manualDelivery.quantity > 0) {
        receiptsCalendar.set(manualDelivery.date, (receiptsCalendar.get(manualDelivery.date) || 0) + manualDelivery.quantity);
    }

    // 5. Run simulation
    const log: SimulationLogEntry[] = [];
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    let totalWriteOffs = 0;
    let firstWriteOffDate: string | null = null;
    const simulationEndDate = new Date();
    simulationEndDate.setFullYear(simulationEndDate.getFullYear() + 1);

    while (currentDate <= simulationEndDate) {
        const dateStr = formatDate(currentDate);
        let currentStockQty = stock.reduce((sum, item) => sum + item.quantity, 0);

        const logEntry: SimulationLogEntry = {
            date: dateStr,
            stockStart: currentStockQty,
            sales: 0,
            receipts: 0,
            writeOffs: 0,
            stockEnd: 0,
            notes: '',
        };

        if (receiptsCalendar.has(dateStr)) {
            const newReceiptQty = receiptsCalendar.get(dateStr)!;
            logEntry.receipts = newReceiptQty;
            
            const deliveryDate = new Date(currentDate);
            const bestBefore = new Date(deliveryDate);
            bestBefore.setDate(deliveryDate.getDate() + wDate);
            const sDateHorizon = new Date(bestBefore);
            sDateHorizon.setDate(bestBefore.getDate() - sDate);

            stock.push({ quantity: newReceiptQty, bestBefore, sDateHorizon });
            stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());
            logEntry.notes += `Receipt: ${newReceiptQty}. `;
        }
        
        let salesToday = Math.min(stock.reduce((sum, s) => sum + s.quantity, 0), avgDailySales);
        logEntry.sales = salesToday;
        
        let tempSales = salesToday;
        while (tempSales > 0 && stock.length > 0) {
            const oldestBatch = stock[0];
            const qtyToSell = Math.min(tempSales, oldestBatch.quantity);
            
            oldestBatch.quantity -= qtyToSell;
            tempSales -= qtyToSell;
            
            if (oldestBatch.quantity <= 0) {
                stock.shift();
            }
        }
        
        let writeOffsToday = 0;
        const remainingStock = [];
        for (const batch of stock) {
            if (currentDate >= batch.sDateHorizon) {
                writeOffsToday += batch.quantity;
                if (!firstWriteOffDate) {
                    firstWriteOffDate = dateStr;
                }
                logEntry.notes += `Write-off: ${batch.quantity} (BBD: ${formatDate(batch.bestBefore)}). `;
            } else {
                remainingStock.push(batch);
            }
        }
        stock = remainingStock;
        logEntry.writeOffs = writeOffsToday;
        totalWriteOffs += writeOffsToday;

        logEntry.stockEnd = stock.reduce((sum, item) => sum + item.quantity, 0);
        
        if (logEntry.sales > 0 || logEntry.receipts > 0 || logEntry.writeOffs > 0) {
            log.push(logEntry);
        }

        if (logEntry.stockEnd === 0 && Array.from(receiptsCalendar.keys()).every(d => new Date(d) < currentDate)) {
            break;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
        
    const result: SimulationResult = {
      totalWriteOffValue: totalWriteOffs * productDetails.price,
      daysOfStock: avgDailySales > 0 ? effectiveStockOnHand / avgDailySales : Infinity,
      avgDailySales: avgDailySales,
      firstWriteOffDate: firstWriteOffDate,
      log: log,
      initialStockComposition: initialStockBatches,
      isStockDataComplete,
      nonCompliantReceiptsCount,
    };

    postMessage(result);

  } catch (error) {
    console.error("Simulation failed:", error);
  }
};
