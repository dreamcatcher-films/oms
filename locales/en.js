export default {
  "header": {
    "title": "OMS"
  },
  "sidebar": {
    "import": "Data Import",
    "dataPreview": "Data Preview",
    "threatReport": "Threat Report",
    "dashboard": "Dashboard",
    "simulations": "Simulations"
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
        "records": "records"
    },
    "buttons": {
        "selectFile": "Select file",
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
        "description": "A list of products with potential risk of loss will be here, sorted by urgency. This feature is under construction."
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
      "unknownBatch": "Unknown Batch"
    },
    "log": {
      "title": "Simulation Log",
      "date": "Date",
      "stockStart": "Stock Start",
      "sales": "Sales",
      "receipts": "Receipts",
      "writeOffs": "Write-Offs",
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
        "rerun": "Rerun Simulation"
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
