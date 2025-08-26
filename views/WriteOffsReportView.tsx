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

// Constants to map metric IDs from CSV to meaningful keys
const METRIC_MAPPING = {
    TURNOVER: 'R1104.005',
    WRITE_OFFS_VALUE: '1104501.002',
    WRITE_OFFS_PERCENT: '1104501.003',
    DISCOUNTS_VALUE: '1104012.002',
    DISCOUNTS_PERCENT: '1104012.003',
    DAMAGES_VALUE: '1104015.002',
    DAMAGES_PERCENT: '1104015.003',
};

const createEmptyMetrics = (): WriteOffsMetrics => ({
    turnover: 0,
    writeOffsValue: 0,
    writeOffsPercent: 0,
    discountsValue: 0,
    discountsPercent: 0,
    damagesValue: 0,
    damagesPercent: 0,
    target: null,
    deviation: null,
});

const ReportRowComponent = ({ row, expandedRows, onToggle, level }: { row: ReportRow, expandedRows: Set<string>, onToggle: (id: string) => void, level: number }) => {
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = row.children.length > 0;
    const { t } = useTranslation();

    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
    const formatValue = (value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const deviationClass = row.metrics.deviation === null ? '' :
        row.metrics.deviation > 0 ? styles['deviation-positive'] : styles['deviation-negative'];
    
    return (
        <>
            <tr class={`${styles[`row-level-${level}`]} ${hasChildren ? styles.clickable : ''}`} onClick={() => hasChildren && onToggle(row.id)}>
                <td class={styles['indent-cell']} style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}>
                    {hasChildren && <span class={`${styles['toggle-icon']} ${isExpanded ? styles.expanded : ''}`}>▶</span>}
                    {row.name}
                </td>
                <td>{formatValue(row.metrics.turnover)}</td>
                <td>{formatValue(row.metrics.writeOffsValue)}</td>
                <td>{formatPercent(row.metrics.writeOffsPercent)}</td>
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
                <ReportRowComponent key={child.id} row={child} expandedRows={expandedRows} onToggle={onToggle} level={level + 1} />
            ))}
        </>
    );
};

