import { parseShcFile, shcRowMapper } from './utils/parsing';
import type { ShcParsingWorkerRequest, ShcParsingWorkerMessage, ShcDataRow } from './utils/types';
import Papa from 'papaparse';

const BATCH_SIZE_FOR_POSTING = 5000;

const readFileWithProgress = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            console.log(`[Parser Worker] Finished reading file ${file.name} into buffer.`);
            resolve(event.target?.result as ArrayBuffer);
        };

        reader.onerror = () => {
            console.error(`[Parser Worker] Error reading file ${file.name}.`);
            reject(reader.error);
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = (event.loaded / event.total) * 100;
                 console.log(`[Parser Worker] Reading file ${file.name}: ${percentage.toFixed(2)}%`);
                postMessage({
                    type: 'progress',
                    payload: { message: 'status.import.readingFile', percentage }
                } as ShcParsingWorkerMessage);
            }
        };

        reader.readAsArrayBuffer(file);
    });
};


self.onmessage = async (e: MessageEvent<ShcParsingWorkerRequest>) => {
    const { dataType, file } = e.data;
    console.log(`[Parser Worker] Received file for processing. Type: ${dataType}, Name: ${file.name}, Size: ${file.size} bytes`);
    
    if (dataType === 'shc') {
        // --- NEW CSV Streaming Logic ---
        let batch: ShcDataRow[] = [];
        let totalRows = 0;
        let acceptedRows = 0;
        let chunkCount = 0;

        console.log(`[Parser Worker] Starting CSV stream parsing for ${file.name}`);

        postMessage({
            type: 'progress',
            payload: { message: 'status.import.processing', percentage: 0 }
        } as ShcParsingWorkerMessage);

        Papa.parse(file, {
            worker: false, // We are already in a worker
            skipEmptyLines: true,
            quoteChar: '"',
            escapeChar: '"',
            chunk: (results, parser) => {
                chunkCount++;
                const chunkData = results.data as string[][];
                const chunkTotalRows = chunkData.length;
                let chunkAcceptedRows = 0;
                
                for (const row of chunkData) {
                    const itemStatus = row[5]?.trim();
                    const shelfCapacityUnit = row[21]?.trim();
                    
                    if (itemStatus === '8' && shelfCapacityUnit === 'C') {
                        const mappedRow = shcRowMapper(row);
                        if (mappedRow) {
                            batch.push(mappedRow);
                            chunkAcceptedRows++;
                        }
                    }
                }

                totalRows += chunkTotalRows;
                acceptedRows += chunkAcceptedRows;
                console.log(`[Parser Worker] Chunk #${chunkCount} processed: ${chunkTotalRows} rows read, ${chunkAcceptedRows} rows accepted (Status=8, Unit=C).`);

                if (batch.length >= BATCH_SIZE_FOR_POSTING) {
                    console.log(`[Parser Worker] Posting batch of ${batch.length} rows to main thread.`);
                    postMessage({ type: 'data', payload: batch } as ShcParsingWorkerMessage);
                    batch = [];
                }
                
                const percentage = file.size > 0 ? (results.meta.cursor / file.size) * 100 : 0;
                postMessage({
                    type: 'progress',
                    payload: { message: 'status.import.processing', percentage }
                } as ShcParsingWorkerMessage);
            },
            complete: () => {
                if (batch.length > 0) {
                    console.log(`[Parser Worker] Posting final batch of ${batch.length} rows to main thread.`);
                    postMessage({ type: 'data', payload: batch } as ShcParsingWorkerMessage);
                }
                
                console.log(`[Parser Worker] CSV stream parsing complete for ${file.name}. Total rows read: ${totalRows}, Total rows accepted: ${acceptedRows}`);
                postMessage({ type: 'complete', payload: { totalRows: acceptedRows } } as ShcParsingWorkerMessage);
            },
            error: (error) => {
                console.error('Error in PapaParse streaming:', error);
                postMessage({
                    type: 'error',
                    payload: error.message
                } as ShcParsingWorkerMessage);
            }
        });

    } else {
        // --- EXISTING Excel Logic for other files ---
        try {
            console.log(`[Parser Worker] Starting Excel file processing for ${dataType}`);
            const buffer = await readFileWithProgress(file);

            postMessage({
                type: 'progress',
                payload: { message: 'status.import.parsingExcel' }
            } as ShcParsingWorkerMessage);
            
            console.log(`[Parser Worker] Parsing Excel buffer for ${dataType}...`);
            const parsedData = parseShcFile(dataType, buffer);
            const totalRows = parsedData.length;
            console.log(`[Parser Worker] Excel parsing complete. Found ${totalRows} valid rows.`);

            postMessage({
                type: 'progress',
                payload: { message: 'status.import.processing', percentage: 0 }
            } as ShcParsingWorkerMessage);

            for (let i = 0; i < totalRows; i += BATCH_SIZE_FOR_POSTING) {
                const batch = parsedData.slice(i, i + BATCH_SIZE_FOR_POSTING);
                console.log(`[Parser Worker] Posting batch ${i / BATCH_SIZE_FOR_POSTING + 1} of ${Math.ceil(totalRows / BATCH_SIZE_FOR_POSTING)} with ${batch.length} rows.`);
                postMessage({ type: 'data', payload: batch } as ShcParsingWorkerMessage);
            }

            console.log(`[Parser Worker] All data sent to main thread for ${dataType}.`);
            postMessage({ type: 'complete', payload: { totalRows } } as ShcParsingWorkerMessage);

        } catch (error) {
            console.error(`Error in SHC parsing worker (${dataType}):`, error);
            postMessage({
                type: 'error',
                payload: error instanceof Error ? error.message : 'An unknown error occurred during file parsing.'
            } as ShcParsingWorkerMessage);
        }
    }
};
