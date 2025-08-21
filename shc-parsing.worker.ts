import { parseShcFile, shcRowMapper } from './utils/parsing';
import type { ShcParsingWorkerRequest, ShcParsingWorkerMessage, ShcDataRow } from './utils/types';
import Papa from 'papaparse';

const BATCH_SIZE_FOR_POSTING = 5000;

const readFileWithProgress = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            resolve(event.target?.result as ArrayBuffer);
        };

        reader.onerror = () => {
            reject(reader.error);
        };

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = (event.loaded / event.total) * 100;
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
    
    if (dataType === 'shc') {
        // --- NEW CSV Streaming Logic ---
        let batch: ShcDataRow[] = [];
        let totalRows = 0;

        postMessage({
            type: 'progress',
            payload: { message: 'status.import.processing', percentage: 0 }
        } as ShcParsingWorkerMessage);

        Papa.parse(file, {
            worker: false, // We are already in a worker
            skipEmptyLines: true,
            chunk: (results, parser) => {
                const chunkData = results.data as string[][];
                
                for (const row of chunkData) {
                    const itemStatus = row[5]?.trim();
                    const shelfCapacityUnit = row[21]?.trim();
                    
                    if (itemStatus === '8' && shelfCapacityUnit === 'C') {
                        const mappedRow = shcRowMapper(row);
                        if (mappedRow) {
                            batch.push(mappedRow);
                            totalRows++;
                        }
                    }
                }

                if (batch.length >= BATCH_SIZE_FOR_POSTING) {
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
                    postMessage({ type: 'data', payload: batch } as ShcParsingWorkerMessage);
                }
                
                postMessage({ type: 'complete', payload: { totalRows } } as ShcParsingWorkerMessage);
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
            const buffer = await readFileWithProgress(file);

            postMessage({
                type: 'progress',
                payload: { message: 'status.import.parsingExcel' }
            } as ShcParsingWorkerMessage);

            const parsedData = parseShcFile(dataType, buffer);
            const totalRows = parsedData.length;

            postMessage({
                type: 'progress',
                payload: { message: 'status.import.processing', percentage: 0 }
            } as ShcParsingWorkerMessage);

            for (let i = 0; i < totalRows; i += BATCH_SIZE_FOR_POSTING) {
                const batch = parsedData.slice(i, i + BATCH_SIZE_FOR_POSTING);
                postMessage({ type: 'data', payload: batch } as ShcParsingWorkerMessage);
            }

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
