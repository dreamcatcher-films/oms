export default {
  "header": {
    "title": "OMS",
    "session": {
        "mode": "Mode",
        "logout": "Logout"
    },
    "autoRefresh": {
        "title": "Auto-Refresh",
        "interval": "Interval",
        "minutes": "min",
        "nextRefreshIn": "Next refresh in..."
    }
  },
  "sidebar": {
    "import": "Data Import",
    "dataPreview": "Data Preview",
    "threatReport": "Threat Report",
    "statusReport": "Status Report",
    "shcReport": "SHC Report",
    "writeOffsReport": "Write-offs Report",
    "dashboard": "Dashboard",
    "simulations": "Simulations",
    "settings": "Settings",
    "footer": {
      "version": "Version {{version}}"
    }
  },
  "actions": {
    "runAnalysis": "Run Analysis",
    "clearAll": "Clear All Data"
  },
  "status": {
    "checkingDb": "Checking local database...",
    "dbOk": "Data found. Ready for analysis.",
    "dbEmpty": "Select data files to begin.",
    "dbError": "Error while checking the database.",
    "close": "Close notification",
    "import": {
        "preparing": "Preparing for import: {{dataTypeName}}...",
        "clearError": "Error clearing the database.",
        "starting": "Starting file import: {{dataTypeName}}...",
        "processing": "Processing file... Saved {{processedCount}} records.",
        "complete": "Import complete. Saved {{processedCount}} records ({{dataTypeName}}).",
        "parseError": "Critical error while parsing file: {{dataTypeName}}.",
        "readingFile": "Reading {{dataTypeName}} into memory...",
        "parsingExcel": "Parsing Excel data..."
    },
    "clear": {
        "clearing": "Clearing data: {{dataTypeName}}...",
        "cleared": "Data '{{dataTypeName}}' has been cleared.",
        "clearError": "Error while clearing data: {{dataTypeName}}.",
        "clearingAll": "Clearing all data...",
        "clearedAll": "All data has been cleared. You can load new files.",
        "clearAllError": "Error while clearing data.",
        "outdatedShcCleared": "Outdated SHC vs Planogram data from a previous day has been cleared. Please upload today's files."
    },
    "autoRefresh": {
        "starting": "Starting auto-refresh of linked files...",
        "complete": "Auto-refresh complete. All linked files reloaded.",
        "cancelled": "Auto-refresh cancelled."
    }
  },
  "import": {
    "products": {
        "title": "1. Product Master Data",
        "description": "File with product information. Requires two header rows."
    },
    "goodsReceipts": {
        "title": "2. Goods Receipt (eGIN)",
        "description": "File with goods receipt information. Requires two header rows."
    },
    "openOrders": {
        "title": "3. Open Orders",
        "description": "File with open orders that have not yet arrived at the warehouse."
    },
    "sales": {
        "title": "4. Sales Data",
        "description": "File with historical sales data. Accepts .csv or .txt."
    },
     "shc": {
      "title": "SHC vs Planogram",
      "apiNotSupported": "File linking is not supported by your browser.",
      "shc": {
        "title": "Store Data (SHC)"
      },
      "planogram": {
        "title": "Planogram Export"
      },
      "orgStructure": {
        "title": "Organizational Structure"
      },
      "categoryRelation": {
        "title": "Category-Store Relation"
      }
    },
    "writeOffs": {
        "title": "Write-offs Report Data",
        "weekly": "Weekly Actuals (.csv)",
        "ytd": "YTD Actuals (.csv)",
        "targets": "Targets (.json)"
    },
    "status": {
        "updated": "Updated",
        "todayAt": "today at",
        "noData": "No data",
        "records": "records",
        "linkedTo": "Linked to",
        "noLinkedFile": "No linked file."
    },
    "buttons": {
        "selectFile": "Select file",
        "addFile": "Add File",
        "change": "Change",
        "reload": "Reload",
        "clear": "Clear Data"
    }
  },
  "dataPreview": {
      "tabs": {
          "products": "Products",
          "goodsReceipts": "Goods Receipt (eGIN)",
          "openOrders": "Open Orders",
          "sales": "Sales",
          "shc": "SHC Data",
          "planogram": "Planogram",
          "orgStructure": "Org Structure",
          "categoryRelation": "Category Relation",
          "writeOffsWeekly": "Write-Offs (Weekly)",
          "writeOffsYTD": "Write-Offs (YTD)"
      },
      "filters": {
          "warehouse": "Warehouse",
          "all": "All",
          "productId": "Product ID",
          "productIdPlaceholder": "e.g. 40006",
          "status": "Status",
          "apply": "Filter",
          "clear": "Clear"
      },
      "table": {
          "deliveries": "deliveries",
          "none": "None"
      },
      "pagination": {
          "records": "records",
          "previous": "Previous",
          "next": "Next",
          "page": "Page {{currentPage}} of {{totalPages}}"
      }
  },
  "placeholders": {
    "report": {
        "title": "Threat Report",
        "description": "Here will be a list of items with potential risk of write-off, sorted by urgency. This feature is under construction.",
        "accessDenied": "This feature is only available for HQ users."
    },
    "dashboard": {
        "title": "Dashboard",
        "description": "Main dashboard with key performance indicators (KPIs), charts, and warehouse status summary. This feature is under construction."
    }
  },
   "simulations": {
    "controls": {
      "title": "Simulation Control Panel",
      "warehouse": "Warehouse",
      "selectWarehouse": "Select warehouse",
      "productId": "Product ID",
      "productIdPlaceholder": "Type to search for a product...",
      "run": "Run Simulation"
    },
    "details": {
      "title": "Product Details",
      "days": "days",
      "locked": "Locked"
    },
    "overrides": {
        "title": "Modify Shelf Life (RLZ)"
    },
    "results": {
      "title": "Simulation Results",
      "calculating": "Calculating simulation, this may take a moment...",
      "none": "None"
    },
    "kpi": {
      "totalWriteOffValue": "Total Write-Off Value",
      "daysOfStock": "Days of Stock",
      "avgDailySales": "Avg. Daily Sales",
      "nonCompliantReceipts": "Non-Compliant Receipts",
      "firstWriteOffDate": "First Write-Off Date",
      "aldValue": "ALD Value",
      "aldDescription": "Value of goods affected by ALD.",
      "salesAdjustUp": "Increase sales by 10%",
      "salesAdjustDown": "Decrease sales by 10%",
      "original": "Original",
      "salesResetTooltip": "Click to restore original value"
    },
    "manualDelivery": {
        "title": "Add Manual Delivery",
        "addedTitle": "Added Deliveries",
        "date": "Delivery Date",
        "quantity": "Quantity",
        "bestBeforeDate": "Best Before Date"
    },
    "initialStock": {
      "title": "Initial Stock Composition",
      "warning": "The initial stock on hand could not be fully matched with goods receipts. The simulation assumes this unmatched portion is the oldest stock and may be subject to earlier write-offs.",
      "deliveryDate": "Delivery Date",
      "bestBeforeDate": "Best Before Date",
      "daysForSale": "Days to Sell",
      "regulationBreached": "Breached (Y/N)",
      "quantity": "Quantity",
      "unknownBatch": "Unknown Batch",
      "legend": {
        "ald": "ALD Risk",
        "writeOff": "Write-Off Risk",
        "nonCompliant": "Non-Compliant Receipt",
        "manual": "Manual Delivery"
      }
    },
    "log": {
      "title": "Simulation Log",
      "date": "Date",
      "stockStart": "Start Stock",
      "sales": "Sales",
      "receipts": "Receipts",
      "writeOffs": "Write-Offs",
      "ald": "ALD",
      "stockEnd": "End Stock",
      "notes": "Notes"
    },
    "chart": {
      "title": "Stock Forecast (14 days)"
    },
    "buttons": {
        "add": "Add",
        "resetDefaults": "Reset",
        "showMore": "Show more",
        "showLess": "Show less",
        "rerun": "Rerun",
        "showChart": "Show Chart",
        "hideChart": "Hide Chart"
    },
    "watchlist": {
        "viewing": "Viewing item {{current}} of {{total}}"
    }
  },
  "settings": {
    "title": "Settings",
    "dataSources": {
        "title": "Data Sources",
        "description": "Link your local data files to enable quick reloading. The application will remember your selection.",
        "dataType": "Data Type",
        "linkedFile": "Linked File",
        "actions": "Actions",
        "notLinked": "Not linked",
        "linkFile": "Link File",
        "clearLink": "Clear Link",
        "linkSuccess": "File linked successfully.",
        "linkError": "Error linking file.",
        "permissionDenied": "Permission to read the file was denied.",
        "permissionNeeded": "Permission to read the file was not granted.",
        "reloadError": "Could not read the file. It may have been moved or deleted.",
        "linkClearedSuccess": "File link cleared.",
        "linkClearedError": "Error clearing file link.",
        "clearLinkConfirm": "Are you sure you want to clear this link? The underlying data will not be deleted."
    },
    "configManagement": {
        "title": "Configuration Management",
        "description": "Export your settings (like the RDC list) to a file, or import them on another device. This does not include linked files.",
        "exportButton": "Export Configuration",
        "importButton": "Import Configuration",
        "exportSuccess": "Configuration exported successfully.",
        "importSuccess": "Configuration imported successfully.",
        "importError": "Error importing configuration file."
    },
    "rdcManagement": {
        "title": "RDC Management",
        "description": "Add or remove Regional Distribution Centers (RDCs) from the list available at login.",
        "rdcId": "RDC ID",
        "rdcName": "RDC Name",
        "addRdc": "Add RDC",
        "deleteRdc": "Delete",
        "addSuccess": "RDC added successfully.",
        "deleteSuccess": "RDC deleted successfully.",
        "deleteConfirm": "Are you sure you want to delete this RDC?"
    },
    "dooManagement": {
        "title": "Director of Operations Management",
        "description": "Import a JSON file to define which Director of Operations is responsible for which RDCs.",
        "importButton": "Import DoO List (.json)",
        "clearButton": "Clear DoO List",
        "importSuccess": "DoO list imported successfully. Loaded {{count}} directors.",
        "importError": "Error importing DoO list.",
        "clearSuccess": "DoO list has been cleared.",
        "clearConfirm": "Are you sure you want to clear the Director of Operations list?"
    },
    "exclusionList": {
      "title": "Exclusion List Management",
      "description": "Import a list of product numbers to be excluded from 'Suspicious Statuses' calculations in the Status Report. These products will still be visible in the report but will be highlighted.",
      "importButton": "Import list (.txt)",
      "clearButton": "Clear list",
      "currentCount": "There are {{count}} items on the exclusion list.",
      "importSuccess": "Exclusion list imported successfully. Loaded {{count}} items.",
      "importError": "Error importing exclusion list.",
      "clearSuccess": "Exclusion list has been cleared.",
      "clearConfirm": "Are you sure you want to clear the entire exclusion list?"
    },
    "shcExclusionList": {
      "title": "SHC Store Exclusions",
      "description": "Import or export a list of store numbers to temporarily exclude from SHC report calculations. Excluded stores will be highlighted and not included in summary totals.",
      "importButton": "Import List (.txt)",
      "exportButton": "Export List",
      "clearButton": "Clear List",
      "currentCount": "There are {{count}} stores on the exclusion list.",
      "importSuccess": "SHC exclusion list imported. Loaded {{count}} stores.",
      "importError": "Error importing SHC exclusion list.",
      "clearSuccess": "SHC exclusion list has been cleared.",
      "clearConfirm": "Are you sure you want to clear the entire SHC exclusion list?"
    },
    "shcCompliance": {
      "title": "SHC Compliance Report Data",
      "description": "Import historical data files required to generate the SHC Compliance Report.",
      "baseline": {
        "title": "Baseline Data",
        "description": "Import a one-time JSON file with the initial discrepancy scores for each store at the beginning of the project.",
        "button": "Import Baseline (.json)",
        "downloadTemplate": "Download Template"
      },
      "previousWeek": {
        "title": "Previous Week Data",
        "description": "Import the JSON file with discrepancy scores from the previous week. This file can be generated from the compliance report itself.",
        "button": "Import Previous Week (.json)",
        "downloadTemplate": "Download Template"
      },
      "importSuccess": "Successfully imported and saved {{type}} data.",
      "importError": "Failed to import file. Ensure it is a valid JSON with the correct structure."
    },
    "watchlists": {
        "title": "Watchlists",
        "description": "Create and manage lists of products to monitor. (Feature under construction)"
    }
  },
  "loginModal": {
      "title": "Select Operating Mode",
      "hqButton": "Headquarters (HQ)",
      "rdcButton": "Warehouse (RDC)",
      "password": "Password",
      "selectRdc": "Select warehouse",
      "loginButton": "Login",
      "invalidPassword": "Password is incorrect."
  },
  "modals": {
    "refresh": {
        "title": "Automatic Data Refresh",
        "message": "Data will be reloaded in {{seconds}} seconds.",
        "cancel": "Cancel Refresh"
    },
    "idle": {
        "title": "Session expired due to inactivity",
        "continue": "Continue Session"
    }
  },
  "common": {
    "yesShort": "Y",
    "noShort": "N"
  },
  "dataType": {
    "products": "Master Data",
    "goodsReceipts": "Goods Receipts",
    "openOrders": "Open Orders",
    "sales": "Sales Data",
    "shc": "Store Data (SHC)",
    "planogram": "Planogram",
    "orgStructure": "Org Structure",
    "categoryRelation": "Category Relation",
    "writeOffsWeekly": "Write-Offs (Weekly)",
    "writeOffsYTD": "Write-Offs (YTD)",
    "writeOffsTargets": "Write-Offs (Targets)"
  },
  "threatReport": {
    "title": "Threat Report",
    "description": "Run a bulk simulation for products based on selected criteria to identify items with the highest write-off risk.",
    "controls": {
      "title": "Report Parameters",
      "warehouses": "Warehouses",
      "itemGroups": "Item Groups",
      "statuses": "Statuses",
      "runReport": "Run Report",
      "selectAll": "Select All",
      "deselectAll": "Deselect All",
      "runningTitle": "Generating Report...",
      "runningDescription": "Analyzing {{processed}} of {{total}} products. This may take a moment."
    },
    "results": {
      "title": "Report Results",
      "noResults": "No products match the selected criteria, or no threats were found.",
      "goToSimulation": "Analyze",
      "analyzeSelected": "Analyze Selected ({{count}})",
      "warehouseId": "Warehouse",
      "productId": "Product",
      "caseSize": "Case Size",
      "palletFactor": "Pallet Factor",
      "daysOfStock": "Days of Stock",
      "aldValue": "ALD Value",
      "avgDailySales": "Avg. Sales",
      "nonCompliantReceipts": "Non-Compliant Rec.",
      "writeOffValue": "Write-Off Value"
    }
  },
  "statusReport": {
    "title": "Status Consistency Report",
    "description": "Run a report to find products with inconsistent statuses across different warehouses. The report will only show products where a status inconsistency was detected.",
    "runReport": "Run Report",
    "runningTitle": "Generating Report...",
    "runningDescription": "Analyzing {{processed}} of {{total}} product groups.",
    "filters": {
      "title": "Filters",
      "productId": "Product ID",
      "dominantStatus": "Status",
      "excludeNoStock": "Exclude items with no stock",
      "showOnlyUndetermined": "Show only items without a dominant status",
      "includeConsistent": "Also show consistent items",
      "excludeWhenDominantIs": "Exclude when dominant status is:",
      "apply": "Apply Filters",
      "clear": "Clear Filters",
      "all": "All",
      "pastedInfo": "Filtering by {{count}} pasted items"
    },
    "exclusionInfo": {
      "info": "Excluded items uploaded on {{date}} at {{time}}. Items loaded: {{count}}",
      "updateButton": "Update list"
    },
    "summary": {
      "title": "Report Summary",
      "warehouse": "Warehouse",
      "itemsChecked": "Items Checked",
      "suspiciousStatuses": "Suspicious Statuses",
      "excluded": "Excluded",
      "status8Items": "Items with status 8"
    },
    "statusTypes": {
      "dominant": "Dominant",
      "mostFrequent": "Most Frequent",
      "none": "Undetermined"
    },
    "results": {
      "title": "Inconsistent Products",
      "titleWithConsistent": "Results ({{count}}) incl. Consistent",
      "noResults": "No products with inconsistent statuses were found.",
      "productId": "Product ID",
      "productName": "Product Name",
      "caseSize": "Case Size",
      "dominantStatus": "Determined Status",
      "exportPdf": "Export to PDF"
    },
    "tooltips": {
      "excluded": "Excluded from analysis"
    },
    "pdf": {
      "summaryTitle": "Warehouse Summary",
      "inconsistentProductsTitle": "Inconsistent Products",
      "groupedByStatus": "Grouped by suspicious status: {{status}}",
      "exportOptionsTitle": "Export Options",
      "selectWarehouse": "Select warehouse to export",
      "allWarehouses": "All warehouses",
      "exportButton": "Export",
      "cancelButton": "Cancel",
      "reportForWarehouse": "Report for warehouse",
      "noInconsistencies": "No inconsistencies found for this warehouse in the current results.",
      "statusIn": "Status in",
      "generatedOn": "Generated on",
      "activeFilters": "Active Filters",
      "format": "Report Format",
      "summaryFormat": "Detailed Summary (by Warehouse)",
      "comparativeFormat": "Comparative Table (As on Screen)",
      "filterByStatus": "Filter by Suspicious Status",
      "allStatuses": "All Suspicious Statuses"
    }
  },
  "shcReport": {
    "description": "Run an analysis to verify the consistency of SHC data in the system with planogram data.",
    "status": {
      "readingFiles": "Reading files..."
    },
    "errors": {
      "allFilesRequired": "All 4 data sets must be imported and an RDC must be selected to run the analysis.",
      "fileReadError": "An error occurred while reading one of the linked files."
    },
     "validation": {
      "title": "Data Consistency Check",
      "message": "{{count}} stores found in Organizational Structure but are missing from today's SHC data.",
      "listHeader": "Missing Stores:",
      "continue": "Continue Anyway",
      "cancel": "Cancel"
    },
    "results": {
      "title": "Analysis Results",
      "excludedCount": "({{count}} excluded)",
      "placeholder": "Run the analysis to see the results here.",
      "mismatchesTitle": "Data Mismatches",
      "storeCountSummary": "Available stores in SHC Data: {{shcStoreCount}} / Total stores in RDC: {{orgStoreCount}}",
      "downloadAllPdf": "Download PDFs for available stores",
      "generateComplianceReport": "Generate Compliance Report"
    },
    "config": {
      "title": "Section Configuration",
      "description": "Select and reorder the sections to be included in the analysis. Drag and drop to change the order.",
      "save": "Save Configuration",
      "import": "Import",
      "export": "Export",
      "importSuccess": "Section configuration imported successfully.",
      "exportSuccess": "Section configuration exported successfully.",
      "importError": "Error importing section configuration.",
      "saved": "Configuration saved.",
      "unsaved": "You have unsaved changes.",
      "addNew": "Add all new sections",
      "removeStale": "Remove all stale sections",
      "new": "New",
      "stale": "Stale",
      "selectAll": "Select All",
      "deselectAll": "Deselect All",
      "activeSectionsSummary": "{{active}} active of {{total}} available",
      "refreshOrder": "Refresh order within section"
    },
    "rdcSelector": {
      "label": "Select RDC",
      "placeholder": "Select an RDC..."
    },
    "table": {
      "warehouse": "Warehouse",
      "hos": "Head of Sales",
      "am": "Area Manager",
      "store": "Store",
      "discrepancies": "Discrepancies",
      "avgPerStore": "Avg per Store",
      "itemNumber": "Item Number",
      "itemName": "Item Name",
      "planShc": "Plan SHC",
      "storeShc": "Store SHC",
      "diff": "Difference",
      "section": "Section",
      "itemGroup": "Item Group",
      "sectionWidth": "Section width",
      "excluded": "(Excluded from totals)",
      "tooltip": {
        "toggleExclusion": "Toggle Exclusion",
        "exportPdf": "Export Store to PDF"
      }
    },
    "complianceReport": {
      "title": "SHC Compliance Report",
      "exportPdf": "Download Compliance PDF",
      "exportSnapshot": "Export Current Week Snapshot",
      "printReport": "Print Report",
      "exportSnapshotSuccess": "Current week's data exported successfully.",
      "noData": "Cannot generate report. Please import baseline and previous week data in Settings.",
      "storeName": "Store Name",
      "currently": "Currently",
      "weekMinus1": "Week -1",
      "start": "Start",
      "change": "Change (curr/start)"
    }
  },
   "writeOffsReport": {
    "chooseWeek": "Choose week",
    "expandToDoO": "Expand to DoO",
    "expandToRdc": "Expand to RDC",
    "expandToHos": "Expand to HoS",
    "expandToAm": "Expand to AM",
    "collapseAll": "Collapse All",
    "sortByTurnover": "Sort by Turnover",
    "sortByDeviation": "Sort by Deviation"
  },
  "columns": {
    "product": {
      "warehouseId": "Warehouse",
      "dispoGroup": "Dispo Group",
      "itemGroup": "Item Group",
      "orderArea": "Order Area",
      "productId": "Product ID (Short)",
      "fullProductId": "Product ID (Full)",
      "name": "Name",
      "caseSize": "Pcs/Case",
      "cartonsPerLayer": "Cases/Layer",
      "duessFactor": "DD",
      "cartonsPerPallet": "Cases/Pallet",
      "shelfLifeAtReceiving": "W-DATE days",
      "shelfLifeAtStore": "S-DATE days",
      "customerShelfLife": "C-DATE days",
      "price": "Price",
      "status": "Status",
      "itemLocked": "Locked",
      "slotNr": "Slot",
      "unprocessedDeliveryQty": "Unproc. Deliv.",
      "supplierId": "Supplier ID",
      "supplierName": "Supplier Name",
      "stockOnHand": "Stock on Hand",
      "storeAllocationToday": "Alloc. Today",
      "storeAllocationTotal": "Alloc. Total",
      "promoDate": "Promo Date",
      "estimatedReceivings": "Est. Receipts"
    },
    "goodsReceipt": {
      "warehouseId": "Warehouse",
      "productId": "Product ID (Short)",
      "fullProductId": "Product ID (Full)",
      "name": "Name",
      "deliveryUnit": "Delivery Unit",
      "deliveryQtyUom": "Qty (UoM)",
      "caseSize": "Pcs/Case",
      "deliveryQtyPcs": "Qty (Pcs)",
      "poNr": "PO Nr.",
      "deliveryDate": "Delivery Date",
      "bestBeforeDate": "Best Before Date",
      "supplierId": "Supplier ID",
      "supplierName": "Supplier Name",
      "bolNr": "BOL Nr.",
      "deliveryNote": "Delivery Note",
      "intSupplierNr": "Int. Supplier Nr.",
      "intItemNr": "Int. Item Nr.",
      "caseGtin": "Case GTIN",
      "liaReference": "LIA Ref"
    },
    "openOrder": {
      "warehouseId": "Warehouse",
      "productId": "Product ID (Short)",
      "fullProductId": "Product ID (Full)",
      "name": "Name",
      "orderUnit": "Order Unit",
      "orderQtyUom": "Qty (UoM)",
      "caseSize": "Pcs/Case",
      "orderQtyPcs": "Qty (Pcs)",
      "poNr": "PO Nr.",
      "supplierId": "Supplier ID",
      "supplierName": "Supplier Name",
      "deliveryDate": "Planned Deliv. Date",
      "creationDate": "Creation Date",
      "deliveryLeadTime": "Lead Time (days)"
    },
    "sale": {
      "resaleDate": "Resale Date",
      "warehouseId": "Warehouse",
      "productId": "Product ID",
      "productName": "Product Name",
      "quantity": "Sold Quantity"
    },
    "shc": {
        "storeNumber": "Store Number",
        "itemNumber": "Item Number",
        "itemDescription": "Item Description",
        "piecesInBox": "Pieces/Box",
        "itemStatus": "Item Status",
        "itemGroup": "Item Group",
        "shelfCapacity": "Shelf Capacity",
        "shelfCapacityUnit": "SHC Unit"
    },
    "planogram": {
        "generalStoreArea": "General Store Area",
        "settingSpecificallyFor": "Setting Specifically For",
        "settingWidth": "Setting Width",
        "itemNumber": "Item Number",
        "itemName": "Item Name",
        "targetShc": "Target SHC",
        "facings": "Facings",
        "depth": "Depth"
    },
    "orgStructure": {
        "storeNumber": "Store Number",
        "storeName": "Store Name",
        "warehouseId": "Warehouse ID",
        "areaManager": "Area Manager",
        "headOfSales": "Head of Sales"
    },
    "categoryRelation": {
        "generalStoreArea": "General Store Area",
        "settingSpecificallyFor": "Setting Specifically For",
        "settingWidth": "Setting Width",
        "storeNumber": "Store Number"
    },
    "writeOffs": {
        "regionManagerStore": "All / DoO / RDC / HoS / AM / Store",
        "turnover": "Turnover",
        "writeOffsValue": "Write-offs Value",
        "writeOffsPercent": "Write-offs %",
        "writeOffsTotalValue": "Write-offs Total Value",
        "writeOffsTotalPercent": "Write-offs Total %",
        "discountsValue": "Discounts Value",
        "discountsPercent": "Discounts %",
        "damagesValue": "Damages Value",
        "damagesPercent": "Damages %",
        "targetPercent": "Target %",
        "deviation": "Deviation p.p."
    },
    "writeOffsActual": {
      "metricName": "Metric Name",
      "period": "Period",
      "storeNumber": "Store Number",
      "storeName": "Store Name",
      "itemGroupNumber": "Item Group Number",
      "itemGroupName": "Item Group Name",
      "value": "Value"
    }
  }
}
