import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { useTranslation } from '../i18n';
import { getUniqueWarehouseIds, findProductsByPartialId, Product, getProductDetails } from '../db';
import { SimulationResult, InitialStockBatch } from "../simulation.worker";
import { ManualDelivery, UserSession, ReportResultItem } from '../utils/types';
import { StockChart } from '../components/StockChart';
import styles from './SimulationView.module.css';
import sharedStyles from '../styles/shared.module.css';

type SimulationViewProps = {
    userSession: UserSession | null;
    initialParams: { warehouseId: string; fullProductId: string; } | null;
    onSimulationStart: () => void;
    watchlist: ReportResultItem[];
    watchlistIndex: number | null;
    onNavigateWatchlist: (direction: 1 | -1) => void;
    onClearWatchlist: () => void;
};

const WatchlistNavigator = ({ 
    watchlist, 
    currentIndex, 
    onNavigate,
}: {
    watchlist: ReportResultItem[];
    currentIndex: number;
    onNavigate: (direction: 1 | -1) => void;
}) => {
    const { t } = useTranslation();
    const currentItem = watchlist[currentIndex];

    return (
        <div class={styles.watchlistNavigator}>
            <div class={styles.watchlistNavigatorInfo}>
                {t('simulations.watchlist.viewing', { current: currentIndex + 1, total: watchlist.length })}: <strong>{currentItem.productName}</strong>
            </div>
            <div class={styles.watchlistNavigatorActions}>
                <button onClick={() => onNavigate(-1)} disabled={currentIndex === 0}>{t('pagination.previous')}</button>
                <button onClick={() => onNavigate(1)} disabled={currentIndex === watchlist.length - 1}>{t('pagination.next')}</button>
            </div>
        </div>
    );
};

