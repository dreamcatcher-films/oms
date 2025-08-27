import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { 
    WriteOffsActual, WriteOffsTarget, OrgStructureRow, 
    ReportRow, WriteOffsMetrics, RDC
} from '../utils/types';
import { 
    getAllWriteOffsWeekly, getAllWriteOffsYTD, 
    getAllWriteOffsTargets, getAllOrgStructureData,
    loadRdcList
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
                    {row.level < 4 && <span class={styles.storeCount}>( {row.storeCount} )</span>}
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
  const [rdcList, setRdcList] = useState<RDC[]>([]);

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
            const [weekly, ytd, targetsData, org, rdcs] = await Promise.all([
                getAllWriteOffsWeekly(),
                getAllWriteOffsYTD(),
                getAllWriteOffsTargets(),
                getAllOrgStructureData(),
                loadRdcList(),
            ]);
            setWeeklyActuals(weekly);
            setYtdActuals(ytd);
            setTargets(targetsData);
            setOrgStructure(org);
            setRdcList(rdcs);
            
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

    const rdcNameMap = new Map(rdcList.map(rdc => [rdc.id, rdc.name]));
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
        const rdcName = rdcNameMap.get(rdcId) || rdcId;
        const rdcRow: ReportRow = { id: `rdc-${rdcId}`, name: `${rdcName} - ${rdcId}`, level: 1, metrics: createEmptyMetrics(), children: [], storeCount: 0, summedMetrics: createEmptyMetrics() };

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

                    // Find target for this store
                    if (selectedGroup !== 'all') {
                        const [groupNumber] = selectedGroup.split(' - ');
                        const target = targetsByStoreAndGroup.get(`${store.storeNumber}-${groupNumber}`);
                        if (target) {
                            const targetValue = viewMode === 'weekly' ? target.monthlyTarget : target.yearlyTarget;
                            if (targetValue !== undefined) {
                                storeMetrics.target = targetValue;
                                storeMetrics.deviation = storeMetrics.writeOffsTotalPercent - targetValue;
                            }
                        }
                    }

                    const storeRow: ReportRow = {
                        id: `store-${store.storeNumber}`,
                        name: `${store.storeNumber} - ${store.storeName}`,
                        level: 4,
                        metrics: storeMetrics,
                        children: [],
                        storeCount: 1,
                        summedMetrics: storeMetrics,
                    };
                    amRow.children.push(storeRow);
                }
                const { metrics: amMetrics, summedMetrics: amSummedMetrics, storeCount: amStoreCount } = aggregateHierarchyNode(amRow.children, 3);
                amRow.metrics = amMetrics;
                amRow.summedMetrics = amSummedMetrics;
                amRow.storeCount = amStoreCount;

                hosRow.children.push(amRow);
            }
            const { metrics: hosMetrics, summedMetrics: hosSummedMetrics, storeCount: hosStoreCount } = aggregateHierarchyNode(hosRow.children, 2);
            hosRow.metrics = hosMetrics;
            hosRow.summedMetrics = hosSummedMetrics;
            hosRow.storeCount = hosStoreCount;

            rdcRow.children.push(hosRow);
        }
        const { metrics: rdcMetrics, summedMetrics: rdcSummedMetrics, storeCount: rdcStoreCount } = aggregateHierarchyNode(rdcRow.children, 1);
        rdcRow.metrics = rdcMetrics;
        rdcRow.summedMetrics = rdcSummedMetrics;
        rdcRow.storeCount = rdcStoreCount;

        if (rdcRow.storeCount > 0) {
            allRegionsRow.children.push(rdcRow);
        }
    }
    const { metrics: allMetrics, summedMetrics: allSummedMetrics, storeCount: allStoreCount } = aggregateHierarchyNode(allRegionsRow.children, 0);
    allRegionsRow.metrics = allMetrics;
    allRegionsRow.summedMetrics = allSummedMetrics;
    allRegionsRow.storeCount = allStoreCount;
    
    // Sorting logic needs to be applied after building the hierarchy
    const sortChildren = (rows: ReportRow[]) => {
        if (!sortConfig) return;
        
        rows.forEach(row => {
            if (row.children.length > 0) {
                if (row.level === 1 || row.level === 2) { // Sort AMs under HoS, and HoS under RDC
                    row.children.sort((a, b) => {
                        const valA = sortConfig.key === 'turnover' ? a.metrics.turnover : a.metrics.writeOffsTotalPercent;
                        const valB = sortConfig.key === 'turnover' ? b.metrics.turnover : b.metrics.writeOffsTotalPercent;
                        if (sortConfig.direction === 'asc') {
                            return valA - valB;
                        } else {
                            return valB - valA;
                        }
                    });
                }
                sortChildren(row.children);
            }
        });
    };
    
    sortChildren([allRegionsRow]);

    return allRegionsRow;

  }, [isLoading, orgStructure, viewMode, weeklyActuals, ytdActuals, targets, selectedGroup, selectedWeek, sortConfig, rdcList]);

  const handleToggleRow = useCallback((id: string) => {
      setExpandedRows(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              newSet.add(id);
          }
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
          const newDirection = isCurrentKey && prev.direction === 'desc' ? 'asc' : 'desc';
          // Default sort for turnover is desc, for deviation is asc
          const defaultDirection = key === 'turnover' ? 'desc' : 'asc';
          return {
              key,
              direction: isCurrentKey ? newDirection : defaultDirection
          };
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
  if (!reportData) {
      return <div class={sharedStyles['placeholder-view']}><h3>{t('sidebar.writeOffsReport')}</h3><p>No data available to generate the report. Please import the required files.</p></div>;
  }
  
  const getSortIcon = (key: 'turnover' | 'writeOffsTotalPercent') => {
      if (sortConfig?.key !== key) return '↕';
      return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
      <div class={styles['write-offs-report-view']}>
          <div class={styles['controls-container']}>
              <div class={styles['control-group']}>
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
                  <label for="group-select">Item Group:</label>
                  <select id="group-select" value={selectedGroup} onChange={e => setSelectedGroup((e.target as HTMLSelectElement).value)}>
                      <option value="all">All Groups</option>
                      {availableGroups.map(group => <option key={group} value={group}>{group}</option>)}
                  </select>
              </div>
               <div class={styles['actions-bar']}>
                  <button onClick={() => expandToLevel(2)}>{t('writeOffsReport.expandToHos')}</button>
                  <button onClick={() => expandToLevel(3)}>{t('writeOffsReport.expandToAm')}</button>
                  <button onClick={() => setExpandedRows(new Set())}>{t('writeOffsReport.collapseAll')}</button>
              </div>
          </div>
          <div class={sharedStyles['table-container']}>
              <table class={styles['report-table']}>
                  <thead>
                      <tr>
                          <th>{t('columns.writeOffs.regionManagerStore')}</th>
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
