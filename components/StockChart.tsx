import { useMemo, useState } from "preact/hooks";
import { useTranslation } from '../i18n';
// Fix: Corrected import path for worker-related types. They are defined in utils/types.ts, not the worker file.
import type { SimulationLogEntry } from '../utils/types';
import styles from './StockChart.module.css';

type StockChartProps = {
    data: SimulationLogEntry[];
};

type TooltipData = {
    visible: boolean;
    x: number;
    y: number;
    entry: SimulationLogEntry | null;
};

const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
const SVG_HEIGHT = 250;
const SVG_WIDTH = 800; // Will be scaled by CSS

export const StockChart = ({ data }: StockChartProps) => {
    const { t, language } = useTranslation();
    const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, x: 0, y: 0, entry: null });

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        const width = SVG_WIDTH - PADDING.left - PADDING.right;
        const height = SVG_HEIGHT - PADDING.top - PADDING.bottom;

        const maxStock = Math.max(...data.map(d => d.stockEnd), ...data.map(d => d.stockStart), 1);
        const yMax = Math.ceil(maxStock * 1.1); // Add 10% ceiling

        const xScale = (index: number) => PADDING.left + (index / (data.length - 1)) * width;
        const yScale = (value: number) => PADDING.top + height - (value / yMax) * height;

        const linePath = data
            .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.stockEnd)}`)
            .join(' ');
        
        const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
            const value = (yMax / 4) * i;
            return {
                y: yScale(value),
                value: Math.round(value),
            };
        });

        const xAxisLabels = data.map((d, i) => ({
            x: xScale(i),
            label: new Date(d.date).toLocaleDateString(language, { month: 'short', day: 'numeric' }),
        }));
        
        const points = data.map((entry, index) => ({
            x: xScale(index),
            y: yScale(entry.stockEnd),
            entry,
        }));

        return { width, height, yMax, linePath, yAxisLabels, xAxisLabels, points };
    }, [data, language]);

    if (!chartData) {
        return <div class={styles['stock-chart-container']}><p>{t('simulations.results.none')}</p></div>;
    }
    
    const { yMax, linePath, yAxisLabels, xAxisLabels, points } = chartData;
    
    const handleMouseMove = (event: MouseEvent) => {
        const svg = (event.currentTarget as SVGSVGElement);
        const svgRect = svg.getBoundingClientRect();
        const x = event.clientX - svgRect.left;
        
        const chartWidth = svgRect.width - PADDING.left - PADDING.right;
        const index = Math.round(((x - PADDING.left) / chartWidth) * (data.length - 1));

        if (index >= 0 && index < data.length) {
            const point = points[index];
            setTooltip({
                visible: true,
                x: point.x,
                y: point.y,
                entry: point.entry
            });
        }
    };

    const handleMouseLeave = () => {
        setTooltip({ visible: false, x: 0, y: 0, entry: null });
    };

    return (
        <div class={styles['stock-chart-container']}>
            <svg 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
                class={styles['stock-chart-svg']}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Y-Axis */}
                <line class={styles['axis-line']} x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={SVG_HEIGHT - PADDING.bottom} />
                {yAxisLabels.map(({ y, value }) => (
                    <g key={y}>
                        <text class={styles['axis-text']} x={PADDING.left - 10} y={y} dominant-baseline="middle" text-anchor="end">{value}</text>
                        <line class={styles['axis-line']} stroke-dasharray="2,2" x1={PADDING.left} y1={y} x2={SVG_WIDTH - PADDING.right} y2={y} />
                    </g>
                ))}

                {/* X-Axis */}
                <line class={styles['axis-line']} x1={PADDING.left} y1={SVG_HEIGHT - PADDING.bottom} x2={SVG_WIDTH - PADDING.right} y2={SVG_HEIGHT - PADDING.bottom} />
                 {xAxisLabels.map(({ x, label }, i) => (
                    i % 2 === 0 && <text class={styles['axis-text']} x={x} y={SVG_HEIGHT - PADDING.bottom + 20} text-anchor="middle">{label}</text>
                 ))}

                {/* Data Line */}
                <path class={styles['stock-line']} d={linePath} />

                {/* Data Points and Markers */}
                {points.map(({ x, y, entry }, i) => (
                    <g key={i}>
                        {/* Invisible hover area for each point */}
                        <circle class={styles['hover-area']} cx={x} cy={y} r="10" />

                        {/* Stockout Marker */}
                        {entry.stockEnd === 0 && (
                            <circle class={styles['data-point-stockout']} cx={x} cy={y} r="5" />
                        )}

                        {/* Delivery Marker */}
                        {entry.receipts > 0 && (
                            <circle class={styles['data-point-receipt']} cx={x} cy={y} r="5" />
                        )}

                        {/* Write-off Marker */}
                        {entry.writeOffs > 0 && (
                            <g>
                                <line class={styles['data-point-write-off']} x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} />
                                <line class={styles['data-point-write-off']} x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} />
                            </g>
                        )}
                    </g>
                ))}

                 {/* Tooltip Indicator Line */}
                {tooltip.visible && (
                    <line 
                        class={styles['axis-line']}
                        stroke-dasharray="3,3" 
                        x1={tooltip.x} y1={PADDING.top} 
                        x2={tooltip.x} y2={SVG_HEIGHT - PADDING.bottom} 
                    />
                )}
            </svg>

            {tooltip.visible && tooltip.entry && (
                <div class={`${styles['chart-tooltip']} ${tooltip.visible ? styles.visible : ''}`} style={{ left: `${(tooltip.x / SVG_WIDTH) * 100}%`, top: `${tooltip.y}px` }}>
                    <span class={styles['tooltip-title']}>{tooltip.entry.date}</span>
                    <div class={styles['tooltip-grid']}>
                        <span>{t('simulations.log.stockEnd')}</span><span>{tooltip.entry.stockEnd.toLocaleString(language)}</span>
                        <span>{t('simulations.log.sales')}</span><span>{tooltip.entry.sales.toLocaleString(language)}</span>
                        <span>{t('simulations.log.receipts')}</span><span>{tooltip.entry.receipts.toLocaleString(language)}</span>
                        <span>{t('simulations.log.writeOffs')}</span><span>{tooltip.entry.writeOffs.toLocaleString(language)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
