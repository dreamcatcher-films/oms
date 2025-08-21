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
    CategoryRelationRow
} from './utils/types';

const createLocatorKey = (s1: string, s2: string): string => {
    return (s1 + s2).replace(/\s/g, '');
};

onmessage = async (e: MessageEvent<ShcWorkerRequest>) => {
    const { sectionConfig } = e.data;
    
    try {
        postMessage({ type: 'progress', payload: { message: 'Fetching data from database...', percentage: 10 } } as ShcWorkerMessage);
        
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
        
        postMessage({ type: 'progress', payload: { message: 'Filtering SHC data...', percentage: 25 } } as ShcWorkerMessage);
        const filteredShcData = shcData.filter(row => row.itemStatus === '8' && row.shelfCapacityUnit === 'C');

        postMessage({ type: 'progress', payload: { message: 'Preparing data for joining...', percentage: 40 } } as ShcWorkerMessage);

        planogramData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });

        categoryRelationData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });

        const orgMap = new Map(orgStructureData.map(row => [row.storeNumber, row]));
        
        const planogramMap = new Map<string, PlanogramRow[]>();
        planogramData.forEach(row => {
            const key = row.locatorKey!;
            if (!planogramMap.has(key)) {
                planogramMap.set(key, []);
            }
            planogramMap.get(key)!.push(row);
        });

        postMessage({ type: 'progress', payload: { message: 'Joining data and calculating differences...', percentage: 65 } } as ShcWorkerMessage);

        const mismatches: any[] = [];
        const finalResults: any[] = [];
        
        for (const shcRow of filteredShcData) {
            const orgInfo = orgMap.get(shcRow.storeNumber);
            if (!orgInfo) {
                // Mismatch: Store from SHC not in Org Structure
                continue;
            }

            // Find all planograms assigned to this store
            const assignedPlanogramLocators = categoryRelationData
                .filter(cr => cr.storeNumber === shcRow.storeNumber)
                .map(cr => cr.locatorKey);

            let itemFoundInAnyPlanogram = false;
            for (const locatorKey of assignedPlanogramLocators) {
                const planogramItems = planogramMap.get(locatorKey || '');
                if (planogramItems) {
                    const matchingPlanogramItem = planogramItems.find(p => p.itemNumber === shcRow.itemNumber);
                    if (matchingPlanogramItem) {
                        itemFoundInAnyPlanogram = true;
                        const planShc = Math.floor(matchingPlanogramItem.targetShc);
                        const storeShc = shcRow.shelfCapacity;
                        const diff = storeShc - planShc;
                        
                        if (diff < 0) {
                            finalResults.push({
                                ...shcRow,
                                ...orgInfo,
                                ...matchingPlanogramItem,
                                planShc,
                                diff,
                            });
                        }
                    }
                }
            }
             if (!itemFoundInAnyPlanogram) {
                // Mismatch logic here if needed
            }
        }
        
        postMessage({ type: 'progress', payload: { message: 'Finalizing results...', percentage: 90 } } as ShcWorkerMessage);

        // TODO: Build the hierarchical result object from finalResults

        const finalMessage: ShcWorkerMessage = {
            type: 'complete',
            payload: {
                results: {}, // Hierarchical object goes here
                mismatches: [], // Mismatches go here
            },
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
