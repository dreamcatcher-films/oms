import { Product, getAllProducts, OpenOrder, getAllOpenOrders } from './db';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest, DominantStatusInfo } from './utils/types';

const STATUTORY_EXCLUDED_ITEM_GROUPS = new Set(['10', '11', '12', '13', '73', '90', '91', '92']);

// --- Worker Main Logic ---
onmessage = async (e: MessageEvent<StatusReportWorkerRequest>) => {
    try {
        const { allWarehouseIds } = e.data;
        const [allProducts, allOpenOrders] = await Promise.all([
            getAllProducts(),
            getAllOpenOrders()
        ]);

        // Filter products to only include those from official RDC warehouses
        // and also exclude item groups with ID > 95.
        const filteredProducts = allProducts.filter(product => {
            // Check 1: Must be in an official RDC warehouse
            if (!allWarehouseIds.includes(product.warehouseId)) {
                return false;
            }

            // Check 2: Item group must be <= 95
            if (!product.itemGroup) return true; // Keep if no item group
            const itemGroupId = parseInt(product.itemGroup, 10);
            return isNaN(itemGroupId) || itemGroupId <= 95;
        });
        
        // Process open orders into a map for quick lookup
        const openOrdersMap = new Map<string, OpenOrder[]>();
        for (const order of allOpenOrders) {
            const key = `${order.warehouseId}-${order.fullProductId}`;
            if (!openOrdersMap.has(key)) {
                openOrdersMap.set(key, []);
            }
            openOrdersMap.get(key)!.push(order);
        }

        // 1. Group products by a unique key (productId + caseSize)
        const productGroups = new Map<string, Product[]>();
        for (const product of filteredProducts) {
            const key = `${product.productId}-${product.caseSize}`;
            if (!productGroups.has(key)) {
                productGroups.set(key, []);
            }
            productGroups.get(key)!.push(product);
        }

        const totalGroups = productGroups.size;
        const results: StatusReportResultItem[] = [];
        let processedCount = 0;
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // 2. Analyze each group for inconsistencies
        for (const [key, productsInGroup] of productGroups.entries()) {
            const firstProduct = productsInGroup[0];
            const itemGroup = firstProduct.itemGroup;

            // Filter out products that meet special exclusion criteria (WH 290 for specific groups) before analysis
            const effectiveProductsForAnalysis = productsInGroup.filter(p => 
                !(p.warehouseId === '290' && (p.itemGroup === '20' || p.itemGroup === '74'))
            );

            const statusSet = new Set(effectiveProductsForAnalysis.map(p => p.status));
            let isInconsistent = statusSet.size > 1;

            // If the item group is statutorily excluded, it's never considered "inconsistent" for filtering purposes
            if (STATUTORY_EXCLUDED_ITEM_GROUPS.has(itemGroup)) {
                isInconsistent = false;
            }
            
            const statusCounts: Record<string, number> = {};
            effectiveProductsForAnalysis.forEach(p => {
                statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
            });

            let dominantStatusInfo: DominantStatusInfo = { status: '-', type: 'none' };

            const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

            if (sortedStatuses.length > 0) {
                const [topStatus, topCount] = sortedStatuses[0];

                // A status is "dominant" if it appears in more than half of the relevant warehouses for this product
                if (topCount > effectiveProductsForAnalysis.length / 2) {
                    dominantStatusInfo = { status: topStatus, type: 'dominant' };
                } else {
                    const isTie = sortedStatuses.length > 1 && sortedStatuses[1][1] === topCount;
                    if (isTie) {
                        dominantStatusInfo = { status: '-', type: 'none' };
                    } else {
                        dominantStatusInfo = { status: topStatus, type: 'mostFrequent' };
                    }
                }
            }

            const statusesByWarehouse: Record<string, string> = {};
            const stockByWarehouse: Record<string, number> = {};
            const openOrdersByWarehouse: StatusReportResultItem['openOrdersByWarehouse'] = {};
            
            productsInGroup.forEach(p => {
                statusesByWarehouse[p.warehouseId] = p.status;
                stockByWarehouse[p.warehouseId] = p.stockOnHand;
            });
            
            for (const warehouseId of allWarehouseIds) {
                const productInWarehouse = productsInGroup.find(p => p.warehouseId === warehouseId);
                const fullProductId = productInWarehouse?.fullProductId || firstProduct.fullProductId;

                const orderKey = `${warehouseId}-${fullProductId}`;
                const productOrders = openOrdersMap.get(orderKey) || [];

                const futureOrders = productOrders
                    .filter(order => order.deliveryDateSortable >= todayStr)
                    .sort((a, b) => a.deliveryDateSortable.localeCompare(b.deliveryDateSortable));
                
                openOrdersByWarehouse[warehouseId] = {
                    hasFutureOrders: futureOrders.length > 0,
                    nextOrderDate: futureOrders.length > 0 ? futureOrders[0].deliveryDate : null
                };
            }

            results.push({
                productId: firstProduct.productId,
                productName: firstProduct.name,
                dispoGroup: firstProduct.dispoGroup,
                itemGroup: firstProduct.itemGroup,
                caseSize: firstProduct.caseSize,
                dominantStatusInfo,
                statusesByWarehouse,
                stockByWarehouse,
                openOrdersByWarehouse,
                isInconsistent,
            });

            processedCount++;
            if (processedCount % 50 === 0 || processedCount === totalGroups) {
                const progressMessage: StatusReportWorkerMessage = {
                    type: 'progress',
                    payload: { processed: processedCount, total: totalGroups }
                };
                postMessage(progressMessage);
            }
        }

        results.sort((a, b) => a.productId.localeCompare(b.productId));

        const finalMessage: StatusReportWorkerMessage = {
            type: 'complete',
            payload: results,
        };
        postMessage(finalMessage);

    } catch (error) {
        console.error("Status Report worker failed:", error);
        const errorMessage: StatusReportWorkerMessage = {
            type: 'complete',
            payload: [],
        };
        postMessage(errorMessage);
    }
};
