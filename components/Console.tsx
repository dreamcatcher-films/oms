import { useState, useEffect, useRef } from 'preact/hooks';
import styles from './Console.module.css';

export type LogEntry = {
    timestamp: string;
    level: 'log' | 'warn' | 'error';
    message: any[];
};

type ConsoleProps = {
    logs: LogEntry[];
    isVisible: boolean;
    onClear: () => void;
    onClose: () => void;
};

const formatMessage = (args: any[]): string => {
    return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return '[Unserializable Object]';
            }
        }
        return String(arg);
    }).join(' ');
};

export const Console = ({ logs, isVisible, onClear, onClose }: ConsoleProps) => {
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (isVisible && autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, isVisible, autoScroll]);

    return (
        <div class={`${styles['console-container']} ${isVisible ? styles.visible : ''}`}>
            <div class={styles['console-header']}>
                <h3>Application Console</h3>
                <div class={styles['console-controls']}>
                    <label>
                        <input type="checkbox" checked={autoScroll} onChange={() => setAutoScroll(s => !s)} />
                        Auto-scroll
                    </label>
                    <button onClick={onClear}>Clear</button>
                    <button onClick={onClose} class={styles['close-btn']}>&times;</button>
                </div>
            </div>
            <div class={styles['log-list']} ref={logContainerRef}>
                {logs.map((log, index) => (
                    <div key={index} class={`${styles['log-entry']} ${styles[log.level]}`}>
                        <span class={styles['log-timestamp']}>{log.timestamp}</span>
                        <span class={styles['log-level']}>{log.level.toUpperCase()}</span>
                        <pre class={styles['log-message']}>{formatMessage(log.message)}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
};
