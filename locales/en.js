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
        "parseError": "Critical error while parsing file: {{dataTypeName}}."
    },
    "clear": {
        "clearing": "Clearing data: {{dataTypeName}}...",
        "cleared": "Data '{{dataTypeName}}' has been cleared.",
        "clearError": "Error while clearing data: {{dataTypeName}}.",
        "clearingAll": "Clearing all data...",
        "clearedAll": "All data has been cleared. You can load new files.",
        "clearAllError": "Error while clearing data."
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
          "sales": "Sales"
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
    "sales": "Sales Data"
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
    }
  }
}
