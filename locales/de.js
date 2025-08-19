export default {
  "header": {
    "title": "OMS",
    "session": {
        "mode": "Modus",
        "logout": "Abmelden"
    }
  },
  "sidebar": {
    "import": "Datenimport",
    "dataPreview": "Datenvorschau",
    "threatReport": "Risikobericht",
    "statusReport": "Statusbericht",
    "dashboard": "Dashboard",
    "simulations": "Simulationen",
    "settings": "Einstellungen"
  },
  "actions": {
    "runAnalysis": "Analyse starten",
    "clearAll": "Alle Daten löschen"
  },
  "status": {
    "checkingDb": "Lokale Datenbank wird geprüft...",
    "dbOk": "Daten gefunden. Bereit zur Analyse.",
    "dbEmpty": "Wählen Sie Datendateien, um zu beginnen.",
    "dbError": "Fehler beim Prüfen der Datenbank.",
    "close": "Benachrichtigung schließen",
    "import": {
        "preparing": "Vorbereitung für den Import: {{dataTypeName}}...",
        "clearError": "Fehler beim Löschen der Datenbank.",
        "starting": "Dateiimport wird gestartet: {{dataTypeName}}...",
        "processing": "Datei wird verarbeitet... {{processedCount}} Datensätze gespeichert.",
        "complete": "Import abgeschlossen. {{processedCount}} Datensätze gespeichert ({{dataTypeName}}).",
        "parseError": "Kritischer Fehler beim Parsen der Datei: {{dataTypeName}}."
    },
    "clear": {
        "clearing": "Daten werden gelöscht: {{dataTypeName}}...",
        "cleared": "Daten '{{dataTypeName}}' wurden gelöscht.",
        "clearError": "Fehler beim Löschen der Daten: {{dataTypeName}}.",
        "clearingAll": "Alle Daten werden gelöscht...",
        "clearedAll": "Alle Daten wurden gelöscht. Sie können jetzt neue Dateien laden.",
        "clearAllError": "Fehler beim Löschen der Daten."
    }
  },
  "import": {
    "products": {
        "title": "1. Artikelstammdaten",
        "description": "Datei mit Produktinformationen. Benötigt zwei Kopfzeilen."
    },
    "goodsReceipts": {
        "title": "2. Wareneingang (eGIN)",
        "description": "Datei mit Informationen zum Wareneingang. Benötigt zwei Kopfzeilen."
    },
    "openOrders": {
        "title": "3. Offene Bestellungen",
        "description": "Datei mit offenen Bestellungen, die noch nicht im Lager eingetroffen sind."
    },
    "sales": {
        "title": "4. Verkaufsdaten",
        "description": "Datei mit historischen Verkaufsdaten. Akzeptiert .csv oder .txt."
    },
    "status": {
        "updated": "Aktualisiert",
        "todayAt": "heute um",
        "noData": "Keine Daten",
        "records": "Datensätze",
        "linkedTo": "Verknüpft mit"
    },
    "buttons": {
        "selectFile": "Datei wählen",
        "change": "Ändern",
        "reload": "Neu laden",
        "clear": "Löschen"
    }
  },
  "dataPreview": {
      "tabs": {
          "products": "Produkte",
          "goodsReceipts": "Wareneingang (eGIN)",
          "openOrders": "Offene Bestellungen",
          "sales": "Verkäufe"
      },
      "filters": {
          "warehouse": "Lager",
          "all": "Alle",
          "productId": "Artikel-Nr.",
          "productIdPlaceholder": "z.B. 40006",
          "status": "Status",
          "apply": "Filtern",
          "clear": "Zurücksetzen"
      },
      "table": {
          "deliveries": "Lieferungen",
          "none": "Keine"
      },
      "pagination": {
          "records": "Datensätze",
          "previous": "Zurück",
          "next": "Weiter",
          "page": "Seite {{currentPage}} von {{totalPages}}"
      }
  },
  "placeholders": {
    "report": {
        "title": "Risikobericht",
        "description": "Hier wird eine Liste der Produkte mit potenziellem Verlustrisiko angezeigt, sortiert nach Dringlichkeit. Diese Funktion ist in Entwicklung.",
        "accessDenied": "Diese Funktion ist nur für HQ-Benutzer verfügbar."
    },
    "dashboard": {
        "title": "Dashboard",
        "description": "Das Haupt-Dashboard mit den wichtigsten Leistungsindikatoren (KPIs), Diagrammen und einer Zusammenfassung des Lagerstatus. Diese Funktion ist in Entwicklung."
    }
  },
  "simulations": {
    "controls": {
      "title": "Simulationssteuerung",
      "warehouse": "Lager",
      "selectWarehouse": "Lager auswählen",
      "productId": "Artikel-Nr.",
      "productIdPlaceholder": "Artikel suchen...",
      "run": "Simulation starten"
    },
    "details": {
      "title": "Produktdetails",
      "days": "Tage",
      "locked": "Gesperrt"
    },
    "overrides": {
        "title": "RLZ (Restlaufzeit) anpassen"
    },
    "results": {
      "title": "Simulationsergebnisse",
      "calculating": "Simulation wird berechnet, dies kann einen Moment dauern...",
      "none": "Keine"
    },
    "kpi": {
      "totalWriteOffValue": "Gesamtwert der Abschreibung",
      "daysOfStock": "Lagerreichweite (Tage)",
      "avgDailySales": "Ø Tägl. Verkauf",
      "nonCompliantReceipts": "Regelwidrige Eingänge",
      "firstWriteOffDate": "Erstes Abschr.-Datum",
      "aldValue": "ALD-Wert",
      "aldDescription": "Wert der vom ALD betroffenen Ware.",
      "salesAdjustUp": "Verkauf um 10% erhöhen",
      "salesAdjustDown": "Verkauf um 10% verringern",
      "original": "Original",
      "salesResetTooltip": "Klicken, um Originalwert wiederherzustellen"
    },
    "manualDelivery": {
        "title": "Manuelle Lieferung hinzufügen",
        "addedTitle": "Hinzugefügte Lieferungen",
        "date": "Lieferdatum",
        "quantity": "Menge",
        "bestBeforeDate": "Mindesthaltbarkeitsdatum"
    },
    "initialStock": {
      "title": "Zusammensetzung des Anfangsbestands",
      "warning": "Der Anfangsbestand konnte nicht vollständig mit den Wareneingängen abgeglichen werden. Die Simulation geht davon aus, dass dieser nicht zugeordnete Teil der älteste Bestand ist und früher abgeschrieben werden könnte.",
      "deliveryDate": "Lieferdatum",
      "bestBeforeDate": "MHD",
      "daysForSale": "Tage zum Verkauf",
      "regulationBreached": "Verstoß (J/N)",
      "quantity": "Menge",
      "unknownBatch": "Unbekannte Charge",
      "legend": {
        "ald": "ALD-Risiko",
        "writeOff": "Abschreibungsrisiko",
        "nonCompliant": "Regelwidriger Eingang",
        "manual": "Manuelle Lieferung"
      }
    },
    "log": {
      "title": "Simulationsprotokoll",
      "date": "Datum",
      "stockStart": "Anfangsbestand",
      "sales": "Verkauf",
      "receipts": "Eingänge",
      "writeOffs": "Abschreibungen",
      "ald": "ALD",
      "stockEnd": "Endbestand",
      "notes": "Notizen"
    },
    "chart": {
      "title": "Bestandsprognose (14 Tage)"
    },
    "buttons": {
        "add": "Hinzufügen",
        "resetDefaults": "Zurücksetzen",
        "showMore": "Mehr anzeigen",
        "showLess": "Weniger anzeigen",
        "rerun": "Neu starten",
        "showChart": "Diagramm anzeigen",
        "hideChart": "Diagramm ausblenden"
    },
    "watchlist": {
        "viewing": "Artikel {{current}} von {{total}} wird angezeigt"
    }
  },
  "settings": {
    "title": "Einstellungen",
    "dataSources": {
        "title": "Datenquellen",
        "description": "Verknüpfen Sie Ihre lokalen Datendateien für ein schnelles Neuladen. Die Anwendung merkt sich Ihre Auswahl.",
        "dataType": "Datentyp",
        "linkedFile": "Verknüpfte Datei",
        "actions": "Aktionen",
        "notLinked": "Nicht verknüpft",
        "linkFile": "Datei verknüpfen",
        "clearLink": "Löschen",
        "linkSuccess": "Datei erfolgreich verknüpft.",
        "linkError": "Fehler beim Verknüpfen der Datei.",
        "permissionDenied": "Berechtigung zum Lesen der Datei verweigert.",
        "permissionNeeded": "Berechtigung zum Lesen der Datei nicht erteilt.",
        "reloadError": "Datei konnte nicht gelesen werden. Sie wurde möglicherweise verschoben oder gelöscht."
    },
    "configManagement": {
        "title": "Konfigurationsverwaltung",
        "description": "Exportieren Sie Ihre Einstellungen (wie die RDC-Liste) in eine Datei oder importieren Sie sie auf einem anderen Gerät. Verknüpfte Dateien sind nicht enthalten.",
        "exportButton": "Konfiguration exportieren",
        "importButton": "Konfiguration importieren",
        "exportSuccess": "Konfiguration erfolgreich exportiert.",
        "importSuccess": "Konfiguration erfolgreich importiert.",
        "importError": "Fehler beim Importieren der Konfigurationsdatei."
    },
    "rdcManagement": {
        "title": "RDC-Verwaltung",
        "description": "Fügen Sie Regionale Distributionszentren (RDCs) zur Anmeldeliste hinzu oder entfernen Sie sie.",
        "rdcId": "RDC-ID",
        "rdcName": "RDC-Name",
        "addRdc": "RDC hinzufügen",
        "deleteRdc": "Löschen",
        "addSuccess": "RDC erfolgreich hinzugefügt.",
        "deleteSuccess": "RDC erfolgreich gelöscht.",
        "deleteConfirm": "Möchten Sie dieses RDC wirklich löschen?"
    },
    "watchlists": {
        "title": "Watchlists",
        "description": "Erstellen und verwalten Sie Produktlisten zur Überwachung. (Funktion in Entwicklung)"
    }
  },
  "loginModal": {
      "title": "Betriebsmodus auswählen",
      "hqButton": "Zentrale (HQ)",
      "rdcButton": "Lager (RDC)",
      "password": "Passwort",
      "selectRdc": "Lager auswählen",
      "loginButton": "Anmelden",
      "invalidPassword": "Passwort ist falsch."
  },
  "common": {
      "yesShort": "J",
      "noShort": "N"
  },
  "dataType": {
    "products": "Stammdaten",
    "goodsReceipts": "Wareneingänge",
    "openOrders": "Offene Bestellungen",
    "sales": "Verkaufsdaten"
  },
  "threatReport": {
    "title": "Risikobericht",
    "description": "Führen Sie eine Massensimulation für Produkte basierend auf ausgewählten Kriterien durch, um Artikel mit dem höchsten Abschreibungsrisiko zu identifizieren.",
    "controls": {
      "title": "Berichtsparameter",
      "warehouses": "Lager",
      "itemGroups": "Artikelgruppen",
      "statuses": "Status",
      "runReport": "Bericht erstellen",
      "selectAll": "Alle auswählen",
      "deselectAll": "Alle abwählen",
      "runningTitle": "Bericht wird erstellt...",
      "runningDescription": "Analysiere {{processed}} von {{total}} Produkten. Dies kann einen Moment dauern."
    },
    "results": {
      "title": "Berichtsergebnisse",
      "noResults": "Keine Produkte entsprechen den ausgewählten Kriterien, oder es wurden keine Risiken gefunden.",
      "goToSimulation": "Analysieren",
      "analyzeSelected": "Ausgewählte analysieren ({{count}})",
      "warehouseId": "Lager",
      "productId": "Artikel",
      "caseSize": "VE-Größe",
      "palletFactor": "Pal.-Faktor",
      "daysOfStock": "Reichweite",
      "aldValue": "ALD-Wert",
      "avgDailySales": "Ø Verkauf",
      "nonCompliantReceipts": "N-konf. Eing.",
      "writeOffValue": "Abschr.-Wert"
    }
  },
  "statusReport": {
    "title": "Status-Konsistenzbericht",
    "description": "Führen Sie einen Bericht aus, um Produkte mit inkonsistenten Status in verschiedenen Lagern zu finden. Der Bericht zeigt nur Produkte an, bei denen eine Statusabweichung festgestellt wurde.",
    "runReport": "Bericht erstellen",
    "runningTitle": "Bericht wird erstellt...",
    "runningDescription": "Analysiere {{processed}} von {{total}} Produktgruppen.",
     "filters": {
      "title": "Filter",
      "productId": "Artikel-Nr.",
      "dominantStatus": "Status",
      "excludeNoStock": "Artikel ohne Lagerbestand ausschließen",
      "showOnlyUndetermined": "Nur Artikel ohne dominanten Status anzeigen",
      "includeConsistent": "Konsistente Artikel einbeziehen",
      "excludeWhenDominantIs": "Ausschließen, wenn dominanter Status:",
      "apply": "Filter anwenden",
      "clear": "Filter löschen",
      "all": "Alle"
    },
    "summary": {
      "title": "Berichtszusammenfassung",
      "warehouse": "Lager",
      "itemsChecked": "Geprüfte Artikel",
      "suspiciousStatuses": "Verdächtige Status",
      "status8Items": "Artikel mit Status 8"
    },
    "statusTypes": {
      "dominant": "Dominant",
      "mostFrequent": "Häufigster",
      "none": "Unbestimmt"
    },
    "results": {
      "title": "Inkonsistente Produkte",
      "noResults": "Es wurden keine Produkte mit inkonsistenten Status gefunden.",
      "productId": "Artikel-Nr.",
      "productName": "Produktname",
      "caseSize": "VE-Größe",
      "dominantStatus": "Ermittelter Status",
      "exportPdf": "Als PDF exportieren"
    },
    "pdf": {
      "summaryTitle": "Zusammenfassung pro Lager",
      "inconsistentProductsTitle": "Inkonsistente Produkte",
      "groupedByStatus": "Gruppiert nach verdächtigem Status: {{status}}",
      "exportOptionsTitle": "Exportoptionen",
      "selectWarehouse": "Lager für den Export auswählen",
      "allWarehouses": "Alle Lager",
      "exportButton": "Exportieren",
      "cancelButton": "Abbrechen",
      "reportForWarehouse": "Bericht für Lager",
      "noInconsistencies": "Für dieses Lager wurden in den aktuellen gefilterten Ergebnissen keine Inkonsistenzen gefunden.",
      "statusIn": "Status in"
    }
  },
  "columns": {
    "product": {
      "warehouseId": "Lager",
      "dispoGroup": "Dispo-Gruppe",
      "itemGroup": "Art.-Gruppe",
      "orderArea": "Bestellber.",
      "productId": "Artikel-Nr. (Kurz)",
      "fullProductId": "Artikel-Nr. (Voll)",
      "name": "Name",
      "caseSize": "Stk./Karton",
      "cartonsPerLayer": "Kart./Lage",
      "duessFactor": "DD",
      "cartonsPerPallet": "Kart./Palette",
      "shelfLifeAtReceiving": "W-DATE Tage",
      "shelfLifeAtStore": "S-DATE Tage",
      "customerShelfLife": "C-DATE Tage",
      "price": "Preis",
      "status": "Status",
      "itemLocked": "Gesperrt",
      "slotNr": "Slot",
      "unprocessedDeliveryQty": "Unbearb. Menge",
      "supplierId": "Lieferanten-ID",
      "supplierName": "Lieferantenname",
      "stockOnHand": "Lagerbestand",
      "storeAllocationToday": "Heutige Zuordnung",
      "storeAllocationTotal": "Gesamtzuordnung",
      "promoDate": "Promo-Datum",
      "estimatedReceivings": "Erw. Eingänge"
    },
    "goodsReceipt": {
      "warehouseId": "Lager",
      "productId": "Artikel-Nr. (Kurz)",
      "fullProductId": "Artikel-Nr. (Voll)",
      "name": "Name",
      "deliveryUnit": "Liefereinheit",
      "deliveryQtyUom": "Menge (ME)",
      "caseSize": "Stk./Karton",
      "deliveryQtyPcs": "Menge (Stk.)",
      "poNr": "Bestell-Nr.",
      "deliveryDate": "Lieferdatum",
      "bestBeforeDate": "MHD",
      "supplierId": "Lieferanten-ID",
      "supplierName": "Lieferantenname",
      "bolNr": "BOL-Nr.",
      "deliveryNote": "Lieferschein",
      "intSupplierNr": "Int. Liefer.-Nr.",
      "intItemNr": "Int. Artikel-Nr.",
      "caseGtin": "Karton-GTIN",
      "liaReference": "LIA-Ref"
    },
    "openOrder": {
      "warehouseId": "Lager",
      "productId": "Artikel-Nr. (Kurz)",
      "fullProductId": "Artikel-Nr. (Voll)",
      "name": "Name",
      "orderUnit": "Bestelleinheit",
      "orderQtyUom": "Menge (ME)",
      "caseSize": "Stk./Karton",
      "orderQtyPcs": "Menge (Stk.)",
      "poNr": "Bestell-Nr.",
      "supplierId": "Lieferanten-ID",
      "supplierName": "Lieferantenname",
      "deliveryDate": "Gepl. Lieferdatum",
      "creationDate": "Erstelldatum",
      "deliveryLeadTime": "Vorlaufzeit (Tage)"
    },
    "sale": {
      "resaleDate": "Verkaufsdatum",
      "warehouseId": "Lager",
      "productId": "Artikel-Nr.",
      "productName": "Produktname",
      "quantity": "Verkaufte Menge"
    }
  }
}
