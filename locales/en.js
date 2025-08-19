export default {
  "header": {
    "title": "OMS",
    "session": {
        "mode": "Mode",
        "logout": "Logout"
    }
  },
  "sidebar": {
    "import": "Data Import",
    "dataPreview": "Data Preview",
    "threatReport": "Threat Report",
    "statusReport": "Status Report",
    "dashboard": "Dashboard",
    "simulations": "Simulations",
    "settings": "Settings"
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
        "clearedAll": "All data has been cleared. You can now load new files.",
        "clearAllError": "Error while clearing data."
    }
  },
  "import": {
    "products": {
        "title": "1. Master Data for Products",
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
        "linkedTo": "Linked to"
    },
    "buttons": {
        "selectFile": "Select file",
        "change": "Change",
        "reload": "Reload",
        "clear": "Clear"
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
          "productId": "Product No.",
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
        "description": "A list of products with potential risk of loss will be here, sorted by urgency. This feature is under construction.",
        "accessDenied": "This feature is only available for HQ users."
    },
    "dashboard": {
        "title": "Dashboard",
        "description": "The main dashboard with key performance indicators (KPIs), charts, and a summary of the warehouse status. This feature is under construction."
    }
  },
  "simulations": {
    "controls": {
      "title": "Simulation Controls",
      "warehouse": "Warehouse",
      "selectWarehouse": "Select a warehouse",
      "productId": "Product No.",
      "productIdPlaceholder": "Type to search for product...",
      "run": "Run Simulation"
    },
    "details": {
      "title": "Product Details",
      "days": "days",
      "locked": "Locked"
    },
    "overrides": {
        "title": "RLZ (Shelf Life) Overrides"
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
      "warning": "Initial stock on hand could not be fully matched with goods receipts. The simulation assumes this unmatched portion is the oldest stock and may be subject to earlier write-offs.",
      "deliveryDate": "Delivery Date",
      "bestBeforeDate": "Best Before Date",
      "daysForSale": "Days For Sale",
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
      "stockStart": "Stock Start",
      "sales": "Sales",
      "receipts": "Receipts",
      "writeOffs": "Write-Offs",
      "ald": "ALD",
      "stockEnd": "Stock End",
      "notes": "Notes"
    },
    "chart": {
      "title": "Stock Level Forecast (14 days)"
    },
    "buttons": {
        "add": "Add",
        "resetDefaults": "Reset to Defaults",
        "showMore": "Show More",
        "showLess": "Show Less",
        "rerun": "Rerun Simulation",
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
        "description": "Link your local data files for quick reloading. The application will remember your selection across sessions.",
        "dataType": "Data Type",
        "linkedFile": "Linked File",
        "actions": "Actions",
        "notLinked": "Not linked",
        "linkFile": "Link File",
        "clearLink": "Clear",
        "linkSuccess": "File linked successfully.",
        "linkError": "Failed to link file.",
        "permissionDenied": "Permission to read the file was denied.",
        "permissionNeeded": "Permission to read the file was not granted.",
        "reloadError": "Could not read the file. It may have been moved or deleted."
    },
    "configManagement": {
        "title": "Configuration Management",
        "description": "Export your settings (like the RDC list) to a file, or import them on another device. This does not include linked files.",
        "exportButton": "Export Configuration",
        "importButton": "Import Configuration",
        "exportSuccess": "Configuration exported successfully.",
        "importSuccess": "Configuration imported successfully.",
        "importError": "Failed to import configuration file."
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
      "description": "Import a list of product numbers to be excluded from the 'Suspicious Statuses' calculations in the Status Report. The products will still be visible in the report but highlighted.",
      "importButton": "Import List (.txt)",
      "clearButton": "Clear List",
      "currentCount": "There are {{count}} items on the exclusion list.",
      "importSuccess": "Exclusion list imported successfully. {{count}} items loaded.",
      "importError": "Failed to import exclusion list.",
      "clearSuccess": "Exclusion list cleared.",
      "clearConfirm": "Are you sure you want to clear the entire exclusion list?"
    },
    "watchlists": {
        "title": "Watchlists",
        "description": "Create and manage lists of products to monitor. (Feature under construction)"
    }
  },
  "loginModal": {
      "title": "Select Operating Mode",
      "hqButton": "Central (HQ)",
      "rdcButton": "Warehouse (RDC)",
      "password": "Password",
      "selectRdc": "Select Warehouse",
      "loginButton": "Login",
      "invalidPassword": "Password is incorrect."
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
    "description": "Run a bulk simulation on products based on selected criteria to identify items with the highest risk of write-offs.",
    "controls": {
      "title": "Report Parameters",
      "warehouses": "Warehouses",
      "itemGroups": "Item Groups",
      "statuses": "Statuses",
      "runReport": "Run Report",
      "selectAll": "Select All",
      "deselectAll": "Deselect All",
      "runningTitle": "Generating Report...",
      "runningDescription": "Analyzing {{processed}} of {{total}} products. This may take some time."
    },
    "results": {
      "title": "Report Results",
      "noResults": "No products match the selected criteria, or no risks were found.",
      "goToSimulation": "Analyze",
      "analyzeSelected": "Analyze Selected ({{count}})",
      "warehouseId": "WH",
      "productId": "Product",
      "caseSize": "Case Size",
      "palletFactor": "Pallet Factor",
      "daysOfStock": "DoS (RW)",
      "aldValue": "ALD Value",
      "avgDailySales": "Avg. Sales",
      "nonCompliantReceipts": "Non-Compl. Rec.",
      "writeOffValue": "Write-Off Value"
    }
  },
  "statusReport": {
    "title": "Status Consistency Report",
    "description": "Run a report to find products with inconsistent statuses across different warehouses. The report will only show products where a status mismatch is detected.",
    "runReport": "Run Report",
    "runningTitle": "Generating Report...",
    "runningDescription": "Analyzing {{processed}} of {{total}} product groups.",
    "filters": {
      "title": "Filters",
      "productId": "Product No.",
      "dominantStatus": "Status",
      "excludeNoStock": "Exclude items with no stock",
      "showOnlyUndetermined": "Show only items without dominant status",
      "includeConsistent": "Include consistent items",
      "excludeWhenDominantIs": "Exclude when dominant status is:",
      "apply": "Apply Filters",
      "clear": "Clear Filters",
      "all": "All",
      "pastedInfo": "Filtering by {{count}} pasted items"
    },
    "exclusionInfo": {
        "info": "Excluded items uploaded on {{date}} at {{time}}. Items loaded: {{count}}",
        "updateButton": "Update List"
    },
    "summary": {
      "title": "Report Summary",
      "warehouse": "Warehouse",
      "itemsChecked": "Items Checked",
      "suspiciousStatuses": "Suspicious Statuses",
      "status8Items": "Status 8 Items"
    },
    "statusTypes": {
      "dominant": "Dominant",
      "mostFrequent": "Most Frequent",
      "none": "Undetermined"
    },
    "results": {
      "title": "Inconsistent Products",
      "titleWithConsistent": "Results ({{count}}) incl. Consistent Items",
      "noResults": "No products with inconsistent statuses were found.",
      "productId": "Product No.",
      "productName": "Product Name",
      "caseSize": "Pcs/Case",
      "dominantStatus": "Determined Status",
      "exportPdf": "Export to PDF"
    },
    "tooltips": {
      "excluded": "Excluded from analysis"
    },
    "pdf": {
      "summaryTitle": "Summary per Warehouse",
      "inconsistentProductsTitle": "Inconsistent Products",
      "groupedByStatus": "Grouped by Suspicious Status: {{status}}",
      "exportOptionsTitle": "Export Options",
      "selectWarehouse": "Select Warehouse for Export",
      "allWarehouses": "All Warehouses",
      "exportButton": "Export",
      "cancelButton": "Cancel",
      "reportForWarehouse": "Report for Warehouse",
      "noInconsistencies": "No inconsistencies found for this warehouse in the current filtered results.",
      "statusIn": "Status in"
    }
  },
  "columns": {
    "product": {
      "warehouseId": "Warehouse",
      "dispoGroup": "Dispo Group",
      "itemGroup": "Item Group",
      "orderArea": "Order Area",
      "productId": "Product No. (Short)",
      "fullProductId": "Product No. (Full)",
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
      "unprocessedDeliveryQty": "Unproc. Qty",
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
      "productId": "Product No. (Short)",
      "fullProductId": "Product No. (Full)",
      "name": "Name",
      "deliveryUnit": "Delivery Unit",
      "deliveryQtyUom": "Qty (UoM)",
      "caseSize": "Pcs/Case",
      "deliveryQtyPcs": "Qty (Pcs)",
      "poNr": "PO No.",
      "deliveryDate": "Delivery Date",
      "bestBeforeDate": "Best Before Date",
      "supplierId": "Supplier ID",
      "supplierName": "Supplier Name",
      "bolNr": "BOL No.",
      "deliveryNote": "Delivery Note",
      "intSupplierNr": "Int. Supplier No.",
      "intItemNr": "Int. Item No.",
      "caseGtin": "Case GTIN",
      "liaReference": "LIA Ref"
    },
    "openOrder": {
      "warehouseId": "Warehouse",
      "productId": "Product No. (Short)",
      "fullProductId": "Product No. (Full)",
      "name": "Name",
      "orderUnit": "Order Unit",
      "orderQtyUom": "Qty (UoM)",
      "caseSize": "Pcs/Case",
      "orderQtyPcs": "Qty (Pcs)",
      "poNr": "PO No.",
      "supplierId": "Supplier ID",
      "supplierName": "Supplier Name",
      "deliveryDate": "Est. Delivery Date",
      "creationDate": "Creation Date",
      "deliveryLeadTime": "Lead Time (days)"
    },
    "sale": {
      "resaleDate": "Resale Date",
      "warehouseId": "Warehouse",
      "productId": "Product No.",
      "productName": "Product Name",
      "quantity": "Quantity Sold"
    }
  }
}