const SimulationView = ({ userSession, initialParams, onSimulationStart, watchlist, watchlistIndex, onNavigateWatchlist, onClearWatchlist }: SimulationViewProps) => {
    const { t, language } = useTranslation();
    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    
    const [originalSimParams, setOriginalSimParams] = useState<{
        wDate: number;
        sDate: number;
        cDate: number;
        avgDailySales: number;
    } | null>(null);

    // State for user overrides
    const [overrideWDate, setOverrideWDate] = useState('');
    const [overrideSDate, setOverrideSDate] = useState('');
    const [overrideCDate, setOverrideCDate] = useState('');
    const [overrideAvgSales, setOverrideAvgSales] = useState('');

    const [newDelivery, setNewDelivery] = useState({ date: '', quantity: '', bestBeforeDate: '' });
    const [manualDeliveries, setManualDeliveries] = useState<ManualDelivery[]>([]);

    const [isDirty, setIsDirty] = useState(false);
    const [isLogExpanded, setIsLogExpanded] = useState(false);
    const [isChartVisible, setIsChartVisible] = useState(false);

    const debounceTimeoutRef = useRef<number | null>(null);
    const workerRef = useRef<Worker | null>(null);

    const isRdcMode = userSession?.mode === 'rdc';
    
    const runSimulation = useCallback((productToSimulate: Product) => {
        if (!workerRef.current) return;
        
        setIsSimulating(true);
        setIsChartVisible(false);

        // This ensures we use the state-based overrides if they exist,
        // otherwise we use the product's default values for the very first run.
        const wDateOverride = overrideWDate !== '' ? parseFloat(overrideWDate) : productToSimulate.shelfLifeAtReceiving;
        const sDateOverride = overrideSDate !== '' ? parseFloat(overrideSDate) : productToSimulate.shelfLifeAtStore;
        const cDateOverride = overrideCDate !== '' ? parseFloat(overrideCDate) : productToSimulate.customerShelfLife;
        const avgSalesOverride = overrideAvgSales !== '' ? parseFloat(overrideAvgSales) : undefined;

        workerRef.current.postMessage({
            warehouseId: productToSimulate.warehouseId,
            fullProductId: productToSimulate.fullProductId,
            overrides: {
                wDate: wDateOverride,
                sDate: sDateOverride,
                cDate: cDateOverride,
                avgDailySales: avgSalesOverride
            },
            manualDeliveries: manualDeliveries.map(({ id, ...rest }) => rest)
        });
    }, [manualDeliveries, overrideWDate, overrideSDate, overrideCDate, overrideAvgSales]);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../simulation.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (event: MessageEvent<SimulationResult>) => {
            const result = event.data;
            setSimulationResult(result);
            setIsSimulating(false);

            if (!originalSimParams && selectedProduct) {
                 setOriginalSimParams({
                    wDate: selectedProduct.shelfLifeAtReceiving,
                    sDate: selectedProduct.shelfLifeAtStore,
                    cDate: selectedProduct.customerShelfLife,
                    avgDailySales: result.avgDailySales,
                });
            }
            
            setOverrideAvgSales(result.avgDailySales.toFixed(2));
            setIsDirty(false);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, [originalSimParams, selectedProduct]);

    useEffect(() => {
        (async () => {
            const ids = await getUniqueWarehouseIds();
            setWarehouseIds(ids);
            if (isRdcMode && !initialParams) {
                setWarehouseId(userSession.rdc!.id);
            }
        })();
    }, [isRdcMode, userSession, initialParams]);

    const resetOverrides = useCallback(() => {
        if (selectedProduct) {
            const baseParams = originalSimParams || {
                wDate: selectedProduct.shelfLifeAtReceiving,
                sDate: selectedProduct.shelfLifeAtStore,
                cDate: selectedProduct.customerShelfLife,
                avgDailySales: simulationResult?.avgDailySales ?? 0,
            };
            
            setOverrideWDate(String(baseParams.wDate));
            setOverrideSDate(String(baseParams.sDate));
            setOverrideCDate(String(baseParams.cDate));
            setOverrideAvgSales(baseParams.avgDailySales.toFixed(2));
            
            const today = new Date();
            const deliveryDate = today.toLocaleDateString('en-CA');
            const bbd = new Date();
            bbd.setDate(today.getDate() + selectedProduct.shelfLifeAtReceiving);
            const bestBeforeDate = bbd.toLocaleDateString('en-CA');
            const quantity = selectedProduct.caseSize * selectedProduct.cartonsPerPallet;
            
            setNewDelivery({
                date: deliveryDate,
                bestBeforeDate: bestBeforeDate,
                quantity: quantity > 0 ? String(quantity) : ''
            });
        } else {
            setOverrideWDate('');
            setOverrideSDate('');
            setOverrideCDate('');
            setOverrideAvgSales('');
            setNewDelivery({ date: '', quantity: '', bestBeforeDate: '' });
        }
        
        setManualDeliveries([]);
        setIsDirty(true);
    }, [selectedProduct, simulationResult, originalSimParams]);
    
    const setupProductState = useCallback((product: Product) => {
        setSelectedProduct(product);
        setOverrideWDate(String(product.shelfLifeAtReceiving));
        setOverrideSDate(String(product.shelfLifeAtStore));
        setOverrideCDate(String(product.customerShelfLife));
        setOverrideAvgSales(''); 

        const today = new Date();
        const deliveryDate = today.toLocaleDateString('en-CA');
        const bbd = new Date();
        bbd.setDate(today.getDate() + product.shelfLifeAtReceiving);
        const bestBeforeDate = bbd.toLocaleDateString('en-CA');
        const suggestedQuantity = product.caseSize * product.cartonsPerPallet;

        setNewDelivery({
            date: deliveryDate,
            bestBeforeDate: bestBeforeDate,
            quantity: suggestedQuantity > 0 ? String(suggestedQuantity) : '',
        });
        
        setManualDeliveries([]);
        setIsDirty(false);
        setOriginalSimParams(null);
        setSimulationResult(null);
    }, []);
    
    useEffect(() => {
        if (initialParams) {
            (async () => {
                setIsSimulating(true);
                setWarehouseId(initialParams.warehouseId);
                const product = await getProductDetails(initialParams.warehouseId, initialParams.fullProductId);
                if (product) {
                    setProductId(product.productId);
                    setupProductState(product);
                    runSimulation(product);
                } else {
                    setIsSimulating(false);
                }
                onSimulationStart();
            })();
        }
    }, [initialParams, onSimulationStart, runSimulation, setupProductState]);


    const handleProductIdChange = (e: Event) => {
        onClearWatchlist(); // Clear watchlist when user starts a manual search
        const value = (e.target as HTMLInputElement).value;
        setProductId(value);
        setSelectedProduct(null); // Clear selected product on new input
        setSimulationResult(null);
        setOriginalSimParams(null);
        setIsChartVisible(false);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (value.trim().length < 2) {
            setProductSuggestions([]);
            setIsSuggestionsVisible(false);
            return;
        }

        debounceTimeoutRef.current = window.setTimeout(async () => {
            const allProducts = await findProductsByPartialId(value, 10, warehouseId);
            const stockLevels = new Map<string, number>();

            for (const p of allProducts) {
                stockLevels.set(p.fullProductId, p.stockOnHand);
            }

            const sortedSuggestions = allProducts.sort((a, b) => {
                const statusA = a.status === '8' ? 0 : 1;
                const statusB = b.status === '8' ? 0 : 1;
                if (statusA !== statusB) {
                    return statusA - statusB;
                }
                return a.productId.localeCompare(b.productId);
            });
            setProductSuggestions(sortedSuggestions);
            setIsSuggestionsVisible(sortedSuggestions.length > 0);
        }, 300);
    };

    const handleSuggestionClick = (product: Product) => {
        setIsSuggestionsVisible(false);
        setProductId(product.productId);
        if (!isRdcMode) {
            setWarehouseId(product.warehouseId);
        }
        setupProductState(product);
    };

    const handleRunSimulation = () => {
        if (!selectedProduct) return;
        runSimulation(selectedProduct);
    };
    
    const handleAddManualDelivery = () => {
        if (newDelivery.date && newDelivery.quantity && newDelivery.bestBeforeDate) {
            setManualDeliveries(prev => [...prev, { ...newDelivery, quantity: parseFloat(newDelivery.quantity), id: Date.now() }]);
            setNewDelivery(prev => ({ ...prev, quantity: '', bestBeforeDate: '' })); 
            setIsDirty(true);
        }
    };
    
    const handleRemoveManualDelivery = (id: number) => {
        setManualDeliveries(prev => prev.filter(d => d.id !== id));
        setIsDirty(true);
    };

    const handleOverrideChange = (setter: (val: string) => void, value: string) => {
        setter(value);
        setIsDirty(true);
    }
    
    const adjustSales = (percentage: number) => {
        const currentSales = parseFloat(overrideAvgSales);
        if (!isNaN(currentSales)) {
            const newSales = currentSales * (1 + percentage);
            setOverrideAvgSales(newSales.toFixed(2));
            setIsDirty(true);
        }
    };

    const renderDetail = (labelKey: string, value: any) => {
        return (
            <div class={styles.detailItem}>
                <span class={styles.detailLabel}>{t(labelKey)}</span>
                <span class={styles.detailValue}>{value ?? 'N/A'}</span>
            </div>
        )
    };
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(language, { style: 'currency', currency: 'GBP' }).format(value);
    }

    return (
        <div class={styles.simulationViewContainer}>
            {watchlist.length > 0 && watchlistIndex !== null && (
                <WatchlistNavigator 
                    watchlist={watchlist}
                    currentIndex={watchlistIndex}
                    onNavigate={onNavigateWatchlist}
                />
            )}
            <div class={styles.simulationControls}>
                <div class={styles.simulationControlsHeader}>
                    <h2>{t('simulations.controls.title')}</h2>
                    {selectedProduct && <button class={`${sharedStyles.buttonSecondary} ${styles.resetButton}`} onClick={resetOverrides}>{t('simulations.buttons.resetDefaults')}</button>}
                </div>
                <div class={sharedStyles.filterBar}>
                    <div class={sharedStyles.filterGroup}>
                        <label htmlFor="sim-warehouseId">{t('simulations.controls.warehouse')}</label>
                        <select 
                            id="sim-warehouseId" 
                            value={warehouseId} 
                            disabled={isRdcMode}
                            onChange={(e) => {
                                onClearWatchlist();
                                setWarehouseId((e.target as HTMLSelectElement).value);
                                setSelectedProduct(null);
                                setProductId('');
                                setSimulationResult(null);
                                setOriginalSimParams(null);
                                setIsChartVisible(false);
                            }}>
                            <option value="">{t('simulations.controls.selectWarehouse')}</option>
                            {warehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </div>
                    <div class={sharedStyles.filterGroup}>
                        <label htmlFor="sim-productId">{t('simulations.controls.productId')}</label>
                        <input
                            type="text"
                            id="sim-productId"
                            value={productId}
                            onInput={handleProductIdChange}
                            placeholder={t('simulations.controls.productIdPlaceholder')}
                            disabled={!warehouseId}
                            autocomplete="off"
                        />
                        {isSuggestionsVisible && productSuggestions.length > 0 && (
                             <ul class={sharedStyles.suggestionsList}>
                                {productSuggestions.map(p => (
                                    <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                                        <div class={sharedStyles.suggestionMain}>
                                            <strong>{p.productId}</strong> - {p.name}
                                        </div>
                                        <div class={sharedStyles.suggestionDetails}>
                                            <span>{`(${p.status})`}</span>
                                            <span>{`CS: ${p.caseSize}`}</span>
                                            <span>{`Stock: ${p.stockOnHand.toLocaleString(language)}`}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div class={sharedStyles.filterActions}>
                        <button onClick={handleRunSimulation} disabled={!selectedProduct || isSimulating} class={`${sharedStyles.buttonPrimary} ${isDirty ? sharedStyles.dirty : ''}`}>{isDirty ? t('simulations.buttons.rerun') : t('simulations.controls.run')}</button>
                    </div>
                </div>
            </div>

            {isSimulating && (
                 <div class={styles.simulationLoading}>
                    <div class={sharedStyles.spinner}></div>
                    <p>{t('simulations.results.calculating')}</p>
                 </div>
            )}

            {selectedProduct && !isSimulating && (
                <>
                 <div class={styles.productDetailsCard}>
                    <h3>{t('simulations.details.title')}</h3>
                    <div class={styles.detailsGrid}>
                        {renderDetail('columns.product.itemGroup', selectedProduct.itemGroup)}
                        {renderDetail('columns.product.productId', selectedProduct.productId)}
                        {renderDetail('columns.product.name', selectedProduct.name)}
                        {renderDetail('columns.product.caseSize', selectedProduct.caseSize)}
                        {renderDetail('columns.product.cartonsPerPallet', selectedProduct.cartonsPerPallet)}
                        {renderDetail('columns.product.price', formatCurrency(selectedProduct.price))}
                        {renderDetail('columns.product.status', 
                            <span>
                                {selectedProduct.status}
                                {selectedProduct.itemLocked && <span class={styles.statusLocked}> ({t('simulations.details.locked')}: {selectedProduct.itemLocked})</span>}
                            </span>
                        )}
                        {renderDetail('columns.product.supplierId', selectedProduct.supplierId)}
                        {renderDetail('columns.product.supplierName', selectedProduct.supplierName)}
                    </div>
                </div>

                <div class={styles.simulationOverridesCard}>
                    <h3>{t('simulations.overrides.title')}</h3>
                    <div class={styles.detailsGrid}>
                        <div class={styles.detailItem}>
                            <label class={styles.detailLabel} htmlFor="wdate-override">{t('columns.product.shelfLifeAtReceiving')}</label>
                            <input id="wdate-override" type="number" value={overrideWDate} onInput={(e) => handleOverrideChange(setOverrideWDate, (e.target as HTMLInputElement).value)} class={styles.detailInput}/>
                        </div>
                        <div class={styles.detailItem}>
                            <label class={styles.detailLabel} htmlFor="sdate-override">{t('columns.product.shelfLifeAtStore')}</label>
                            <input id="sdate-override" type="number" value={overrideSDate} onInput={(e) => handleOverrideChange(setOverrideSDate, (e.target as HTMLInputElement).value)} class={styles.detailInput}/>
                        </div>
                        <div class={styles.detailItem}>
                            <label class={styles.detailLabel} htmlFor="cdate-override">{t('columns.product.customerShelfLife')}</label>
                            <input id="cdate-override" type="number" value={overrideCDate} onInput={(e) => handleOverrideChange(setOverrideCDate, (e.target as HTMLInputElement).value)} class={styles.detailInput}/>
                        </div>
                    </div>
                </div>
                </>
            )}
            
            {simulationResult && !isSimulating && (
                <div class={styles.simulationResults}>
                    <h3>{t('simulations.results.title')}</h3>
                    <div class={styles.kpiGrid}>
                        <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.totalWriteOffValue')}</h4>
                            <p>{formatCurrency(simulationResult.totalWriteOffValue)}</p>
                        </div>
                        <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.daysOfStock')}</h4>
                            <p>{simulationResult.daysOfStock.toFixed(1)} {t('simulations.details.days')}</p>
                        </div>
                        <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.aldValue')}</h4>
                            <p>{formatCurrency(simulationResult.initialAldAffectedValue)}</p>
                            <p class={styles.kpiDescription}>{t('simulations.kpi.aldDescription')}</p>
                        </div>
                         <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.avgDailySales')}</h4>
                            <div class={styles.salesAdjustControls}>
                               <input 
                                 type="number" 
                                 value={overrideAvgSales}
                                 onInput={(e) => handleOverrideChange(setOverrideAvgSales, (e.target as HTMLInputElement).value)}
                                 class={styles.kpiInput}
                                />
                               <div class={styles.adjustButtons}>
                                <button class={styles.adjustBtn} onClick={() => adjustSales(0.10)} title={t('simulations.kpi.salesAdjustUp')}>+10%</button>
                                <button class={styles.adjustBtn} onClick={() => adjustSales(-0.10)} title={t('simulations.kpi.salesAdjustDown')}>-10%</button>
                               </div>
                            </div>
                            <span class={styles.salesResetValue} onClick={() => { setOverrideAvgSales((originalSimParams || simulationResult).avgDailySales.toFixed(2)); setIsDirty(true);}} title={t('simulations.kpi.salesResetTooltip')}>
                                {t('simulations.kpi.original')}: {(originalSimParams || simulationResult).avgDailySales.toFixed(2)}
                            </span>
                        </div>
                        <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.nonCompliantReceipts')}</h4>
                            <p>{simulationResult.nonCompliantReceiptsCount}</p>
                        </div>
                        <div class={styles.kpiCard}>
                            <h4>{t('simulations.kpi.firstWriteOffDate')}</h4>
                            <p>{simulationResult.firstWriteOffDate || t('simulations.results.none')}</p>
                        </div>
                    </div>

                    {simulationResult.log && simulationResult.log.length > 0 && (
                        <div class={styles.expandableSection}>
                            <div class={styles.expandableHeader} onClick={() => setIsChartVisible(!isChartVisible)}>
                                <h4>{t('simulations.chart.title')}</h4>
                                <button>
                                    {isChartVisible ? t('simulations.buttons.hideChart') : t('simulations.buttons.showChart')}
                                </button>
                            </div>
                            <div class={`${styles.expandableContent} ${isChartVisible ? styles.expanded : ''}`}>
                                <StockChart data={simulationResult.log.slice(0, 14)} />
                            </div>
                        </div>
                    )}

                    <div class={styles.initialStockComposition}>
                        <div class={styles.initialStockHeader}>
                            <h4>{t('simulations.initialStock.title')}</h4>
                             <div class={styles.tableLegendContainer}>
                                <div class={styles.legendItem}><div class={`${styles.legendColorBox} ${styles.ald}`}></div><span>{t('simulations.initialStock.legend.ald')}</span></div>
                                <div class={styles.legendItem}><div class={`${styles.legendColorBox} ${styles.writeOff}`}></div><span>{t('simulations.initialStock.legend.writeOff')}</span></div>
                                <div class={styles.legendItem}><div class={`${styles.legendColorBox} ${styles.nonCompliant}`}></div><span>{t('simulations.initialStock.legend.nonCompliant')}</span></div>
                                <div class={styles.legendItem}><div class={`${styles.legendColorBox} ${styles.manual}`}></div><span>{t('simulations.initialStock.legend.manual')}</span></div>
                            </div>
                        </div>
                        {!simulationResult.isStockDataComplete && (
                            <p class={styles.dataCompletenessWarning}>
                                {t('simulations.initialStock.warning')}
                            </p>
                        )}
                        <div class={sharedStyles.tableContainer}>
                            <table class={styles.initialStockTable}>
                                <thead>
                                    <tr>
                                        <th>{t('simulations.initialStock.deliveryDate')}</th>
                                        <th>{t('simulations.initialStock.bestBeforeDate')}</th>
                                        <th>{t('simulations.initialStock.daysForSale')}</th>
                                        <th>{t('simulations.initialStock.regulationBreached')}</th>
                                        <th>{t('simulations.initialStock.quantity')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {simulationResult.initialStockComposition.map((batch: InitialStockBatch, index) => (
                                        <tr key={`${batch.deliveryDate}-${batch.bestBeforeDate}-${index}`} class={`${batch.isNonCompliant ? styles.nonCompliantRow : ''} ${batch.isAffectedByWriteOff ? styles.batchRiskRow : ''} ${batch.isManual ? styles.manualDeliveryRow : ''} ${batch.isAldAffected ? styles.aldRiskRow : ''}`}>
                                            <td>{batch.isUnknown ? t('simulations.initialStock.unknownBatch') : batch.deliveryDate}</td>
                                            <td>{batch.bestBeforeDate}</td>
                                            <td>{batch.daysToSell}</td>
                                            <td>{batch.isNonCompliant ? t('common.yesShort') : t('common.noShort')}</td>
                                            <td>{batch.quantity.toLocaleString(language)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class={styles.manualDeliverySection}>
                        <h4>{t('simulations.manualDelivery.title')}</h4>
                         <div class={sharedStyles.filterBar}>
                            <div class={sharedStyles.filterGroup}>
                                <label htmlFor="manual-delivery-date">{t('simulations.manualDelivery.date')}</label>
                                <input 
                                    type="date" 
                                    id="manual-delivery-date" 
                                    value={newDelivery.date}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, date: (e.target as HTMLInputElement).value}))}
                                />
                            </div>
                            <div class={sharedStyles.filterGroup}>
                                <label htmlFor="manual-best-before-date">{t('simulations.manualDelivery.bestBeforeDate')}</label>
                                <input 
                                    type="date" 
                                    id="manual-best-before-date" 
                                    value={newDelivery.bestBeforeDate}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, bestBeforeDate: (e.target as HTMLInputElement).value}))}
                                />
                            </div>
                            <div class={sharedStyles.filterGroup}>
                                 <label htmlFor="manual-delivery-qty">{t('simulations.manualDelivery.quantity')}</label>
                                 <input 
                                    type="number" 
                                    id="manual-delivery-qty" 
                                    value={newDelivery.quantity}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, quantity: (e.target as HTMLInputElement).value}))}
                                    placeholder="0"
                                />
                            </div>
                            <div class={sharedStyles.filterActions}>
                                <button class={sharedStyles.buttonPrimary} onClick={handleAddManualDelivery}>{t('simulations.buttons.add')}</button>
                            </div>
                         </div>
                         {manualDeliveries.length > 0 && (
                            <div class={styles.manualDeliveriesList}>
                                <h5>{t('simulations.manualDelivery.addedTitle')}</h5>
                                <ul>
                                    {manualDeliveries.map(d => (
                                        <li key={d.id}>
                                            <span>{d.date} (BBD: {d.bestBeforeDate}): {d.quantity.toLocaleString(language)}</span>
                                            <button onClick={() => handleRemoveManualDelivery(d.id)}>&times;</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}
                    </div>
                    
                    <h4>{t('simulations.log.title')}</h4>
                    <div class={sharedStyles.tableContainer}>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('simulations.log.date')}</th>
                                    <th>{t('simulations.log.stockStart')}</th>
                                    <th>{t('simulations.log.sales')}</th>
                                    <th>{t('simulations.log.receipts')}</th>
                                    <th>{t('simulations.log.writeOffs')}</th>
                                    <th>{t('simulations.log.ald')}</th>
                                    <th>{t('simulations.log.stockEnd')}</th>
                                    <th>{t('simulations.log.notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(isLogExpanded ? simulationResult.log : simulationResult.log.slice(0, 14)).map(entry => (
                                    <tr key={entry.date} class={`${entry.writeOffs > 0 ? styles.logWriteOffRow : ''} ${entry.stockEnd === 0 && entry.writeOffs === 0 ? styles.logStockOutRow : ''}`}>
                                        <td>{entry.date}</td>
                                        <td>{entry.stockStart.toLocaleString(language)}</td>
                                        <td>{entry.sales.toLocaleString(language)}</td>
                                        <td>{entry.receipts.toLocaleString(language)}</td>
                                        <td>{entry.writeOffs.toLocaleString(language)}</td>
                                        <td>{entry.aldAffectedStock.toLocaleString(language)}</td>
                                        <td>{entry.stockEnd.toLocaleString(language)}</td>
                                        <td>{entry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {simulationResult.log.length > 14 && (
                        <div class={styles.logToggleContainer}>
                            <button class={styles.logToggleButton} onClick={() => setIsLogExpanded(!isLogExpanded)}>
                                {isLogExpanded ? t('simulations.buttons.showLess') : t('simulations.buttons.showMore')}
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default SimulationView;
