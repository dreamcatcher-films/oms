import { Product, getAllProducts } from './db';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest, DominantStatusInfo } from './utils/types';

// --- Worker Main Logic ---
onmessage = async (e: MessageEvent<StatusReportWorkerRequest>) => {
    try {
        const allProducts = await getAllProducts();
        
        // 1. Group products by a unique key (productId + caseSize)
        const productGroups = new Map<string, Product[]>();
        for (const product of allProducts) {
            const key = `${product.productId}-${product.caseSize}`;
            if (!productGroups.has(key)) {
                productGroups.set(key, []);
            }
            productGroups.get(key)!.push(product);
        }

        const totalGroups = productGroups.size;
        const results: StatusReportResultItem[] = [];
        let processedCount = 0;

        // 2. Analyze each group for inconsistencies
        for (const [key, productsInGroup] of productGroups.entries()) {
            const statusSet = new Set(productsInGroup.map(p => p.status));

            if (statusSet.size > 1) { // Found an inconsistency
                const statusCounts: Record<string, number> = {};
                const totalWarehouses = productsInGroup.length;
                productsInGroup.forEach(p => {
                    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
                });

                let dominantStatusInfo: DominantStatusInfo = { status: '-', type: 'none' };

                const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

                if (sortedStatuses.length > 0) {
                    const [topStatus, topCount] = sortedStatuses[0];

                    if (topCount > totalWarehouses / 2) {
                        dominantStatusInfo = { status: topStatus, type: 'dominant' };
                    } else {
                        const isTie = sortedStatuses.length > 1 && sortedStatuses[1][1] === topCount;
                        if (isTie) {
                            dominantStatusInfo = { status: '-', type: 'none' };
                        } else {
                            dominantStatusInfo = { status: topStatus, type: 'most_frequent' };
                        }
                    }
                }

                const statusesByWarehouse: Record<string, string> = {};
                const stockByWarehouse: Record<string, number> = {};
                productsInGroup.forEach(p => {
                    statusesByWarehouse[p.warehouseId] = p.status;
                    stockByWarehouse[p.warehouseId] = p.stockOnHand;
                });
                
                const firstProduct = productsInGroup[0];
                results.push({
                    productId: firstProduct.productId,
                    productName: firstProduct.name,
                    dispoGroup: firstProduct.dispoGroup,
                    itemGroup: firstProduct.itemGroup,
                    caseSize: firstProduct.caseSize,
                    dominantStatusInfo,
                    statusesByWarehouse,
                    stockByWarehouse
                });
            }

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