export const WriteOffsReportView = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  
  // Raw data from DB
  const [weeklyActuals, setWeeklyActuals] = useState<WriteOffsActual[]>([]);
  const [ytdActuals, setYtdActuals] = useState<WriteOffsActual[]>([]);
  const [targets, setTargets] = useState<WriteOffsTarget[]>([]);
  const [orgStructure, setOrgStructure] = useState<OrgStructureRow[]>([]);

  // UI State
  const [viewMode, setViewMode] = useState<'weekly' | 'ytd'>('weekly');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  
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

    const actuals = viewMode === 'weekly' ? weeklyActuals : ytdActuals;
    const periodIdentifier = viewMode === 'weekly' ? 'Wk' : 'FY';
    
    const filteredActuals = actuals.filter(a => 
        a.period.includes(periodIdentifier) &&
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
    
    const getMetric = (storeActuals: WriteOffsActual[], metricId: string): number => {
        return storeActuals.find(a => a.metricId.includes(metricId))?.value || 0;
    };

    const hierarchy = new Map<string, { ams: Map<string, OrgStructureRow[]> }>();
    for (const store of orgStructure) {
        if (!hierarchy.has(store.headOfSales)) {
            hierarchy.set(store.headOfSales, { ams: new Map() });
        }
        const hos = hierarchy.get(store.headOfSales)!;
        if (!hos.ams.has(store.areaManager)) {
            hos.ams.set(store.areaManager, []);
        }
        hos.ams.get(store.areaManager)!.push(store);
    }

    const calculateMetricsForRows = (rows: ReportRow[]): WriteOffsMetrics => {
        const aggregated = createEmptyMetrics();
        let totalWeightedPercent = 0;

        for (const row of rows) {
            aggregated.turnover += row.metrics.turnover;
            aggregated.writeOffsValue += row.metrics.writeOffsValue;
            aggregated.discountsValue += row.metrics.discountsValue;
            aggregated.damagesValue += row.metrics.damagesValue;
            if(row.metrics.turnover > 0){
                totalWeightedPercent += row.metrics.writeOffsPercent * row.metrics.turnover;
            }
        }
        
        aggregated.writeOffsPercent = aggregated.turnover > 0 ? totalWeightedPercent / aggregated.turnover : 0;
        aggregated.discountsPercent = aggregated.turnover > 0 ? aggregated.discountsValue / aggregated.turnover : 0;
        aggregated.damagesPercent = aggregated.turnover > 0 ? aggregated.damagesValue / aggregated.turnover : 0;
        
        // Target and deviation are averaged for higher levels, could be improved if needed
        const validDeviations = rows.map(r => r.metrics.deviation).filter((d): d is number => d !== null);
        if(validDeviations.length > 0){
             aggregated.deviation = validDeviations.reduce((a, b) => a + b, 0) / validDeviations.length;
        }

        return aggregated;
    };
    
    const root: ReportRow = { id: 'rdc', name: 'RDC Total', level: 0, metrics: createEmptyMetrics(), children: [] };
    
    for (const [hosName, { ams }] of hierarchy.entries()) {
        const hosRow: ReportRow = { id: hosName, name: hosName, level: 1, metrics: createEmptyMetrics(), children: [] };
        
        for (const [amName, stores] of ams.entries()) {
            const amRow: ReportRow = { id: `${hosName}-${amName}`, name: amName, level: 2, metrics: createEmptyMetrics(), children: [] };
            
            for (const store of stores) {
                const storeActuals = actualsByStore.get(store.storeNumber) || [];
                const storeMetrics = createEmptyMetrics();
                
                storeMetrics.turnover = getMetric(storeActuals, METRIC_MAPPING.TURNOVER);
                storeMetrics.writeOffsValue = getMetric(storeActuals, METRIC_MAPPING.WRITE_OFFS_VALUE);
                storeMetrics.discountsValue = getMetric(storeActuals, METRIC_MAPPING.DISCOUNTS_VALUE);
                storeMetrics.damagesValue = getMetric(storeActuals, METRIC_MAPPING.DAMAGES_VALUE);

                storeMetrics.writeOffsPercent = getMetric(storeActuals, METRIC_MAPPING.WRITE_OFFS_PERCENT);
                storeMetrics.discountsPercent = getMetric(storeActuals, METRIC_MAPPING.DISCOUNTS_PERCENT);
                storeMetrics.damagesPercent = getMetric(storeActuals, METRIC_MAPPING.DAMAGES_PERCENT);
                
                // For simplicity, we assume one target per store if "all groups" is selected.
                // This could be refined to handle multiple group targets.
                const targetKey = selectedGroup === 'all' 
                    ? targets.find(t => t.storeNumber === store.storeNumber)?.id 
                    : `${store.storeNumber}-${selectedGroup.split(' - ')[0]}`;

                const targetData = targetsByStoreAndGroup.get(targetKey || '');
                const targetValue = viewMode === 'weekly' ? targetData?.monthlyTarget : targetData?.yearlyTarget;

                if (targetValue !== undefined) {
                    storeMetrics.target = targetValue;
                    storeMetrics.deviation = storeMetrics.writeOffsPercent - targetValue;
                }
                
                amRow.children.push({ id: store.storeNumber, name: `${store.storeNumber} - ${store.storeName}`, level: 3, metrics: storeMetrics, children: [] });
            }
            if(amRow.children.length > 0) {
                 amRow.children.sort((a,b) => (b.metrics.deviation ?? -Infinity) - (a.metrics.deviation ?? -Infinity));
                 amRow.metrics = calculateMetricsForRows(amRow.children);
                 hosRow.children.push(amRow);
            }
        }
        if(hosRow.children.length > 0) {
            hosRow.children.sort((a,b) => (b.metrics.deviation ?? -Infinity) - (a.metrics.deviation ?? -Infinity));
            hosRow.metrics = calculateMetricsForRows(hosRow.children);
            root.children.push(hosRow);
        }
    }
    
    root.metrics = calculateMetricsForRows(root.children);
    
    return root;
    
  }, [isLoading, orgStructure, weeklyActuals, ytdActuals, targets, viewMode, selectedGroup]);
  
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
                        <th class={styles['indent-cell']}>Region / Manager / Store</th>
                        <th>Turnover</th>
                        <th>Write-offs Value</th>
                        <th>Write-offs %</th>
                        <th>Discounts Value</th>
                        <th>Discounts %</th>
                        <th>Damages Value</th>
                        <th>Damages %</th>
                        <th>Target %</th>
                        <th>Deviation p.p.</th>
                    </tr>
                </thead>
                <tbody>
                    <ReportRowComponent row={reportData} expandedRows={expandedRows} onToggle={handleToggleRow} level={0} />
                </tbody>
            </table>
        </div>
    </div>
  );
};
