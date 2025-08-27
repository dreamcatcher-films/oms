import { useState, useEffect, useMemo } from 'preact/hooks';
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
                    barClass={styles['turnover-bar']}
                />
                <DataBarCell
                    value={row.metrics.writeOffsValue}
                    maxValue={row.maxValuesInScope?.writeOffsValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['writeoff-bar']}
                />
                <td>{formatPercent(row.metrics.writeOffsPercent)}</td>
                <DataBarCell
                    value={row.metrics.writeOffsTotalValue}
                    maxValue={row.maxValuesInScope?.writeOffsTotalValue ?? 0}
                    formatter={formatValue}
                    barClass={styles['writeoff-bar']}
                />
                <td>{formatPercent(row.metrics.writeOffsTotalPercent)}</td>
                <td>{formatValue(row.metrics.discountsValue)}</td>
                <td>{formatPercent(row.metrics.discountsPercent)}</td>
                <td>{formatValue(row.metrics.damagesValue)}</td>
                <td>{formatPercent(row.metrics.damagesPercent)}</td>
                <td>{row.metrics.target !== null ? formatPercent(row.metrics.target) : '-'}</td>
                <td class={deviationClass}>
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
    
    const calculateMetricsForRows = (rows: ReportRow[]): WriteOffsMetrics => {
        const aggregated = createEmptyMetrics();
        let totalWeightedPercent = 0;
        let totalWeightedTotalPercent = 0;
        let totalWeightedTarget = 0;
        let totalTurnoverForTarget = 0;

        for (const row of rows) {
            aggregated.turnover += row.metrics.turnover;
            aggregated.writeOffsValue += row.metrics.writeOffsValue;
            aggregated.writeOffsTotalValue += row.metrics.writeOffsTotalValue;
            aggregated.discountsValue += row.metrics.discountsValue;
            aggregated.damagesValue += row.metrics.damagesValue;
            if (row.metrics.turnover > 0) {
                totalWeightedPercent += row.metrics.writeOffsPercent * row.metrics.turnover;
                totalWeightedTotalPercent += row.metrics.writeOffsTotalPercent * row.metrics.turnover;
                if (row.metrics.target !== null) {
                    totalWeightedTarget += row.metrics.target * row.metrics.turnover;
                    totalTurnoverForTarget += row.metrics.turnover;
                }
            }
        }
        
        aggregated.writeOffsPercent = aggregated.turnover > 0 ? totalWeightedPercent / aggregated.turnover : 0;
        aggregated.writeOffsTotalPercent = aggregated.turnover > 0 ? totalWeightedTotalPercent / aggregated.turnover : 0;
        aggregated.discountsPercent = aggregated.turnover > 0 ? aggregated.discountsValue / aggregated.turnover : 0;
        aggregated.damagesPercent = aggregated.turnover > 0 ? aggregated.damagesValue / aggregated.turnover : 0;
        
        aggregated.target = totalTurnoverForTarget > 0 ? totalWeightedTarget / totalTurnoverForTarget : null;

        if (aggregated.target !== null) {
            aggregated.deviation = aggregated.writeOffsPercent - aggregated.target;
        }

        return aggregated;
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

    const allRegionsRow: ReportRow = { id: 'all-regions', name: 'All Regions', level: 0, metrics: createEmptyMetrics(), children: [] };
    const sortedRdcs = Array.from(rdcHierarchy.keys()).sort();

    for (const rdcId of sortedRdcs) {
        const { hoss } = rdcHierarchy.get(rdcId)!;
        const rdcRow: ReportRow = { id: `rdc-${rdcId}`, name: `Region ${rdcId}`, level: 1, metrics: createEmptyMetrics(), children: [] };

        const sortedHoss = Array.from(hoss.keys()).sort();
        for (const hosName of sortedHoss) {
            const { ams } = hoss.get(hosName)!;
            const hosRow: ReportRow = { id: `${rdcId}-${hosName}`, name: hosName, level: 2, metrics: createEmptyMetrics(), children: [] };
            
            const sortedAms = Array.from(ams.keys()).sort();
            for (const amName of sortedAms) {
                const stores = ams.get(amName)!;
                const amRow: ReportRow = { id: `${rdcId}-${hosName}-${amName}`, name: amName, level: 3, metrics: createEmptyMetrics(), children: [] };
                
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
                        storeMetrics.deviation = storeMetrics.writeOffsPercent - targetValue;
                    }
                    
                    amRow.children.push({ id: store.storeNumber, name: `${store.storeNumber} - ${store.storeName}`, level: 4, metrics: storeMetrics, children: [] });
                }
                if (amRow.children.length > 0) {
                     amRow.children.sort((a,b) => (a.metrics.deviation ?? Infinity) - (b.metrics.deviation ?? Infinity));
                     amRow.metrics = calculateMetricsForRows(amRow.children);
                     hosRow.children.push(amRow);
                }
            }
            if (hosRow.children.length > 0) {
                hosRow.children.sort((a,b) => (a.metrics.deviation ?? Infinity) - (b.metrics.deviation ?? Infinity));
                hosRow.metrics = calculateMetricsForRows(hosRow.children);
                rdcRow.children.push(hosRow);
            }
        }
        if (rdcRow.children.length > 0) {
            rdcRow.metrics = calculateMetricsForRows(rdcRow.children);
            allRegionsRow.children.push(rdcRow);
        }
    }
    
    allRegionsRow.metrics = calculateMetricsForRows(allRegionsRow.children);

    const addMaxValuesToHierarchy = (node: ReportRow) => {
        if (!node.children || node.children.length === 0) return;

        const maxTurnover = Math.max(...node.children.map(c => Math.abs(c.metrics.turnover)));
        const maxWriteOffsValue = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsValue)));
        const maxWriteOffsTotalValue = Math.max(...node.children.map(c => Math.abs(c.metrics.writeOffsTotalValue)));

        node.children.forEach(child => {
            child.maxValuesInScope = {
                turnover: maxTurnover,
                writeOffsValue: maxWriteOffsValue,
                writeOffsTotalValue: maxWriteOffsTotalValue,
            };
            addMaxValuesToHierarchy(child);
        });
    };

    addMaxValuesToHierarchy(allRegionsRow);
    
    return allRegionsRow;
    
  }, [isLoading, orgStructure, weeklyActuals, ytdActuals, targets, viewMode, selectedGroup, selectedWeek, t]);
  
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
        <div class={sharedStyles['table-container']}>
            <table class={styles['report-table']}>
                <thead>
                    <tr>
                        <th class={styles['indent-cell']}>{t('columns.writeOffs.regionManagerStore')}</th>
                        <th>{t('columns.writeOffs.turnover')}</th>
                        <th>{t('columns.writeOffs.writeOffsValue')}</th>
                        <th>{t('columns.writeOffs.writeOffsPercent')}</th>
                        <th>{t('columns.writeOffs.writeOffsTotalValue')}</th>
                        <th>{t('columns.writeOffs.writeOffsTotalPercent')}</th>
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
