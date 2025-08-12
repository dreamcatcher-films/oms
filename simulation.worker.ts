
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
};

export type SimulationResult = {
  totalWriteOffValue: number;
  daysOfStock: number;
  avgDailySales: number;
  firstWriteOffDate: string | null;
  log: SimulationLogEntry[];
  initialStockComposition: InitialStockBatch[];
  isStockDataComplete: boolean;
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

onmessage = async (event: MessageEvent<{ warehouseId: string; fullProductId: string }>) => {
  const { warehouseId, fullProductId } = event.data;

  try {
    // 1. Fetch all necessary data
    const productDetails = await getProductDetails(warehouseId, fullProductId);
    if (!productDetails) {
        throw new Error("Product not found");
    }

    const [allReceipts, allOpenOrders, allSales] = await Promise.all([
        getAllGoodsReceiptsForProduct(warehouseId, fullProductId),
        getAllOpenOrdersForProduct(warehouseId, fullProductId),
        getAllSalesForProduct(warehouseId, productDetails.productId)
    ]);

    // 2. Calculate average daily sales
    const totalSales = allSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueSaleDays = new Set(allSales.map(s => s.resaleDate)).size;
    const avgDailySales = uniqueSaleDays > 0 ? totalSales / uniqueSaleDays : 0;
    
    // 3. Determine initial stock on hand (Corrected "FIFO Rollback" logic)
    const effectiveStockOnHand = productDetails.stockOnHand + productDetails.unprocessedDeliveryQty;
    let initialStockBatches: InitialStockBatch[] = [];
    
    // Sort receipts by delivery date DESCENDING (newest first) to find the batches that make up current stock
    allReceipts.sort((a, b) => b.deliveryDateSortable.localeCompare(a.deliveryDateSortable));
    
    let remainingStockToAllocate = effectiveStockOnHand;

    for (const receipt of allReceipts) {
        if (remainingStockToAllocate <= 0) break;

        const quantityFromThisBatch = Math.min(remainingStockToAllocate, receipt.deliveryQtyPcs);
        
        initialStockBatches.push({
            deliveryDate: formatDate(parseSortableDate(receipt.deliveryDateSortable)),
            bestBeforeDate: formatDate(parseSortableDate(receipt.bestBeforeDateSortable)),
            quantity: quantityFromThisBatch,
            isUnknown: false,
        });
        
        remainingStockToAllocate -= quantityFromThisBatch;
    }

    const isStockDataComplete = remainingStockToAllocate <= 0;
    if (!isStockDataComplete) {
        initialStockBatches.push({
            deliveryDate: 'Unknown',
            bestBeforeDate: 'Unknown',
            quantity: remainingStockToAllocate,
            isUnknown: true
        });
    }

    // Now, create the simulation stock array from the identified batches
    let stock: { quantity: number; bestBefore: Date; sDateHorizon: Date }[] = initialStockBatches
        .filter(b => !b.isUnknown)
        .map(batch => {
            const bestBefore = new Date(batch.bestBeforeDate);
            const sDateHorizon = new Date(bestBefore);
            sDateHorizon.setDate(sDateHorizon.getDate() - productDetails.shelfLifeAtStore);
            return {
                quantity: batch.quantity,
                bestBefore,
                sDateHorizon
            };
        });

    // If there's an unknown batch, add it with a pessimistic BBD
    if (!isStockDataComplete) {
        const pessimisticBestBefore = new Date();
        pessimisticBestBefore.setHours(0,0,0,0);
        const pessimisticSDateHorizon = new Date(pessimisticBestBefore);
        pessimisticSDateHorizon.setDate(pessimisticSDateHorizon.getDate() - productDetails.shelfLifeAtStore);
        stock.push({ quantity: remainingStockToAllocate, bestBefore: pessimisticBestBefore, sDateHorizon: pessimisticSDateHorizon });
    }

    // Sort the final stock for simulation: oldest BBD first (ASCENDING) to apply FIFO
    stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());
    // Also sort the display composition array for clarity (oldest first)
    initialStockBatches.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

    // 4. Prepare future receipts calendar
    const receiptsCalendar: Map<string, number> = new Map();
    for (const order of allOpenOrders) {
        const deliveryDate = formatDate(parseSortableDate(order.deliveryDateSortable));
        receiptsCalendar.set(deliveryDate, (receiptsCalendar.get(deliveryDate) || 0) + order.orderQtyPcs);
    }

    // 5. Run simulation for the next year
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

        // A. Add receipts
        if (receiptsCalendar.has(dateStr)) {
            const newReceiptQty = receiptsCalendar.get(dateStr)!;
            logEntry.receipts = newReceiptQty;
            
            // Assume new stock has ideal shelf life
            const deliveryDate = new Date(currentDate);
            const bestBefore = new Date(deliveryDate);
            bestBefore.setDate(deliveryDate.getDate() + productDetails.shelfLifeAtReceiving);
            const sDateHorizon = new Date(bestBefore);
            sDateHorizon.setDate(bestBefore.getDate() - productDetails.shelfLifeAtStore);

            stock.push({ quantity: newReceiptQty, bestBefore, sDateHorizon });
            // Re-sort stock after adding new batch to maintain FIFO order by BBD
            stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());
            logEntry.notes += `Receipt: ${newReceiptQty}. `;
        }
        
        // B. Process sales (FIFO - from the start of the array now)
        let salesToday = Math.min(currentStockQty + logEntry.receipts, avgDailySales);
        logEntry.sales = salesToday;
        
        while (salesToday > 0 && stock.length > 0) {
            const oldestBatch = stock[0];
            const qtyToSell = Math.min(salesToday, oldestBatch.quantity);
            
            oldestBatch.quantity -= qtyToSell;
            salesToday -= qtyToSell;
            
            if (oldestBatch.quantity <= 0) {
                stock.shift();
            }
        }
        
        // C. Check for write-offs
        let writeOffsToday = 0;
        const remainingStock = [];
        for (const batch of stock) {
            if (currentDate >= batch.sDateHorizon) {
                writeOffsToday += batch.quantity;
                totalWriteOffs += batch.quantity;
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

        logEntry.stockEnd = stock.reduce((sum, item) => sum + item.quantity, 0);
        
        if (logEntry.sales > 0 || logEntry.receipts > 0 || logEntry.writeOffs > 0) {
            log.push(logEntry);
        }

        // Stop if stock is empty and no more deliveries are planned
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
    };

    postMessage(result);

  } catch (error) {
    console.error("Simulation failed:", error);
    // In a real app, you might post back an error message
    // postMessage({ error: error.message });
  }
};
