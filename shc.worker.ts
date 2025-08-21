import Papa from 'papaparse';
import { 
    ShcWorkerMessage, 
    ShcWorkerRequest, 
    ShcDataRow,
    PlanogramRow,
    OrgStructureRow,
    CategoryRelationRow,
} from './utils/types';

const parseShcFile = (fileContent: string): ShcDataRow[] => {
    const results = Papa.parse<any[]>(fileContent, { skipEmptyLines: true });
    return results.data.map(row => ({
        storeNumber: row[0]?.trim(),
        itemNumber: row[2]?.trim(),
        itemDescription: row[3]?.trim(),
        piecesInBox: parseInt(row[4], 10) || 0,
        itemStatus: row[5]?.trim(),
        itemGroup: row[9]?.trim(),
        shelfCapacity: parseInt(row[19], 10) || 0,
        shelfCapacityUnit: row[21]?.trim(),
    }));
};

const parsePlanogramFile = (fileContent: string): PlanogramRow[] => {
    const results = Papa.parse<any[]>(fileContent, { skipEmptyLines: true });
    const data: PlanogramRow[] = [];
    let lastSectionDescX23 = '';
    let lastSectionDescX24 = '';
    let lastSectionDescX25 = '';

    for (const row of results.data) {
        const currentSectionDescX23 = row[2]?.trim() || lastSectionDescX23;
        const currentSectionDescX24 = row[3]?.trim() || lastSectionDescX24;
        const currentSectionDescX25 = row[4]?.trim() || lastSectionDescX25;
        
        // This check ensures we only process rows that have an article number
        if (row[5]?.trim()) {
            data.push({
                generalStoreArea: currentSectionDescX23,
                settingSpecificallyFor: currentSectionDescX24,
                settingWidth: currentSectionDescX25,
                itemNumber: row[5]?.trim(),
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

const parseOrgStructureFile = (fileContent: string): OrgStructureRow[] => {
    const results = Papa.parse<any[]>(fileContent, { skipEmptyLines: true, header: false });
    // Assuming first row might be a header and skipping it
    return results.data.slice(1).map(row => ({
        storeNumber: row[0]?.trim(),
        storeName: row[1]?.trim(),
        warehouseId: row[3]?.trim().substring(0, 3),
        areaManager: row[12]?.trim(),
        headOfSales: row[13]?.trim(),
    }));
};

const parseCategoryRelationFile = (fileContent: string): CategoryRelationRow[] => {
    const results = Papa.parse<{[key: string]: string}>(fileContent, { skipEmptyLines: true, header: true });
    return results.data.map(row => {
        const storeName = row['StoreName']?.trim() || '';
        const storeNumberMatch = storeName.match(/(\d{4})$/);
        const storeNumber = storeNumberMatch ? String(parseInt(storeNumberMatch[1], 10)) : '';

        return {
            generalStoreArea: row['CategoryHierarchy03']?.trim(),
            settingSpecificallyFor: row['CategoryHierarchy04']?.trim(),
            settingWidth: row['CategoryHierarchy05']?.trim(),
            storeNumber,
        };
    });
};

const createLocatorKey = (s1: string, s2: string): string => {
    return (s1 + s2).replace(/\s/g, '');
};

onmessage = async (e: MessageEvent<ShcWorkerRequest>) => {
    const { files, sectionConfig } = e.data;
    
    try {
        postMessage({ type: 'progress', payload: { message: 'Parsing SHC file...', percentage: 10 } } as ShcWorkerMessage);
        const shcData = parseShcFile(files.shc).filter(row => row.itemStatus === '8' && row.shelfCapacityUnit === 'C');

        postMessage({ type: 'progress', payload: { message: 'Parsing Planogram file...', percentage: 25 } } as ShcWorkerMessage);
        const planogramData = parsePlanogramFile(files.planogram);

        postMessage({ type: 'progress', payload: { message: 'Parsing Organizational Structure file...', percentage: 40 } } as ShcWorkerMessage);
        const orgStructureData = parseOrgStructureFile(files.orgStructure);
        
        postMessage({ type: 'progress', payload: { message: 'Parsing Category Relation file...', percentage: 55 } } as ShcWorkerMessage);
        const categoryRelationData = parseCategoryRelationFile(files.categoryRelation);

        postMessage({ type: 'progress', payload: { message: 'Preparing data for joining...', percentage: 70 } } as ShcWorkerMessage);

        planogramData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });

        categoryRelationData.forEach(row => {
            row.locatorKey = createLocatorKey(row.settingSpecificallyFor, row.settingWidth);
        });

        const orgMap = new Map(orgStructureData.map(row => [row.storeNumber, row]));
        const categoryMap = new Map<string, CategoryRelationRow[]>();
        categoryRelationData.forEach(row => {
            if (!categoryMap.has(row.locatorKey!)) {
                categoryMap.set(row.locatorKey!, []);
            }
            categoryMap.get(row.locatorKey!)!.push(row);
        });
        
        const planogramMap = new Map<string, PlanogramRow[]>();
        planogramData.forEach(row => {
            if (!planogramMap.has(row.locatorKey!)) {
                planogramMap.set(row.locatorKey!, []);
            }
            planogramMap.get(row.locatorKey!)!.push(row);
        });

        postMessage({ type: 'progress', payload: { message: 'Joining data and calculating differences...', percentage: 85 } } as ShcWorkerMessage);

        const mismatches: any[] = [];
        const finalResults: any[] = [];
        
        for (const shcRow of shcData) {
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
