import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { useTranslation } from '../i18n';
import { getUniqueWarehouseIds, findProductsByPartialId, getProductDetails, Product } from '../db';
import { SimulationResult, InitialStockBatch } from "../simulation.worker";
import { ManualDelivery } from '../utils/types';

export const SimulationView = () => {
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

    const debounceTimeoutRef = useRef<number | null>(null);
    const workerRef = useRef<Worker | null>(null);

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
            const lastReceipt = result.initialStockComposition
                .filter(b => !b.isUnknown && !b.isManual)
                .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))[0];
            if (lastReceipt) {
                setNewDelivery({ date: lastReceipt.deliveryDate, quantity: '', bestBeforeDate: '' });
            }
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
        })();
    }, []);

    const resetOverrides = useCallback(() => {
        if (originalSimParams) {
            setOverrideWDate(String(originalSimParams.wDate));
            setOverrideSDate(String(originalSimParams.sDate));
            setOverrideCDate(String(originalSimParams.cDate));
            setOverrideAvgSales(originalSimParams.avgDailySales.toFixed(2));
        } else if (selectedProduct) {
            setOverrideWDate(String(selectedProduct.shelfLifeAtReceiving));
            setOverrideSDate(String(selectedProduct.shelfLifeAtStore));
            setOverrideCDate(String(selectedProduct.customerShelfLife));
            setOverrideAvgSales(simulationResult?.avgDailySales.toFixed(2) ?? '');
        } else {
            setOverrideWDate('');
            setOverrideSDate('');
            setOverrideCDate('');
            setOverrideAvgSales('');
        }
        setManualDeliveries([]);
        setNewDelivery({ date: '', quantity: '', bestBeforeDate: '' });
        setIsDirty(true);
    }, [selectedProduct, simulationResult, originalSimParams]);


    useEffect(() => {
        if (selectedProduct && !simulationResult) {
            resetOverrides();
        }
    }, [selectedProduct, simulationResult, resetOverrides]);

    const handleProductIdChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setProductId(value);
        setSelectedProduct(null); // Clear selected product on new input
        setSimulationResult(null);
        setOriginalSimParams(null);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (value.trim().length < 2) {
            setProductSuggestions([]);
            setIsSuggestionsVisible(false);
            return;
        }

        debounceTimeoutRef.current = window.setTimeout(async () => {
            const suggestions = await findProductsByPartialId(value, 10);
            setProductSuggestions(suggestions);
            setIsSuggestionsVisible(suggestions.length > 0);
        }, 300);
    };

    const handleSuggestionClick = async (product: Product) => {
        setProductId(product.productId);
        setWarehouseId(product.warehouseId); // Auto-select warehouse
        setIsSuggestionsVisible(false);
        const fullProductDetails = await getProductDetails(product.warehouseId, product.fullProductId);
        setSelectedProduct(fullProductDetails);
        setSimulationResult(null);
        setOriginalSimParams(null);
    };

    const handleRunSimulation = () => {
        if (!selectedProduct || !workerRef.current) return;
        setIsSimulating(true);
        
        workerRef.current.postMessage({
            warehouseId: selectedProduct.warehouseId,
            fullProductId: selectedProduct.fullProductId,
            overrides: {
                wDate: overrideWDate !== '' ? parseFloat(overrideWDate) : undefined,
                sDate: overrideSDate !== '' ? parseFloat(overrideSDate) : undefined,
                cDate: overrideCDate !== '' ? parseFloat(overrideCDate) : undefined,
                avgDailySales: overrideAvgSales !== '' ? parseFloat(overrideAvgSales) : undefined,
            },
            manualDeliveries: manualDeliveries.map(({ id, ...rest }) => rest)
        });
    };
    
    const handleAddManualDelivery = () => {
        if (newDelivery.date && newDelivery.quantity && newDelivery.bestBeforeDate) {
            setManualDeliveries(prev => [...prev, { ...newDelivery, quantity: parseFloat(newDelivery.quantity), id: Date.now() }]);
            setNewDelivery({ date: newDelivery.date, quantity: '', bestBeforeDate: '' }); // Keep date, clear others
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
            <div class="detail-item">
                <span class="detail-label">{t(labelKey)}</span>
                <span class="detail-value">{value ?? 'N/A'}</span>
            </div>
        )
    };
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(value);
    }

    return (
        <div class="simulation-view-container">
            <div class="simulation-controls">
                <div class="simulation-controls-header">
                    <h2>{t('simulations.controls.title')}</h2>
                    {selectedProduct && <button class="button-secondary reset-button" onClick={resetOverrides}>{t('simulations.buttons.resetDefaults')}</button>}
                </div>
                <div class="filter-bar">
                    <div class="filter-group">
                        <label htmlFor="sim-warehouseId">{t('simulations.controls.warehouse')}</label>
                        <select id="sim-warehouseId" value={warehouseId} onChange={(e) => {
                            setWarehouseId((e.target as HTMLSelectElement).value);
                            setSelectedProduct(null);
                            setProductId('');
                            setSimulationResult(null);
                            setOriginalSimParams(null);
                        }}>
                            <option value="">{t('simulations.controls.selectWarehouse')}</option>
                            {warehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </div>
                    <div class="filter-group">
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
                            <ul class="suggestions-list">
                                {productSuggestions
                                .filter(p => p.warehouseId === warehouseId)
                                .map(p => (
                                    <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                                        <strong>{p.productId}</strong> - {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div class="filter-actions">
                        <button onClick={handleRunSimulation} disabled={!selectedProduct || isSimulating} class={`button-primary ${isDirty ? 'dirty' : ''}`}>{isDirty ? t('simulations.buttons.rerun') : t('simulations.controls.run')}</button>
                    </div>
                </div>
            </div>

            {isSimulating && (
                 <div class="simulation-loading">
                    <div class="spinner"></div>
                    <p>{t('simulations.results.calculating')}</p>
                 </div>
            )}

            {selectedProduct && !isSimulating && (
                <>
                 <div class="product-details-card">
                    <h3>{t('simulations.details.title')}</h3>
                    <div class="details-grid">
                        {renderDetail('columns.product.itemGroup', selectedProduct.itemGroup)}
                        {renderDetail('columns.product.productId', selectedProduct.productId)}
                        {renderDetail('columns.product.name', selectedProduct.name)}
                        {renderDetail('columns.product.caseSize', selectedProduct.caseSize)}
                        {renderDetail('columns.product.cartonsPerPallet', selectedProduct.cartonsPerPallet)}
                        {renderDetail('columns.product.price', formatCurrency(selectedProduct.price))}
                        {renderDetail('columns.product.status', 
                            <span>
                                {selectedProduct.status}
                                {selectedProduct.itemLocked && <span class="status-locked"> ({t('simulations.details.locked')}: {selectedProduct.itemLocked})</span>}
                            </span>
                        )}
                        {renderDetail('columns.product.supplierId', selectedProduct.supplierId)}
                        {renderDetail('columns.product.supplierName', selectedProduct.supplierName)}
                    </div>
                </div>

                <div class="simulation-overrides-card">
                    <h3>{t('simulations.overrides.title')}</h3>
                    <div class="details-grid">
                        <div class="detail-item">
                            <label class="detail-label" htmlFor="wdate-override">{t('columns.product.shelfLifeAtReceiving')}</label>
                            <input id="wdate-override" type="number" value={overrideWDate} onInput={(e) => handleOverrideChange(setOverrideWDate, (e.target as HTMLInputElement).value)} class="detail-input"/>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label" htmlFor="sdate-override">{t('columns.product.shelfLifeAtStore')}</label>
                            <input id="sdate-override" type="number" value={overrideSDate} onInput={(e) => handleOverrideChange(setOverrideSDate, (e.target as HTMLInputElement).value)} class="detail-input"/>
                        </div>
                        <div class="detail-item">
                            <label class="detail-label" htmlFor="cdate-override">{t('columns.product.customerShelfLife')}</label>
                            <input id="cdate-override" type="number" value={overrideCDate} onInput={(e) => handleOverrideChange(setOverrideCDate, (e.target as HTMLInputElement).value)} class="detail-input"/>
                        </div>
                    </div>
                </div>
                </>
            )}
            
            {simulationResult && !isSimulating && (
                <div class="simulation-results">
                    <h3>{t('simulations.results.title')}</h3>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <h4>{t('simulations.kpi.totalWriteOffValue')}</h4>
                            <p>{formatCurrency(simulationResult.totalWriteOffValue)}</p>
                        </div>
                        <div class="kpi-card">
                            <h4>{t('simulations.kpi.daysOfStock')}</h4>
                            <p>{simulationResult.daysOfStock.toFixed(1)} {t('simulations.details.days')}</p>
                        </div>
                         <div class="kpi-card">
                            <h4>{t('simulations.kpi.avgDailySales')}</h4>
                            <div class="sales-adjust-controls">
                               <input 
                                 type="number" 
                                 value={overrideAvgSales}
                                 onInput={(e) => handleOverrideChange(setOverrideAvgSales, (e.target as HTMLInputElement).value)}
                                 class="kpi-input"
                                />
                               <div class="adjust-buttons">
                                <button class="adjust-btn" onClick={() => adjustSales(0.10)} title={t('simulations.kpi.salesAdjustUp')}>+10%</button>
                                <button class="adjust-btn" onClick={() => adjustSales(-0.10)} title={t('simulations.kpi.salesAdjustDown')}>-10%</button>
                               </div>
                            </div>
                            <span class="sales-reset-value" onClick={() => { setOverrideAvgSales((originalSimParams || simulationResult).avgDailySales.toFixed(2)); setIsDirty(true);}} title={t('simulations.kpi.salesResetTooltip')}>
                                {t('simulations.kpi.original')}: {(originalSimParams || simulationResult).avgDailySales.toFixed(2)}
                            </span>
                        </div>
                        <div class="kpi-card">
                            <h4>{t('simulations.kpi.nonCompliantReceipts')}</h4>
                            <p>{simulationResult.nonCompliantReceiptsCount}</p>
                        </div>
                        <div class="kpi-card">
                            <h4>{t('simulations.kpi.firstWriteOffDate')}</h4>
                            <p>{simulationResult.firstWriteOffDate || t('simulations.results.none')}</p>
                        </div>
                    </div>

                    <div class="initial-stock-composition">
                        <h4>{t('simulations.initialStock.title')}</h4>
                        {!simulationResult.isStockDataComplete && (
                            <p class="data-completeness-warning">
                                {t('simulations.initialStock.warning')}
                            </p>
                        )}
                        <div class="table-container">
                            <table class="initial-stock-table">
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
                                        <tr key={`${batch.deliveryDate}-${batch.bestBeforeDate}-${index}`} class={`${batch.isNonCompliant ? 'non-compliant-row' : ''} ${batch.isAffectedByWriteOff ? 'batch-risk-row' : ''} ${batch.isManual ? 'manual-delivery-row' : ''}`}>
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

                    <div class="manual-delivery-section">
                        <h4>{t('simulations.manualDelivery.title')}</h4>
                         <div class="filter-bar">
                            <div class="filter-group">
                                <label htmlFor="manual-delivery-date">{t('simulations.manualDelivery.date')}</label>
                                <input 
                                    type="date" 
                                    id="manual-delivery-date" 
                                    value={newDelivery.date}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, date: (e.target as HTMLInputElement).value}))}
                                />
                            </div>
                            <div class="filter-group">
                                <label htmlFor="manual-best-before-date">{t('simulations.manualDelivery.bestBeforeDate')}</label>
                                <input 
                                    type="date" 
                                    id="manual-best-before-date" 
                                    value={newDelivery.bestBeforeDate}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, bestBeforeDate: (e.target as HTMLInputElement).value}))}
                                />
                            </div>
                            <div class="filter-group">
                                 <label htmlFor="manual-delivery-qty">{t('simulations.manualDelivery.quantity')}</label>
                                 <input 
                                    type="number" 
                                    id="manual-delivery-qty" 
                                    value={newDelivery.quantity}
                                    onInput={(e) => setNewDelivery(prev => ({...prev, quantity: (e.target as HTMLInputElement).value}))}
                                    placeholder="0"
                                />
                            </div>
                            <div class="filter-actions">
                                <button class="button-primary" onClick={handleAddManualDelivery}>{t('simulations.buttons.add')}</button>
                            </div>
                         </div>
                         {manualDeliveries.length > 0 && (
                            <div class="manual-deliveries-list">
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
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('simulations.log.date')}</th>
                                    <th>{t('simulations.log.stockStart')}</th>
                                    <th>{t('simulations.log.sales')}</th>
                                    <th>{t('simulations.log.receipts')}</th>
                                    <th>{t('simulations.log.writeOffs')}</th>
                                    <th>{t('simulations.log.stockEnd')}</th>
                                    <th>{t('simulations.log.notes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(isLogExpanded ? simulationResult.log : simulationResult.log.slice(0, 14)).map(entry => (
                                    <tr key={entry.date} class={`${entry.writeOffs > 0 ? 'log-write-off-row' : ''} ${entry.stockEnd === 0 && entry.writeOffs === 0 ? 'log-stock-out-row' : ''}`}>
                                        <td>{entry.date}</td>
                                        <td>{entry.stockStart.toLocaleString(language)}</td>
                                        <td>{entry.sales.toLocaleString(language)}</td>
                                        <td>{entry.receipts.toLocaleString(language)}</td>
                                        <td>{entry.writeOffs.toLocaleString(language)}</td>
                                        <td>{entry.stockEnd.toLocaleString(language)}</td>
                                        <td>{entry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {simulationResult.log.length > 14 && (
                        <div class="log-toggle-container">
                            <button class="log-toggle-button" onClick={() => setIsLogExpanded(!isLogExpanded)}>
                                {isLogExpanded ? t('simulations.buttons.showLess') : t('simulations.buttons.showMore')}
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
