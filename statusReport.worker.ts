import { Product, getAllProducts } from './db';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest } from './utils/types';

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
                // 3. Find the dominant status
                const statusCounts: Record<string, number> = {};
                productsInGroup.forEach(p => {
                    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
                });

                let dominantStatus = '';
                let maxCount = 0;
                for (const status in statusCounts) {
                    if (statusCounts[status] > maxCount) {
                        maxCount = statusCounts[status];
                        dominantStatus = status;
                    }
                }

                // 4. Build the result item
                const statusesByWarehouse: Record<string, string> = {};
                productsInGroup.forEach(p => {
                    statusesByWarehouse[p.warehouseId] = p.status;
                });
                
                const firstProduct = productsInGroup[0];
                results.push({
                    productId: firstProduct.productId,
                    productName: firstProduct.name,
                    caseSize: firstProduct.caseSize,
                    dominantStatus,
                    statusesByWarehouse
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

        // Sort results by product ID
        results.sort((a, b) => a.productId.localeCompare(b.productId));

        const finalMessage: StatusReportWorkerMessage = {
            type: 'complete',
            payload: results,
        };
        postMessage(finalMessage);

    } catch (error) {
        console.error("Status Report worker failed:", error);
        // Optionally, send an error message back to the main thread
        const errorMessage: StatusReportWorkerMessage = {
            type: 'complete',
            payload: [], // Send empty results on error
        };
        postMessage(errorMessage);
    }
};
