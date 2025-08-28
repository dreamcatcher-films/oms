import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { 
    WriteOffsActual, WriteOffsTarget, OrgStructureRow, 
    ReportRow, WriteOffsMetrics, RDC, DirectorOfOperations
} from '../utils/types';
import { 
    getAllWriteOffsWeekly, getAllWriteOffsYTD, 
    getAllWriteOffsTargets, getAllOrgStructureData,
    loadRdcList, loadDooList
} from '../db';
import styles from './WriteOffsReportView.module.css';
import sharedStyles from '../styles/shared.module.css';

const METRIC_NAME_MATCHERS = {
    TURNOVER: (name: string) => name.includes('Net Turnover'),
    WRITE_OFFS_VALUE: (name: string) => name.includes('Write Offs Store (value)'),
    WRITE_OFFS_PERCENT: (name: string) => name.includes('Store write offs (%)'),
    WRITE_OFFS_TOTAL_VALUE: (name: string) => name.includes('Write Offs Total (value)'),
    WRITE_OFFS_TOTAL_PERCENT: (name: string) => name.includes('Write Offs Total (%)'),
    DISCOUNTS_VALUE: (name: string) => name.includes('Discounts (value)'),
    DISCOUNTS_PERCENT: (name: string) => name.includes('Discounts (%)'),
    DAMAGES_VALUE: (name: string) => name.includes('Damages Store (value)'),
    DAMAGES_PERCENT: (name: string) => name.includes('Damages Store (%)'),
};

type SortConfig = {
    key: 'turnover' | 'writeOffsTotalPercent';
    direction: 'asc' | 'desc';
};

type RankingRow = {
    rank: number;
    storeNumber: string;
    storeName: string;
    areaManager: string;
    headOfSales: string;
    metrics: WriteOffsMetrics;
};


const createEmptyMetrics = (): WriteOffsMetrics => ({
    turnover: 0,
    writeOffsValue: 0,
    writeOffsPercent: 0,
    writeOffsTotalValue: 0,
    writeOffsTotalPercent: 0,
    discountsValue: 0,
    discountsPercent: 0,
    damagesValue: 0,
    damagesPercent: 0,
    target: null,
    deviation: null,
});

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
const formatValue = (value: number) => `£${Math.round(value).toLocaleString('en-GB')}`;
const formatDeviation = (value: number | null) => value !== null ? `${(value * 100).toFixed(2)} p.p.` : '-';

const DataBarCell = ({ value, maxValue, formatter, barClass }: { value: number; maxValue: number; formatter: (v: number) => string; barClass: string; }) => {
    const widthPercent = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
    return (
        <td class={styles['data-bar-cell']}>
            <div class={styles['data-bar-container']}>
                <div class={`${styles['data-bar']} ${barClass}`} style={{ width: `${widthPercent}%` }}></div>
                <span>{formatter(value)}</span>
            </div>
        </td>
    );
};

