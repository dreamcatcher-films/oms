import { 
    ShcWorkerMessage, 
    ShcWorkerRequest, 
    getAllShcData,
    getAllPlanogramData,
    getAllOrgStructureData,
    getAllCategoryRelationData
} from './db';
import { 
    ShcDataRow,
    PlanogramRow,
    OrgStructureRow,
    CategoryRelationRow,
    ShcMismatchItem,
    ShcAnalysisResult
} from './utils/types';

const createLocatorKey = (s1: string, s2: string): string => {
    return (s1 + s2).replace(/\s/g, '');
};

onmessage = async (e: MessageEvent<ShcWorkerRequest>) => {
    const { sectionConfig } = e.data;
    
    try {
        postMessage({ type: 'progress', payload: { message: 'Fetching data from database...', percentage: 5 } } as ShcWorkerMessage);
        
        const [
            shcData,
            planogramData,
            orgStructureData,
            categoryRelationData
        ] = await Promise.all([
            getAllShcData(),
            getAllPlanogramData(),
            getAllOrgStructureData(),
            getAllCategoryRelationData(),
        ]);
        
        postMessage({ type: 'progress', payload: { message: 'Filtering & preparing data...', percentage: 15 } } as ShcWorkerMessage);
        
        const filteredShcData = shcData.filter(row => row.itemStatus === '8' && row.shelfCapacityUnit === 'C');
        
        planogramData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });

        categoryRelationData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });
        
        const orgMap = new Map(orgStructureData.map(row => [row.storeNumber, row]));
        const categoryRelationMap = new Map<string, CategoryRelationRow[]>();
        categoryRelationData.forEach(row => {
            if (!categoryRelationMap.has(row.storeNumber)) categoryRelationMap.set(row.storeNumber, []);
            categoryRelationMap.get(row.storeNumber)!.push(row);
        });

        const planogramMap = new Map<string, Map<string, PlanogramRow>>();
        planogramData.forEach(row => {
            const key = row.locatorKey!;
            if (!planogramMap.has(key)) planogramMap.set(key, new Map());
            planogramMap.get(key)!.set(row.itemNumber, row);
        });

        const shcByStoreMap = new Map<string, ShcDataRow[]>();
        filteredShcData.forEach(row => {
            if (!shcByStoreMap.has(row.storeNumber)) shcByStoreMap.set(row.storeNumber, []);
            shcByStoreMap.get(row.storeNumber)!.push(row);
        });
        
        postMessage({ type: 'progress', payload: { message: 'Grouping stores by hierarchy...', percentage: 25 } } as ShcWorkerMessage);

        const hierarchy = new Map<string, Map<string, Map<string, OrgStructureRow[]>>>();
        orgStructureData.forEach(store => {
            if (!hierarchy.has(store.warehouseId)) hierarchy.set(store.warehouseId, new Map());
            const warehouse = hierarchy.get(store.warehouseId)!;

            if (!warehouse.has(store.headOfSales)) warehouse.set(store.headOfSales, new Map());
            const hos = warehouse.get(store.headOfSales)!;

            if (!hos.has(store.areaManager)) hos.set(store.areaManager, []);
            const am = hos.get(store.areaManager)!;
            am.push(store);
        });
        
        const mismatches: ShcMismatchItem[] = [];
        const flatResults: any[] = [];
        let processedStores = 0;
        const totalStoresToProcess = orgStructureData.length;
        
        for (const [warehouseId, hosMap] of hierarchy.entries()) {
            for (const [hosName, amMap] of hosMap.entries()) {
                for (const [amName, stores] of amMap.entries()) {
                    for (const store of stores) {
                        processedStores++;
                        const progressPercentage = 25 + (processedStores / totalStoresToProcess) * 65;
                        postMessage({ type: 'progress', payload: { message: `Analyzing Store ${processedStores}/${totalStoresToProcess}: ${store.storeNumber}`, percentage: progressPercentage } } as ShcWorkerMessage);

                        const storeShcData = shcByStoreMap.get(store.storeNumber);
                        if (!storeShcData) continue;
                        
                        const assignedPlanogramLocators = categoryRelationMap.get(store.storeNumber) || [];
                        if (assignedPlanogramLocators.length === 0) {
                             storeShcData.forEach(shcRow => {
                                mismatches.push({ type: 'NO_LOCATION_MATCH', storeNumber: store.storeNumber, articleNumber: shcRow.itemNumber, details: 'No location found in Category-Store Relation file.' });
                            });
                            continue;
                        }

                        for (const shcRow of storeShcData) {
                            let itemFoundInAnyPlanogram = false;
                            for (const locator of assignedPlanogramLocators) {
                                const planogramItems = planogramMap.get(locator.locatorKey!);
                                if (planogramItems) {
                                    const matchingPlanogramItem = planogramItems.get(shcRow.itemNumber);
                                    if (matchingPlanogramItem) {
                                        itemFoundInAnyPlanogram = true;
                                        const planShc = Math.floor(matchingPlanogramItem.targetShc);
                                        const storeShc = shcRow.shelfCapacity;
                                        const diff = storeShc - planShc;
                                        
                                        if (diff < 0) {
                                            flatResults.push({
                                                warehouseId, hosName, amName, storeNumber: store.storeNumber,
                                                locator: locator.locatorKey,
                                                articleNumber: shcRow.itemNumber,
                                                articleName: shcRow.itemDescription,
                                                planShc, storeShc, diff,
                                                generalStoreArea: locator.generalStoreArea,
                                                settingSpecificallyFor: locator.settingSpecificallyFor,
                                                settingWidth: locator.settingWidth,
                                            });
                                        }
                                        break; // Found it, no need to check other locators for this item
                                    }
                                }
                            }
                            if (!itemFoundInAnyPlanogram) {
                                mismatches.push({ type: 'NO_PLANOGRAM_MATCH', storeNumber: store.storeNumber, articleNumber: shcRow.itemNumber, details: `Item not found in any of ${assignedPlanogramLocators.length} assigned planograms.` });
                            }
                        }
                    }
                }
            }
        }
        
        postMessage({ type: 'progress', payload: { message: 'Building final report...', percentage: 95 } } as ShcWorkerMessage);
        
        const finalHierarchicalResult: ShcAnalysisResult = [];
        const resultBuilder = new Map<string, any>();

        for(const item of flatResults) {
            if (!resultBuilder.has(item.warehouseId)) resultBuilder.set(item.warehouseId, { warehouseName: item.warehouseId, hos: new Map() });
            const warehouse = resultBuilder.get(item.warehouseId)!;

            if (!warehouse.hos.has(item.hosName)) warehouse.hos.set(item.hosName, { hosName: item.hosName, managers: new Map() });
            const hos = warehouse.hos.get(item.hosName)!;

            if (!hos.managers.has(item.amName)) hos.managers.set(item.amName, { managerName: item.amName, stores: new Map() });
            const am = hos.managers.get(item.amName)!;

            if (!am.stores.has(item.storeNumber)) am.stores.set(item.storeNumber, { storeNumber: item.storeNumber, discrepancyCount: 0, items: [] });
            const store = am.stores.get(item.storeNumber)!;
            
            store.items.push(item);
            store.discrepancyCount++;
        }

        resultBuilder.forEach(wh => {
            const hosList: any[] = [];
            wh.hos.forEach((hos: any) => {
                const amList: any[] = [];
                hos.managers.forEach((am: any) => {
                    amList.push({ ...am, stores: Array.from(am.stores.values()) });
                });
                hosList.push({ ...hos, managers: amList });
            });
            finalHierarchicalResult.push({ ...wh, hos: hosList });
        });

        const finalMessage: ShcWorkerMessage = {
            type: 'complete',
            payload: { results: finalHierarchicalResult, mismatches },
        };
        postMessage(finalMessage);

    } catch (error) {
        console.error("SHC Worker Error:", error);
        const errorMessage: ShcWorkerMessage = {
            type: 'error',
            payload: error instanceof Error ? error.message : 'An unknown error occurred in the SHC worker.',
        };
        postMessage(errorMessage);
    }
};
