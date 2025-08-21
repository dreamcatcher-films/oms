import { parseShcFile } from './utils/parsing';
import type { ShcParsingWorkerRequest, ShcParsingWorkerMessage } from './utils/types';

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
    try {
        const buffer = await readFileWithProgress(file);

        postMessage({
            type: 'progress',
            payload: { message: 'status.import.parsingExcel' }
        } as ShcParsingWorkerMessage);

        const parsedData = parseShcFile(dataType, buffer);
        const totalRows = parsedData.length;

        // Post a single message about saving, the main thread will handle batch progress
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
        console.error('Error in SHC parsing worker:', error);
        postMessage({
            type: 'error',
            payload: error instanceof Error ? error.message : 'An unknown error occurred during file parsing.'
        } as ShcParsingWorkerMessage);
    }
};