const HierarchyRowComponent = ({ row, expandedRows, onToggle, viewMode }: { row: ReportRow, expandedRows: Set<string>, onToggle: (id: string) => void, viewMode: 'weekly' | 'ytd' }) => {
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = row.children.length > 0;
    
    // Positive deviation is now unfavorable (red), negative is favorable (green)
    const deviationClass = row.metrics.deviation === null ? '' :
        row.metrics.deviation > 0 ? styles['deviation-unfavorable'] : styles['deviation-favorable'];
    
    const ytdDeviationClass = row.ytdMetrics?.deviation === null || row.ytdMetrics?.deviation === undefined ? '' :
        row.ytdMetrics.deviation > 0 ? styles['deviation-unfavorable'] : styles['deviation-favorable'];
    
    const rowClass = styles[`row-level-${row.level}`];

    return (
        <>
            <tr class={`${rowClass} ${hasChildren ? styles.clickable : ''}`} onClick={() => hasChildren && onToggle(row.id)}>
                <td class={styles['indent-cell']} style={{ paddingLeft: `${row.level * 1.5 + 0.5}rem` }}>
                    {hasChildren && <span class={`${styles['toggle-icon']} ${isExpanded ? styles.expanded : ''}`}>▶</span>}
                    {row.name}
                    {row.level < 5 && <span class={styles.storeCount}>( {row.storeCount} )</span>}
                </td>
                 <DataBarCell
                    value={row.metrics.turnover}
                    maxValue={row.maxValuesInScope?.turnover ?? 0}
                    formatter={formatValue}
                    barClass={styles['value-bar']}
                />
                <DataBarCell
                    value={row.metrics.writeOffsValue}
                    maxValue={row.maxValuesInScope?.writeOffsValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['value-bar']}
                />
                <DataBarCell
                    value={row.metrics.writeOffsPercent}
                    maxValue={row.maxValuesInScope?.writeOffsPercent ?? 0}
                    formatter={formatPercent}
                    barClass={styles['percent-bar']}
                />
                <DataBarCell
                    value={row.metrics.discountsValue}
                    maxValue={row.maxValuesInScope?.discountsValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['value-bar']}
                />
                 <DataBarCell
                    value={row.metrics.discountsPercent}
                    maxValue={row.maxValuesInScope?.discountsPercent ?? 0}
                    formatter={formatPercent}
                    barClass={styles['percent-bar']}
                />
                <DataBarCell
                    value={row.metrics.damagesValue}
                    maxValue={row.maxValuesInScope?.damagesValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['value-bar']}
                />
                <DataBarCell
                    value={row.metrics.damagesPercent}
                    maxValue={row.maxValuesInScope?.damagesPercent ?? 0}
                    formatter={formatPercent}
                    barClass={styles['percent-bar']}
                />
                <DataBarCell
                    value={row.metrics.writeOffsTotalValue}
                    maxValue={row.maxValuesInScope?.writeOffsTotalValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['value-bar']}
                />
                <DataBarCell
                    value={row.metrics.writeOffsTotalPercent}
                    maxValue={row.maxValuesInScope?.writeOffsTotalPercent ?? 0}
                    formatter={formatPercent}
                    barClass={styles['percent-bar']}
                />
                <td style={{textAlign: 'center'}}>{row.metrics.target !== null ? formatPercent(row.metrics.target) : '-'}</td>
                <td class={deviationClass} style={{textAlign: 'center'}}>
                    {formatDeviation(row.metrics.deviation)}
                </td>
                {viewMode === 'weekly' && (
                  <>
                    <td class={styles['ytd-separator']}></td>
                    <td style={{textAlign: 'center'}}>{row.ytdMetrics ? formatPercent(row.ytdMetrics.writeOffsTotalPercent) : '-'}</td>
                    <td style={{textAlign: 'center'}}>{row.ytdMetrics?.target !== null && row.ytdMetrics?.target !== undefined ? formatPercent(row.ytdMetrics.target) : '-'}</td>
                    <td class={ytdDeviationClass} style={{textAlign: 'center'}}>{formatDeviation(row.ytdMetrics?.deviation ?? null)}</td>
                  </>
                )}
                <td class={styles['store-name-repeat']}>{row.level === 5 ? row.name : ''}</td>
            </tr>
            {isExpanded && row.children.map(child => (
                <HierarchyRowComponent key={child.id} row={child} expandedRows={expandedRows} onToggle={onToggle} viewMode={viewMode} />
            ))}
        </>
    );
};

