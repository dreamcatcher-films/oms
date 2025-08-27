import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { 
    WriteOffsActual, WriteOffsTarget, OrgStructureRow, 
    ReportRow, WriteOffsMetrics 
} from '../utils/types';
import { 
    getAllWriteOffsWeekly, getAllWriteOffsYTD, 
    getAllWriteOffsTargets, getAllOrgStructureData
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

const ReportRowComponent = ({ row, expandedRows, onToggle }: { row: ReportRow, expandedRows: Set<string>, onToggle: (id: string) => void }) => {
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = row.children.length > 0;
    
    const deviationClass = row.metrics.deviation === null ? '' :
        row.metrics.deviation > 0 ? styles['deviation-positive'] : styles['deviation-negative'];
    
    const rowClass = styles[`row-level-${row.level}`];

    return (
        <>
            <tr class={`${rowClass} ${hasChildren ? styles.clickable : ''}`} onClick={() => hasChildren && onToggle(row.id)}>
                <td class={styles['indent-cell']} style={{ paddingLeft: `${row.level * 1.5 + 0.5}rem` }}>
                    {hasChildren && <span class={`${styles['toggle-icon']} ${isExpanded ? styles.expanded : ''}`}>▶</span>}
                    {row.name}
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
                <td style={{textAlign: 'center'}}>{row.metrics.target !== null ? formatPercent(row.metrics.target) : '-'}</td>
                <td class={deviationClass} style={{textAlign: 'center'}}>
                    {row.metrics.deviation !== null ? `${(row.metrics.deviation * 100).toFixed(2)} p.p.` : '-'}
                </td>
            </tr>
            {isExpanded && row.children.map(child => (
                <ReportRowComponent key={child.id} row={child} expandedRows={expandedRows} onToggle={onToggle} />
            ))}
        </>
    );
};

export const WriteOffsReportView = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  
  const [weeklyActuals, setWeeklyActuals] = useState<WriteOffsActual[]>([]);
  const [ytdActuals, setYtdActuals] = useState<WriteOffsActual[]>([]);
  const [targets, setTargets] = useState<WriteOffsTarget[]>([]);
  const [orgStructure, setOrgStructure] = useState<OrgStructureRow[]>([]);

  const [viewMode, setViewMode] = useState<'weekly' | 'ytd'>('weekly');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [weekly, ytd, targetsData, org] = await Promise.all([
                getAllWriteOffsWeekly(),
                getAllWriteOffsYTD(),
                getAllWriteOffsTargets(),
                getAllOrgStructureData(),
            ]);
            setWeeklyActuals(weekly);
            setYtdActuals(ytd);
            setTargets(targetsData);
            setOrgStructure(org);
            
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
    if (isLoading || orgStructure.length === 0) return null;

    let actuals = viewMode === 'weekly' ? weeklyActuals : ytdActuals;

    if (viewMode === 'weekly' && selectedWeek) {
        actuals = actuals.filter(a => a.period === selectedWeek);
    }
    
    const filteredActuals = actuals.filter(a => 
        (selectedGroup === 'all' || `${a.itemGroupNumber} - ${a.itemGroupName}` === selectedGroup)
    );
    
    const actualsByStore = new Map<string, WriteOffsActual[]>();
    for (const actual of filteredActuals) {
        if (!actualsByStore.has(actual.storeNumber)) {
            actualsByStore.set(actual.storeNumber, []);
        }
        actualsByStore.get(actual.storeNumber)!.push(actual);
    }
    
    const targetsByStoreAndGroup = new Map<string, WriteOffsTarget>();
    for (const target of targets) {
        targetsByStoreAndGroup.set(`${target.storeNumber}-${target.itemGroupNumber}`, target);
    }
    
    const getMetric = (storeActuals: WriteOffsActual[], matcher: (name: string) => boolean): number => {
        return storeActuals.find(a => matcher(a.metricName))?.value || 0;
    };
    
    const aggregateHierarchyNode = (rows: ReportRow[], level: number): { metrics: WriteOffsMetrics, summedMetrics: WriteOffsMetrics, storeCount: number } => {
        const summedMetrics = createEmptyMetrics();
        let totalWeightedPercent = 0;
        let totalWeightedTotalPercent = 0;
        let totalWeightedTarget = 0;
        let totalTurnoverForTarget = 0;
        let storeCount = 0;

        for (const row of rows) {
            summedMetrics.turnover += row.summedMetrics.turnover;
            summedMetrics.writeOffsValue += row.summedMetrics.writeOffsValue;
            summedMetrics.writeOffsTotalValue += row.summedMetrics.writeOffsTotalValue;
            summedMetrics.discountsValue += row.summedMetrics.discountsValue;
            summedMetrics.damagesValue += row.summedMetrics.damagesValue;
            storeCount += row.storeCount;
            if (row.summedMetrics.turnover > 0) {
                totalWeightedPercent += row.metrics.writeOffsPercent * row.summedMetrics.turnover;
                totalWeightedTotalPercent += row.metrics.writeOffsTotalPercent * row.summedMetrics.turnover;
                if (row.metrics.target !== null) {
                    totalWeightedTarget += row.metrics.target * row.summedMetrics.turnover;
                    totalTurnoverForTarget += row.summedMetrics.turnover;
                }
            }
        }
        
        const finalMetrics = { ...summedMetrics };
        
        if ((level === 2 || level === 3) && storeCount > 0) { // HoS or AM
            finalMetrics.turnover /= storeCount;
            finalMetrics.writeOffsValue /= storeCount;
            finalMetrics.writeOffsTotalValue /= storeCount;
            finalMetrics.discountsValue /= storeCount;
            finalMetrics.damagesValue /= storeCount;
        }

        finalMetrics.writeOffsPercent = summedMetrics.turnover > 0 ? totalWeightedPercent / summedMetrics.turnover : 0;
        finalMetrics.writeOffsTotalPercent = summedMetrics.turnover > 0 ? totalWeightedTotalPercent / summedMetrics.turnover : 0;
        finalMetrics.discountsPercent = summedMetrics.turnover > 0 ? summedMetrics.discountsValue / summedMetrics.turnover : 0;
        finalMetrics.damagesPercent = summedMetrics.turnover > 0 ? summedMetrics.damagesValue / summedMetrics.turnover : 0;
        
        finalMetrics.target = totalTurnoverForTarget > 0 ? totalWeightedTarget / totalTurnoverForTarget : null;

        if (finalMetrics.target !== null) {
            finalMetrics.deviation = finalMetrics.writeOffsTotalPercent - finalMetrics.target;
        }

        return { metrics: finalMetrics, summedMetrics, storeCount };
    };
    
    const rdcHierarchy = new Map<string, { hoss: Map<string, { ams: Map<string, OrgStructureRow[]> }> }>();
    for (const store of orgStructure) {
        if (!rdcHierarchy.has(store.warehouseId)) rdcHierarchy.set(store.warehouseId, { hoss: new Map() });
        const rdc = rdcHierarchy.get(store.warehouseId)!;
        if (!rdc.hoss.has(store.headOfSales)) rdc.hoss.set(store.headOfSales, { ams: new Map() });
        const hos = rdc.hoss.get(store.headOfSales)!;
        if (!hos.ams.has(store.areaManager)) hos.ams.set(store.areaManager, []);
        hos.ams.get(store.areaManager)!.push(store);
    }

    const allRegionsRow: ReportRow = { id: 'all-regions', name: 'All Regions', level: 0, metrics: createEmptyMetrics(), children: [], storeCount: 0, summedMetrics: createEmptyMetrics() };
    const sortedRdcs = Array.from(rdcHierarchy.keys()).sort();

    for (const rdcId of sortedRdcs) {
        const { hoss } = rdcHierarchy.get(rdcId)!;
        const rdcRow: ReportRow = { id: `rdc-${rdcId}`, name: `Region ${rdcId}`, level: 1, metrics: createEmptyMetrics(), children: [], storeCount: 0, summedMetrics: createEmptyMetrics() };

        const sortedHoss = Array.from(hoss.keys()).sort();
        for (const hosName of sortedHoss) {
            const { ams } = hoss.get(hosName)!;
            const hosRow: ReportRow = { id: `${rdcId}-${hosName}`, name: hosName, level: 2, metrics: createEmptyMetrics(), children: [], storeCount: 0, summedMetrics: createEmptyMetrics() };
            
            const sortedAms = Array.from(ams.keys()).sort();
            for (const amName of sortedAms) {
                const stores = ams.get(amName)!;
                const amRow: ReportRow = { id: `${rdcId}-${hosName}-${amName}`, name: amName, level: 3, metrics: createEmptyMetrics(), children: [], storeCount: 0, summedMetrics: createEmptyMetrics() };
                
                for (const store of stores) {
                    const storeActuals = actualsByStore.get(store.storeNumber) || [];
                    if (storeActuals.length === 0) continue;

                    const storeMetrics = createEmptyMetrics();
                    storeMetrics.turnover = getMetric(storeActuals, METRIC_NAME_MATCHERS.TURNOVER);
                    storeMetrics.writeOffsValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_VALUE);
                    storeMetrics.writeOffsPercent = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_PERCENT);
                    storeMetrics.writeOffsTotalValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_TOTAL_VALUE);
                    storeMetrics.writeOffsTotalPercent = getMetric(storeActuals, METRIC_NAME_MATCHERS.WRITE_OFFS_TOTAL_PERCENT);
                    storeMetrics.discountsValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.DISCOUNTS_VALUE);
                    storeMetrics.discountsPercent = getMetric(storeActuals, METRIC_NAME_MATCHERS.DISCOUNTS_PERCENT);
                    storeMetrics.damagesValue = getMetric(storeActuals, METRIC_NAME_MATCHERS.DAMAGES_VALUE);
                    storeMetrics.damagesPercent = getMetric(storeActuals, METRIC_NAME_MATCHERS.DAMAGES_PERCENT);
                    
                    const targetKey = selectedGroup === 'all' 
                        ? targets.find(t => t.storeNumber === store.storeNumber)?.id 
                        : `${store.storeNumber}-${selectedGroup.split(' - ')[0]}`;
                    const targetData = targetsByStoreAndGroup.get(targetKey || '');
                    const targetValue = viewMode === 'weekly' ? targetData?.monthlyTarget : targetData?.yearlyTarget;

                    if (targetValue !== undefined) {
                        storeMetrics.target = targetValue;
                        storeMetrics.deviation = storeMetrics.writeOffsTotalPercent - targetValue;
                    }
                    
                    amRow.children.push({ id: store.storeNumber, name: `${store.storeNumber} - ${store.storeName}`, level: 4, metrics: storeMetrics, children: [], storeCount: 1, summedMetrics: storeMetrics });
                }
                if (amRow.children.length > 0) {
                     const aggregated = aggregateHierarchyNode(amRow.children, amRow.level);
                     amRow.metrics = aggregated.metrics;
                     amRow.summedMetrics = aggregated.summedMetrics;
                     amRow.storeCount = aggregated.storeCount;
                     hosRow.children.push(amRow);
                }
            }
            if (hosRow.children.length > 0) {
                const aggregated = aggregateHierarchyNode(hosRow.children, hosRow.level);
                hosRow.metrics = aggregated.metrics;
                hosRow.summedMetrics = aggregated.summedMetrics;
                hosRow.storeCount = aggregated.storeCount;
                rdcRow.children.push(hosRow);
            }
        }
        if (rdcRow.children.length > 0) {
            const aggregated = aggregateHierarchyNode(rdcRow.children, rdcRow.level);
            rdcRow.metrics = aggregated.metrics;
            rdcRow.summedMetrics = aggregated.summedMetrics;
            rdcRow.storeCount = aggregated.storeCount;
            allRegionsRow.children.push(rdcRow);
        }
    }
    
    const aggregated = aggregateHierarchyNode(allRegionsRow.children, allRegionsRow.level);
    allRegionsRow.metrics = aggregated.metrics;
    allRegionsRow.summedMetrics = aggregated.summedMetrics;
    allRegionsRow.storeCount = aggregated.storeCount;

    const sortHierarchy = (node: ReportRow, config: SortConfig) => {
        if (node.children && node.children.length > 0) {
            if (node.level === 1 || node.level === 2) { // Sort AMs within HoS, and HoS within RDC
                node.children.sort((a, b) => {
                    const valA = a.metrics[config.key] ?? (config.direction === 'asc' ? Infinity : -Infinity);
                    const valB = b.metrics[config.key] ?? (config.direction === 'asc' ? Infinity : -Infinity);
                    return config.direction === 'asc' ? valA - valB : valB - valA;
                });
            }
            node.children.forEach(child => sortHierarchy(child, config));
        }
    };
    
    if (sortConfig) {
        sortHierarchy(allRegionsRow, sortConfig);
    }

    const addMaxValuesToHierarchy = (node: ReportRow) => {
        if (!node.children || node.children.length === 0) return;

        const maxTurnover = Math.max(...node.children.map(c => Math.abs(c.metrics.turnover)));
        const maxWriteOffsValue = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsValue)));
        const maxWriteOffsTotalValue = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsTotalValue)));
        const maxDiscountsValue = Math.max(...node.children.map(c => Math.abs(c.metrics.discountsValue)));
        const maxDamagesValue = Math.max(...node.children.map(c => Math.abs(c.metrics.damagesValue)));
        const maxWriteOffsPercent = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsPercent)));
        const maxWriteOffsTotalPercent = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsTotalPercent)));
        const maxDiscountsPercent = Math.max(...node.children.map(c => Math.abs(c.metrics.discountsPercent)));
        const maxDamagesPercent = Math.max(...node.children.map(c => Math.abs(c.metrics.damagesPercent)));

        node.children.forEach(child => {
            child.maxValuesInScope = {
                turnover: maxTurnover,
                writeOffsValue: maxWriteOffsValue,
                writeOffsTotalValue: maxWriteOffsTotalValue,
                discountsValue: maxDiscountsValue,
                damagesValue: maxDamagesValue,
                writeOffsPercent: maxWriteOffsPercent,
                writeOffsTotalPercent: maxWriteOffsTotalPercent,
                discountsPercent: maxDiscountsPercent,
                damagesPercent: maxDamagesPercent,
            };
            addMaxValuesToHierarchy(child);
        });
    };

    addMaxValuesToHierarchy(allRegionsRow);
    
    return allRegionsRow;
    
  }, [isLoading, orgStructure, weeklyActuals, ytdActuals, targets, viewMode, selectedGroup, selectedWeek, t, sortConfig]);
  
  const handleToggleRow = (id: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };
  
  const handleSort = (key: SortConfig['key']) => {
    const isCurrentKey = sortConfig?.key === key;
    let newDirection: 'asc' | 'desc';
    if(key === 'turnover') {
        newDirection = isCurrentKey && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    } else { // writeOffsTotalPercent
        newDirection = isCurrentKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction: newDirection });
  };
  
  const getSortIcon = (key: SortConfig['key']) => {
      if (sortConfig?.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  
  const expandToLevel = useCallback((level: number) => {
    if (!reportData) return;
    const newExpandedRows = new Set<string>();
    const traverse = (node: ReportRow) => {
        if (node.level < level) {
            newExpandedRows.add(node.id);
            node.children.forEach(traverse);
        }
    };
    traverse(reportData);
    setExpandedRows(newExpandedRows);
  }, [reportData]);

  if (isLoading) {
    return <div class={sharedStyles.spinner}></div>;
  }
  
  if (!reportData) {
      return (
         <div class={sharedStyles['placeholder-view']}>
            <h3>{t('sidebar.writeOffsReport')}</h3>
            <p>No data available to generate the report. Please import the required files.</p>
        </div>
      );
  }

  return (
    <div class={styles['write-offs-report-view']}>
        <div class={styles['controls-container']}>
            <div class={styles['control-group']}>
                <div class={styles['view-toggle']}>
                    <button onClick={() => setViewMode('weekly')} class={viewMode === 'weekly' ? styles.active : ''}>Weekly</button>
                    <button onClick={() => setViewMode('ytd')} class={viewMode === 'ytd' ? styles.active : ''}>YTD</button>
                </div>
                 {viewMode === 'weekly' && availableWeeks.length > 1 && (
                    <div class={styles['control-group']}>
                        <label for="week-select">{t('writeOffsReport.chooseWeek')}</label>
                        <select id="week-select" value={selectedWeek} onChange={e => setSelectedWeek((e.target as HTMLSelectElement).value)}>
                            {availableWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                        </select>
                    </div>
                )}
                <div class={styles['control-group']}>
                    <label for="group-select">Item Group</label>
                    <select id="group-select" value={selectedGroup} onChange={e => setSelectedGroup((e.target as HTMLSelectElement).value)}>
                        <option value="all">All Groups</option>
                        {availableGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
            </div>
            <div class={styles['control-group']}>
                <div class={styles['actions-bar']}>
                    <button onClick={() => expandToLevel(2)}>{t('writeOffsReport.expandToHos')}</button>
                    <button onClick={() => expandToLevel(3)}>{t('writeOffsReport.expandToAm')}</button>
                    <button onClick={() => setExpandedRows(new Set())}>{t('writeOffsReport.collapseAll')}</button>
                </div>
            </div>
        </div>
        <div class={sharedStyles['table-container']}>
            <table class={styles['report-table']}>
                <thead>
                    <tr>
                        <th class={styles['indent-cell']}>{t('columns.writeOffs.regionManagerStore')}</th>
                        <th class={styles.sortable} onClick={() => handleSort('turnover')}>
                            {t('columns.writeOffs.turnover')}
                            <span class={styles['sort-icon']}>{getSortIcon('turnover')}</span>
                        </th>
                        <th>{t('columns.writeOffs.writeOffsValue')}</th>
                        <th>{t('columns.writeOffs.writeOffsPercent')}</th>
                        <th>{t('columns.writeOffs.writeOffsTotalValue')}</th>
                        <th class={styles.sortable} onClick={() => handleSort('writeOffsTotalPercent')}>
                            {t('columns.writeOffs.writeOffsTotalPercent')}
                             <span class={styles['sort-icon']}>{getSortIcon('writeOffsTotalPercent')}</span>
                        </th>
                        <th>{t('columns.writeOffs.discountsValue')}</th>
                        <th>{t('columns.writeOffs.discountsPercent')}</th>
                        <th>{t('columns.writeOffs.damagesValue')}</th>
                        <th>{t('columns.writeOffs.damagesPercent')}</th>
                        <th>{t('columns.writeOffs.targetPercent')}</th>
                        <th>{t('columns.writeOffs.deviation')}</th>
                    </tr>
                </thead>
                <tbody>
                    <ReportRowComponent row={reportData} expandedRows={expandedRows} onToggle={handleToggleRow} />
                </tbody>
            </table>
        </div>
    </div>
  );
};
