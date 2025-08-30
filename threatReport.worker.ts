import {
  Product,
  getAllGoodsReceiptsForProduct,
  getAllOpenOrdersForProduct,
  getAllSalesForProduct,
  getProductsByCriteria
} from './db';
import type { ReportResultItem, WorkerMessage, WorkerRequest } from './utils/types';


// --- Types ---
type StockBatch = {
    quantity: number;
    bestBefore: Date;
    writeOffHorizon: Date;
    aldDate: Date;
};

// --- Utility Functions ---
const parseSortableDate = (dateStr: string): Date => {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
};

const logToMain = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
    self.postMessage({
        type: 'log',
        payload: { level, args }
    } as WorkerMessage);
};

// --- Core Simulation Logic ---
async function runSimulationForProduct(product: Product): Promise<ReportResultItem | null> {
    const {
        warehouseId,
        fullProductId,
        productId,
        name: productName,
        shelfLifeAtReceiving,
        shelfLifeAtStore,
        customerShelfLife,
        stockOnHand,
        unprocessedDeliveryQty,
        price,
        caseSize,
        cartonsPerPallet,
    } = product;

    const [allReceipts, allOpenOrders, allSales] = await Promise.all([
        getAllGoodsReceiptsForProduct(warehouseId, fullProductId),
        getAllOpenOrdersForProduct(warehouseId, fullProductId),
        getAllSalesForProduct(warehouseId, productId)
    ]);

    const totalSales = allSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueSaleDays = new Set(allSales.map(s => s.resaleDate)).size;
    const avgDailySales = uniqueSaleDays > 0 ? totalSales / uniqueSaleDays : 0;
    
    if (avgDailySales === 0) return null; // No sales, no risk based on this model

    const effectiveStockOnHand = stockOnHand + unprocessedDeliveryQty;
    let nonCompliantReceiptsCount = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    allReceipts.sort((a, b) => b.deliveryDateSortable.localeCompare(a.deliveryDateSortable));
    
    let remainingStockToAllocate = effectiveStockOnHand;
    let stock: StockBatch[] = [];
    let peakAldAffectedStock = 0;

    for (const receipt of allReceipts) {
        if (remainingStockToAllocate <= 0) break;
        const deliveryDate = parseSortableDate(receipt.deliveryDateSortable);
        const bestBeforeDate = parseSortableDate(receipt.bestBeforeDateSortable);
        
        const shelfLifeAtReceipt = (bestBeforeDate.getTime() - deliveryDate.getTime()) / (1000 * 3600 * 24);
        if (shelfLifeAtReceipt < shelfLifeAtReceiving) {
            nonCompliantReceiptsCount++;
        }

        const quantityFromThisBatch = Math.min(remainingStockToAllocate, receipt.deliveryQtyPcs);
        const writeOffHorizon = new Date(bestBeforeDate);
        writeOffHorizon.setDate(writeOffHorizon.getDate() - customerShelfLife);
        const aldDate = new Date(bestBeforeDate);
        aldDate.setDate(aldDate.getDate() - shelfLifeAtStore);

        if(today >= aldDate){
            peakAldAffectedStock += quantityFromThisBatch;
        }

        stock.push({
            quantity: quantityFromThisBatch,
            bestBefore: bestBeforeDate,
            writeOffHorizon,
            aldDate,
        });
        remainingStockToAllocate -= quantityFromThisBatch;
    }

    if (remainingStockToAllocate > 0) {
        const pessimisticBestBefore = new Date(today);
        const writeOffHorizon = new Date(pessimisticBestBefore);
        writeOffHorizon.setDate(writeOffHorizon.getDate() - customerShelfLife);
        const aldDate = new Date(pessimisticBestBefore);
        aldDate.setDate(aldDate.getDate() - shelfLifeAtStore);

        peakAldAffectedStock += remainingStockToAllocate;
        stock.push({
            quantity: remainingStockToAllocate,
            bestBefore: pessimisticBestBefore,
            writeOffHorizon,
            aldDate,
        });
    }

    stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());

    const receiptsCalendar: Map<string, number> = new Map();
    for (const order of allOpenOrders) {
        const deliveryDateStr = parseSortableDate(order.deliveryDateSortable).toLocaleDateString('en-CA');
        receiptsCalendar.set(deliveryDateStr, (receiptsCalendar.get(deliveryDateStr) || 0) + order.orderQtyPcs);
    }

    let currentDate = new Date(today);
    let totalWriteOffs = 0;
    const simulationEndDate = new Date();
    simulationEndDate.setFullYear(simulationEndDate.getFullYear() + 1);

    while (currentDate <= simulationEndDate) {
        const dateStr = currentDate.toLocaleDateString('en-CA');

        if (receiptsCalendar.has(dateStr)) {
            const newReceiptQty = receiptsCalendar.get(dateStr)!;
            const deliveryDate = new Date(currentDate);
            const bestBefore = new Date(deliveryDate);
            bestBefore.setDate(deliveryDate.getDate() + shelfLifeAtReceiving);
            const writeOffHorizon = new Date(bestBefore);
            writeOffHorizon.setDate(bestBefore.getDate() - customerShelfLife);
            const aldDate = new Date(bestBefore);
            aldDate.setDate(bestBefore.getDate() - shelfLifeAtStore);

            stock.push({ quantity: newReceiptQty, bestBefore, writeOffHorizon, aldDate });
            stock.sort((a, b) => a.bestBefore.getTime() - b.bestBefore.getTime());
        }
        
        let tempSales = avgDailySales;
        while (tempSales > 0 && stock.length > 0) {
            const oldestBatch = stock[0];
            const qtyToSell = Math.min(tempSales, oldestBatch.quantity);
            oldestBatch.quantity -= qtyToSell;
            tempSales -= qtyToSell;
            if (oldestBatch.quantity <= 0) {
                stock.shift();
            }
        }
        
        const remainingStock: StockBatch[] = [];
        for (const batch of stock) {
            if (currentDate >= batch.writeOffHorizon) {
                totalWriteOffs += batch.quantity;
            } else {
                remainingStock.push(batch);
            }
        }
        stock = remainingStock;
        
        if (stock.length === 0 && Array.from(receiptsCalendar.keys()).every(d => new Date(d) < currentDate)) {
            break;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (totalWriteOffs === 0 && peakAldAffectedStock === 0) return null;

    return {
        warehouseId,
        productId,
        fullProductId,
        productName,
        caseSize,
        cartonsPerPallet,
        daysOfStock: avgDailySales > 0 ? effectiveStockOnHand / avgDailySales : Infinity,
        aldValue: peakAldAffectedStock * price,
        avgDailySales,
        nonCompliantReceipts: nonCompliantReceiptsCount,
        totalWriteOffValue: totalWriteOffs * price,
    };
}


// --- Worker Main Logic ---
onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const filters = e.data;
    let productsToProcess = await getProductsByCriteria(filters);

    // Exclude item groups with ID > 95
    productsToProcess = productsToProcess.filter(product => {
        if (!product.itemGroup) return true; // Keep if no item group
        const itemGroupId = parseInt(product.itemGroup, 10);
        return isNaN(itemGroupId) || itemGroupId <= 95;
    });
    
    const total = productsToProcess.length;
    
    const results: ReportResultItem[] = [];

    for (let i = 0; i < total; i++) {
        const product = productsToProcess[i];
        try {
            const result = await runSimulationForProduct(product);
            if (result) {
                results.push(result);
            }
        } catch (error) {
            logToMain('error', `Simulation failed for product ${product.fullProductId}`, error);
        }

        if (i % 10 === 0 || i === total - 1) { // Send progress update every 10 products or at the end
            const progressMessage: WorkerMessage = {
                type: 'progress',
                payload: { processed: i + 1, total }
            };
            postMessage(progressMessage);
        }
    }

    results.sort((a, b) => {
        if (b.totalWriteOffValue !== a.totalWriteOffValue) {
            return b.totalWriteOffValue - a.totalWriteOffValue;
        }
        if (b.aldValue !== a.aldValue) {
            return b.aldValue - a.aldValue;
        }
        return a.productId.localeCompare(b.productId);
    });

    const finalMessage: WorkerMessage = {
        type: 'complete',
        payload: results,
    };
    postMessage(finalMessage);
};