const RankingTable = ({ data }: { data: RankingRow[] }) => {
    const { t } = useTranslation();
    return (
        <table class={styles['report-table']}>
            <thead>
                <tr>
                    <th class={styles['ranking-header']}>Rank</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.regionManagerStore')}</th>
                    <th class={styles['ranking-header']}>AM</th>
                    <th class={styles['ranking-header']}>HoS</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.turnover')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.writeOffsValue')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.writeOffsPercent')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.discountsValue')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.discountsPercent')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.damagesValue')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.damagesPercent')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.writeOffsTotalValue')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.writeOffsTotalPercent')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.targetPercent')}</th>
                    <th class={styles['ranking-header']}>{t('columns.writeOffs.deviation')}</th>
                </tr>
            </thead>
            <tbody>
                {data.map(item => {
                    const { metrics } = item;
                    const deviationClass = metrics.deviation === null ? '' :
                        metrics.deviation > 0 ? styles['deviation-unfavorable'] : styles['deviation-favorable'];
                    return (
                        <tr key={item.storeNumber}>
                            <td class={styles['centered-cell']}>{item.rank}</td>
                            <td class={`${styles['left-aligned-cell']} ${styles['store-name-cell']}`}>{item.storeNumber} - {item.storeName}</td>
                            <td class={styles['left-aligned-cell']}>{item.areaManager}</td>
                            <td class={styles['left-aligned-cell']}>{item.headOfSales}</td>
                            <td class={styles['centered-cell']}>{formatValue(metrics.turnover)}</td>
                            <td class={styles['centered-cell']}>{formatValue(metrics.writeOffsValue)}</td>
                            <td class={styles['centered-cell']}>{formatPercent(metrics.writeOffsPercent)}</td>
                            <td class={styles['centered-cell']}>{formatValue(metrics.discountsValue)}</td>
                            <td class={styles['centered-cell']}>{formatPercent(metrics.discountsPercent)}</td>
                            <td class={styles['centered-cell']}>{formatValue(metrics.damagesValue)}</td>
                            <td class={styles['centered-cell']}>{formatPercent(metrics.damagesPercent)}</td>
                            <td class={styles['centered-cell']}>{formatValue(metrics.writeOffsTotalValue)}</td>
                            <td class={styles['centered-cell']}>{formatPercent(metrics.writeOffsTotalPercent)}</td>
                            <td class={styles['centered-cell']}>{metrics.target !== null ? formatPercent(metrics.target) : '-'}</td>
                            <td class={`${deviationClass} ${styles['centered-cell']}`}>{formatDeviation(metrics.deviation)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export const WriteOffsReportView = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  
  const [weeklyActuals, setWeeklyActuals] = useState<WriteOffsActual[]>([]);
  const [ytdActuals, setYtdActuals] = useState<WriteOffsActual[]>([]);
  const [targets, setTargets] = useState<WriteOffsTarget[]>([]);
  const [orgStructure, setOrgStructure] = useState<OrgStructureRow[]>([]);
  const [rdcList, setRdcList] = useState<RDC[]>([]);
  const [dooList, setDooList] = useState<DirectorOfOperations[]>([]);

  const [reportType, setReportType] = useState<'hierarchy' | 'ranking'>('hierarchy');
  const [viewMode, setViewMode] = useState<'weekly' | 'ytd'>('weekly');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedRdc, setSelectedRdc] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [weekly, ytd, targetsData, org, rdcs, doos] = await Promise.all([
                getAllWriteOffsWeekly(),
                getAllWriteOffsYTD(),
                getAllWriteOffsTargets(),
                getAllOrgStructureData(),
                loadRdcList(),
                loadDooList(),
            ]);
            setWeeklyActuals(weekly);
            setYtdActuals(ytd);
            setTargets(targetsData);
            setOrgStructure(org);
            setRdcList(rdcs);
            if (rdcs.length > 0) setSelectedRdc(rdcs[0].id);
            setDooList(doos || []);
            
            const allActuals = [...weekly, ...ytd];
            const groups = [...new Set(allActuals.map(a => `${a.itemGroupNumber} - ${a.itemGroupName}`))];
            setAvailableGroups(groups.sort());

            const weeks = [...new Set(weekly.map(a => a.period))].sort((a,b) => b.localeCompare(a));
            setAvailableWeeks(weeks);
            if (weeks.length > 0) {
                setSelectedWeek(weeks[0]);
            }

        } catch (error) {
            console.error("Failed to fetch data for Write-Offs Report", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);
  
  const reportData = useMemo<ReportRow | null>(() => {
    if (reportType !== 'hierarchy' || isLoading || orgStructure.length === 0) return null;
    
    const dataToProcess = {
        main: { actuals: viewMode === 'weekly' ? weeklyActuals : ytdActuals, targetType: viewMode === 'weekly' ? 'monthlyTarget' : 'yearlyTarget' },
        ytd: viewMode === 'weekly' ? { actuals: ytdActuals, targetType: 'yearlyTarget' } : null,
    };

    const processDataSet = (dataset: { actuals: WriteOffsActual[]; targetType: 'monthlyTarget' | 'yearlyTarget' }) => {
        let { actuals } = dataset;
        if (viewMode === 'weekly' && selectedWeek) {
            actuals = actuals.filter(a => a.period === selectedWeek);
        }
        
        const filteredActuals = actuals.filter(a => (selectedGroup === 'all' || `${a.itemGroupNumber} - ${a.itemGroupName}` === selectedGroup));
        
        const actualsByStore = new Map<string, WriteOffsActual[]>();
        for (const actual of filteredActuals) {
            if (!actualsByStore.has(actual.storeNumber)) actualsByStore.set(actual.storeNumber, []);
            actualsByStore.get(actual.storeNumber)!.push(actual);
        }

        const metricsByStore = new Map<string, WriteOffsMetrics>();
        for (const store of orgStructure) {
            const storeActuals = actualsByStore.get(store.storeNumber) || [];
            if (storeActuals.length === 0) continue;
            
            const metrics = createEmptyMetrics();
            const getMetric = (matcher: (name: string) => boolean) => storeActuals.find(a => matcher(a.metricName))?.value || 0;
            
            metrics.turnover = getMetric(METRIC_NAME_MATCHERS.TURNOVER);
            if (metrics.turnover === 0 && dataset === dataToProcess.main) continue;

            metrics.writeOffsValue = getMetric(METRIC_NAME_MATCHERS.WRITE_OFFS_VALUE);
            metrics.writeOffsTotalValue = getMetric(METRIC_NAME_MATCHERS.WRITE_OFFS_TOTAL_VALUE);
            metrics.discountsValue = getMetric(METRIC_NAME_MATCHERS.DISCOUNTS_VALUE);
            metrics.damagesValue = getMetric(METRIC_NAME_MATCHERS.DAMAGES_VALUE);

            metrics.writeOffsPercent = metrics.turnover > 0 ? metrics.writeOffsValue / metrics.turnover : 0;
            metrics.writeOffsTotalPercent = metrics.turnover > 0 ? metrics.writeOffsTotalValue / metrics.turnover : 0;
            metrics.discountsPercent = metrics.turnover > 0 ? metrics.discountsValue / metrics.turnover : 0;
            metrics.damagesPercent = metrics.turnover > 0 ? metrics.damagesValue / metrics.turnover : 0;

            if (selectedGroup !== 'all') {
                const [groupNumber] = selectedGroup.split(' - ');
                const target = targets.find(t => t.storeNumber === store.storeNumber && t.itemGroupNumber === groupNumber);
                if (target) {
                    const targetValue = target[dataset.targetType];
                    if (targetValue !== undefined) {
                        metrics.target = targetValue;
                        metrics.deviation = targetValue - metrics.writeOffsTotalPercent;
                    }
                }
            }
            metricsByStore.set(store.storeNumber, metrics);
        }
        return metricsByStore;
    };

    const mainMetricsByStore = processDataSet(dataToProcess.main);
    const ytdMetricsByStore = dataToProcess.ytd ? processDataSet(dataToProcess.ytd) : null;

    const aggregateHierarchyNode = (rows: ReportRow[], level: number): { metrics: WriteOffsMetrics, summedMetrics: WriteOffsMetrics, storeCount: number, ytdMetrics?: ReportRow['ytdMetrics'] } => {
        const summed = { main: createEmptyMetrics(), ytd: createEmptyMetrics() };
        let storeCount = 0;

        for (const row of rows) {
            storeCount += row.storeCount;
            for (const key in row.summedMetrics) {
                (summed.main as any)[key] += (row.summedMetrics as any)[key];
            }
            if(viewMode === 'weekly' && row.summedMetrics.ytd) {
                 for (const key in row.summedMetrics.ytd) {
                    (summed.ytd as any)[key] += (row.summedMetrics.ytd as any)[key];
                }
            }
        }
        
        const calculateFinalMetrics = (s: WriteOffsMetrics) => {
            const final = { ...s };
            if ((level >= 1 && level <= 4) && storeCount > 0) { 
                 const avgKeys: (keyof WriteOffsMetrics)[] = ['turnover', 'writeOffsValue', 'writeOffsTotalValue', 'discountsValue', 'damagesValue'];
                 avgKeys.forEach(k => (final as any)[k] /= storeCount);
            }
            final.writeOffsPercent = s.turnover > 0 ? s.writeOffsValue / s.turnover : 0;
            final.writeOffsTotalPercent = s.turnover > 0 ? s.writeOffsTotalValue / s.turnover : 0;
            final.discountsPercent = s.turnover > 0 ? s.discountsValue / s.turnover : 0;
            final.damagesPercent = s.turnover > 0 ? s.damagesValue / s.turnover : 0;
            
            const totalTurnoverForTarget = s.target ?? 0; // Using target as a proxy for summed weighted target calc
            final.target = totalTurnoverForTarget > 0 ? s.deviation! / totalTurnoverForTarget : null; // Using deviation as a proxy
            
            if (final.target !== null) {
                final.deviation = final.target - final.writeOffsTotalPercent;
            }
            return final;
        };

        const finalMainMetrics = calculateFinalMetrics(summed.main);
        
        let finalYtdMetrics: ReportRow['ytdMetrics'] | undefined;
        if(viewMode === 'weekly') {
            const tempYtdMetrics = calculateFinalMetrics(summed.ytd);
            finalYtdMetrics = {
                writeOffsTotalPercent: tempYtdMetrics.writeOffsTotalPercent,
                target: tempYtdMetrics.target,
                deviation: tempYtdMetrics.deviation,
            };
        }
        
        // This is a bit of a hack to pass summed values up.
        summed.main.target = summed.main.deviation; // Store totalWeightedTarget
        summed.main.deviation = summed.main.target; // Store totalTurnoverForTarget
        if (viewMode === 'weekly') {
            summed.ytd.target = summed.ytd.deviation;
            summed.ytd.deviation = summed.ytd.target;
        }

        return { metrics: finalMainMetrics, summedMetrics: { ...summed.main, ytd: viewMode === 'weekly' ? summed.ytd : undefined }, storeCount, ytdMetrics: finalYtdMetrics };
    };
    
    const rdcNameMap = new Map(rdcList.map(rdc => [rdc.id, rdc.name]));
    const rdcToDooMap = new Map<string, string>();
    dooList.forEach(doo => { doo.rdcIds.forEach(rdcId => rdcToDooMap.set(rdcId, doo.directorName)); });
    
    const hierarchy = new Map<string, Map<string, Map<string, Map<string, OrgStructureRow[]>>>>();
    for (const store of orgStructure) {
        const dooName = rdcToDooMap.get(store.warehouseId) || 'Unassigned';
        if (!hierarchy.has(dooName)) hierarchy.set(dooName, new Map());
        const doo = hierarchy.get(dooName)!;
        if (!doo.has(store.warehouseId)) doo.set(store.warehouseId, new Map());
        const rdc = doo.get(store.warehouseId)!;
        if (!rdc.has(store.headOfSales)) rdc.set(store.headOfSales, new Map());
        const hos = rdc.get(store.headOfSales)!;
        if (!hos.has(store.areaManager)) hos.set(store.areaManager, []);
        hos.get(store.areaManager)!.push(store);
    }
    
    const buildRows = (map: Map<string, any>, level: number, parentId: string): ReportRow[] => {
        const rows: ReportRow[] = [];
        const sortedKeys = Array.from(map.keys()).sort();
        for (const key of sortedKeys) {
            const value = map.get(key);
            const id = `${parentId}-${key}`;
            let name = key;
            if(level === 2) name = `${rdcNameMap.get(key) || key} - ${key}`;
            
            const row: ReportRow = { id, name, level, children: [], metrics: createEmptyMetrics(), storeCount: 0, summedMetrics: createEmptyMetrics() };

            if (Array.isArray(value)) { // Store level
                for (const store of value) {
                    const storeMetrics = mainMetricsByStore.get(store.storeNumber);
                    if (storeMetrics) {
                        const ytdStoreMetrics = ytdMetricsByStore?.get(store.storeNumber);
                        const storeRow: ReportRow = {
                            id: `store-${store.storeNumber}`, name: `${store.storeNumber} - ${store.storeName}`, level: 5, children: [],
                            metrics: storeMetrics, storeCount: 1, 
                            summedMetrics: { 
                                ...storeMetrics, 
                                target: (storeMetrics.target ?? 0) * storeMetrics.turnover, // totalWeightedTarget
                                deviation: (storeMetrics.target !== null ? storeMetrics.turnover : 0), // totalTurnoverForTarget
                                ytd: ytdStoreMetrics ? {
                                    ...ytdStoreMetrics,
                                    target: (ytdStoreMetrics.target ?? 0) * ytdStoreMetrics.turnover,
                                    deviation: (ytdStoreMetrics.target !== null ? ytdStoreMetrics.turnover : 0)
                                } : undefined,
                            },
                            ytdMetrics: ytdStoreMetrics ? { writeOffsTotalPercent: ytdStoreMetrics.writeOffsTotalPercent, target: ytdStoreMetrics.target, deviation: ytdStoreMetrics.deviation } : undefined
                        };
                        row.children.push(storeRow);
                    }
                }
            } else { // Hierarchy level
                row.children = buildRows(value, level + 1, id);
            }
            
            if (row.children.length > 0) {
                const { metrics, summedMetrics, storeCount, ytdMetrics } = aggregateHierarchyNode(row.children, level);
                row.metrics = metrics;
                row.summedMetrics = summedMetrics;
                row.storeCount = storeCount;
                row.ytdMetrics = ytdMetrics;
                rows.push(row);
            }
        }
        return rows;
    };
    
    const allRow: ReportRow = { id: 'all', name: 'All', level: 0, children: [], metrics: createEmptyMetrics(), storeCount: 0, summedMetrics: createEmptyMetrics() };
    allRow.children = buildRows(hierarchy, 1, 'all');
    const { metrics, storeCount, ytdMetrics } = aggregateHierarchyNode(allRow.children, 0);
    allRow.metrics = metrics;
    allRow.storeCount = storeCount;
    allRow.ytdMetrics = ytdMetrics;

    return allRow;

  }, [isLoading, orgStructure, viewMode, weeklyActuals, ytdActuals, targets, selectedGroup, selectedWeek, sortConfig, rdcList, dooList, reportType]);

  const rankingReportData = useMemo<RankingRow[] | null>(() => {
    if (reportType !== 'ranking' || isLoading || !selectedRdc) return null;

    let actuals = viewMode === 'weekly' ? weeklyActuals : ytdActuals;
    if (viewMode === 'weekly' && selectedWeek) {
        actuals = actuals.filter(a => a.period === selectedWeek);
    }
    const filteredActuals = actuals.filter(a => (selectedGroup === 'all' || `${a.itemGroupNumber} - ${a.itemGroupName}` === selectedGroup));
    
    const getMetric = (storeActuals: WriteOffsActual[], matcher: (name: string) => boolean): number => {
        return storeActuals.reduce((sum, a) => matcher(a.metricName) ? sum + a.value : sum, 0);
    };

    const storesInRdc = orgStructure.filter(s => s.warehouseId === selectedRdc);
    const results: Omit<RankingRow, 'rank'>[] = [];

    for (const store of storesInRdc) {
        const storeActuals = filteredActuals.filter(a => a.storeNumber === store.storeNumber);
        if (storeActuals.length === 0) continue;

        const metrics = createEmptyMetrics();
        metrics.turnover = getMetric(storeActuals, METRIC_NAME_MATCHERS.TURNOVER);
        if (metrics.turnover === 0) continue;

        metrics.writeOffsValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_VALUE);
        metrics.writeOffsTotalValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_TOTAL_VALUE);
        metrics.discountsValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.DISCOUNTS_VALUE);
        metrics.damagesValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.DAMAGES_VALUE);

        metrics.writeOffsPercent = metrics.turnover ? metrics.writeOffsValue / metrics.turnover : 0;
        metrics.writeOffsTotalPercent = metrics.turnover ? metrics.writeOffsTotalValue / metrics.turnover : 0;
        metrics.discountsPercent = metrics.turnover ? metrics.discountsValue / metrics.turnover : 0;
        metrics.damagesPercent = metrics.turnover ? metrics.damagesValue / metrics.turnover : 0;
        
        if (selectedGroup !== 'all') {
            const [groupNumber] = selectedGroup.split(' - ');
            const target = targets.find(t => t.storeNumber === store.storeNumber && t.itemGroupNumber === groupNumber);
            if (target) {
                const targetValue = viewMode === 'weekly' ? target.monthlyTarget : target.yearlyTarget;
                if (targetValue !== undefined) {
                    metrics.target = targetValue;
                    metrics.deviation = targetValue - metrics.writeOffsTotalPercent;
                }
            }
        }
        
        results.push({
            storeNumber: store.storeNumber,
            storeName: store.storeName,
            areaManager: store.areaManager,
            headOfSales: store.headOfSales,
            metrics,
        });
    }

    results.sort((a, b) => (b.metrics.deviation ?? -Infinity) - (a.metrics.deviation ?? -Infinity));
    
    return results.map((item, index) => ({ ...item, rank: index + 1 }));

  }, [reportType, isLoading, selectedRdc, viewMode, weeklyActuals, ytdActuals, selectedWeek, selectedGroup, orgStructure, targets]);

  const handleToggleRow = useCallback((id: string) => {
      setExpandedRows(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  }, []);

  const expandToLevel = (level: number) => {
      if (!reportData) return;
      const newExpanded = new Set<string>();
      const traverse = (row: ReportRow) => {
          if (row.level < level) {
              newExpanded.add(row.id);
              row.children.forEach(traverse);
          }
      };
      traverse(reportData);
      setExpandedRows(newExpanded);
  };
  
  const handleSort = (key: 'turnover' | 'writeOffsTotalPercent') => {
      setSortConfig(prev => {
          const isCurrentKey = prev?.key === key;
          const defaultDirection = key === 'turnover' ? 'desc' : 'asc';
          const newDirection = isCurrentKey ? (prev.direction === 'asc' ? 'desc' : 'asc') : defaultDirection;
          return { key, direction: newDirection };
      });
  };

  const addMaxValuesToHierarchy = (node: ReportRow) => {
      if (node.children.length > 0) {
          const maxValues: ReportRow['maxValuesInScope'] = {
              turnover: 0, writeOffsValue: 0, writeOffsTotalValue: 0, discountsValue: 0, damagesValue: 0,
              writeOffsPercent: 0, writeOffsTotalPercent: 0, discountsPercent: 0, damagesPercent: 0,
          };
          for (const child of node.children) {
              maxValues.turnover = Math.max(maxValues.turnover, Math.abs(child.metrics.turnover));
              maxValues.writeOffsValue = Math.max(maxValues.writeOffsValue, Math.abs(child.metrics.writeOffsValue));
              maxValues.writeOffsTotalValue = Math.max(maxValues.writeOffsTotalValue, Math.abs(child.metrics.writeOffsTotalValue));
              maxValues.discountsValue = Math.max(maxValues.discountsValue, Math.abs(child.metrics.discountsValue));
              maxValues.damagesValue = Math.max(maxValues.damagesValue, Math.abs(child.metrics.damagesValue));
              maxValues.writeOffsPercent = Math.max(maxValues.writeOffsPercent, Math.abs(child.metrics.writeOffsPercent));
              maxValues.writeOffsTotalPercent = Math.max(maxValues.writeOffsTotalPercent, Math.abs(child.metrics.writeOffsTotalPercent));
              maxValues.discountsPercent = Math.max(maxValues.discountsPercent, Math.abs(child.metrics.discountsPercent));
              maxValues.damagesPercent = Math.max(maxValues.damagesPercent, Math.abs(child.metrics.damagesPercent));
          }
          for (const child of node.children) {
              child.maxValuesInScope = maxValues;
              addMaxValuesToHierarchy(child);
          }
      }
  };

  if (reportData) {
      addMaxValuesToHierarchy(reportData);
  }

  if (isLoading) {
      return <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div>;
  }
  
  const getSortIcon = (key: 'turnover' | 'writeOffsTotalPercent') => {
      if (sortConfig?.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const renderContent = () => {
      if (reportType === 'hierarchy') {
          if (!reportData) {
              return <div class={sharedStyles['placeholder-view']}><p>No data available for hierarchy report.</p></div>;
          }
          return (
            <table class={styles['report-table']}>
                <thead>
                    <tr>
                        <th rowSpan={2}>{t('columns.writeOffs.regionManagerStore')}</th>
                        <th rowSpan={2} class={styles.sortable} onClick={() => handleSort('turnover')}>
                            {t('columns.writeOffs.turnover')}
                            <span class={styles['sort-icon']}>{getSortIcon('turnover')}</span>
                        </th>
                        <th rowSpan={2}>{t('columns.writeOffs.writeOffsValue')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.writeOffsPercent')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.discountsValue')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.discountsPercent')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.damagesValue')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.damagesPercent')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.writeOffsTotalValue')}</th>
                        <th rowSpan={2} class={styles.sortable} onClick={() => handleSort('writeOffsTotalPercent')}>
                          {t('columns.writeOffs.writeOffsTotalPercent')}
                          <span class={styles['sort-icon']}>{getSortIcon('writeOffsTotalPercent')}</span>
                        </th>
                        <th rowSpan={2}>{t('columns.writeOffs.targetPercent')}</th>
                        <th rowSpan={2}>{t('columns.writeOffs.deviation')}</th>
                        {viewMode === 'weekly' && <th colSpan={3} class={styles['ytd-separator']}>YTD</th>}
                        <th rowSpan={2}>{t('columns.writeOffs.regionManagerStore')}</th>
                    </tr>
                    {viewMode === 'weekly' && (
                        <tr>
                            <th class={styles['ytd-separator']}>{t('columns.writeOffs.writeOffsTotalPercent')}</th>
                            <th>{t('columns.writeOffs.targetPercent')}</th>
                            <th>{t('columns.writeOffs.deviation')}</th>
                        </tr>
                    )}
                </thead>
                <tbody>
                    <HierarchyRowComponent row={reportData} expandedRows={expandedRows} onToggle={handleToggleRow} viewMode={viewMode}/>
                </tbody>
            </table>
          );
      } else { // ranking
          if (!rankingReportData) {
              return <div class={sharedStyles['placeholder-view']}><p>No data available for ranking report. Please select an RDC.</p></div>;
          }
          return <RankingTable data={rankingReportData} />;
      }
  };


  return (
      <div class={`${styles['write-offs-report-view']} ${styles['printable-area']}`}>
          <div class={styles['controls-container']}>
              <div class={styles['control-group']}>
                  <div class={styles['view-toggle']}>
                      <button class={reportType === 'hierarchy' ? styles.active : ''} onClick={() => setReportType('hierarchy')}>Hierarchy</button>
                      <button class={reportType === 'ranking' ? styles.active : ''} onClick={() => setReportType('ranking')}>Ranking</button>
                  </div>
                  <div class={styles['view-toggle']}>
                      <button class={viewMode === 'weekly' ? styles.active : ''} onClick={() => setViewMode('weekly')}>Weekly</button>
                      <button class={viewMode === 'ytd' ? styles.active : ''} onClick={() => setViewMode('ytd')}>YTD</button>
                  </div>
                  {viewMode === 'weekly' && availableWeeks.length > 0 && (
                      <>
                          <label for="week-select">{t('writeOffsReport.chooseWeek')}:</label>
                          <select id="week-select" value={selectedWeek} onChange={e => setSelectedWeek((e.target as HTMLSelectElement).value)}>
                              {availableWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                          </select>
                      </>
                  )}
                  {reportType === 'ranking' && (
                     <div class={styles['control-group']}>
                        <label for="rdc-select">RDC:</label>
                        <select id="rdc-select" value={selectedRdc} onChange={e => setSelectedRdc((e.target as HTMLSelectElement).value)}>
                            {rdcList.map(rdc => <option key={rdc.id} value={rdc.id}>{rdc.id} - {rdc.name}</option>)}
                        </select>
                     </div>
                  )}
                  <label for="group-select">Item Group:</label>
                  <select id="group-select" value={selectedGroup} onChange={e => setSelectedGroup((e.target as HTMLSelectElement).value)}>
                      <option value="all">All Groups</option>
                      {availableGroups.map(group => <option key={group} value={group}>{group}</option>)}
                  </select>
                  <button class={sharedStyles['button-secondary']} onClick={() => window.print()}>{t('writeOffsReport.printReport')}</button>
              </div>
               {reportType === 'hierarchy' && (
                  <div class={styles['actions-bar']}>
                      <button onClick={() => expandToLevel(1)}>{t('writeOffsReport.expandToDoO')}</button>
                      <button onClick={() => expandToLevel(2)}>{t('writeOffsReport.expandToRdc')}</button>
                      <button onClick={() => expandToLevel(3)}>{t('writeOffsReport.expandToHos')}</button>
                      <button onClick={() => expandToLevel(4)}>{t('writeOffsReport.expandToAm')}</button>
                      <button onClick={() => setExpandedRows(new Set())}>{t('writeOffsReport.collapseAll')}</button>
                  </div>
               )}
          </div>
          <div class={sharedStyles['table-container']}>
             {renderContent()}
          </div>
      </div>
  );
};
