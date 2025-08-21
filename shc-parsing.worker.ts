import { parseShcFile } from './utils/parsing';
import type { ShcParsingWorkerRequest, ShcParsingWorkerMessage } from './utils/types';

// This constant can be tuned based on performance tests
const BATCH_SIZE_FOR_POSTING = 5000;

self.onmessage = async (e: MessageEvent<ShcParsingWorkerRequest>) => {
    const { dataType, file } = e.data;
    try {
        postMessage({
            type: 'progress',
            payload: { message: `Reading ${file.name} into memory...` }
        } as ShcParsingWorkerMessage);

        // The heavy lifting (reading and parsing the entire file) happens here, in the worker.
        const parsedData = await parseShcFile(dataType, file);
        const totalRows = parsedData.length;

        postMessage({
            type: 'progress',
            payload: { message: `Parsed ${totalRows.toLocaleString()} rows. Saving to database...` }
        } as ShcParsingWorkerMessage);

        // Send data back to the main thread in manageable chunks to avoid overwhelming it.
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
