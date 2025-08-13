
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
        "description": "Hier wird eine Liste der Produkte mit potenziellem Verlustrisiko angezeigt, sortiert nach Dringlichkeit. Diese Funktion ist in Entwicklung."
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
      "productIdPlaceholder": "Tippen, um Produkt zu suchen...",
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
      "totalWriteOffValue": "Gesamtabschreibungswert",
      "daysOfStock": "Lagerreichweite",
      "avgDailySales": "Ø tägl. Absatz",
      "nonCompliantReceipts": "Regelwidrige Eingänge",
      "firstWriteOffDate": "Erstes Abschreibungsdatum",
      "aldValue": "ALD-Wert",
      "aldDescription": "Wert der von ALD betroffenen Waren.",
      "salesAdjustUp": "Absatz um 10% erhöhen",
      "salesAdjustDown": "Absatz um 10% verringern",
      "original": "Original",
      "salesResetTooltip": "Klicken, um den Originalwert wiederherzustellen"
    },
     "manualDelivery": {
        "title": "Manuelle Lieferung hinzufügen",
        "addedTitle": "Hinzugefügte Lieferungen",
        "date": "Lieferdatum",
        "quantity": "Menge",
        "bestBeforeDate": "Mindesthaltbarkeitsdatum"
    },
    "initialStock": {
      "title": "Anfängliche Lagerzusammensetzung",
      "warning": "Der anfängliche Lagerbestand konnte nicht vollständig mit den Wareneingängen abgeglichen werden. Die Simulation geht davon aus, dass dieser nicht zugeordnete Teil der älteste Bestand ist und möglicherweise früher abgeschrieben wird.",
      "deliveryDate": "Lieferdatum",
      "bestBeforeDate": "Mindesthaltbarkeitsdatum",
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
      "sales": "Verkäufe",
      "receipts": "Eingänge",
      "writeOffs": "Abschreibungen",
      "ald": "ALD",
      "stockEnd": "Endbestand",
      "notes": "Notizen"
    },
    "chart": {
      "title": "Lagerbestandsprognose (14 Tage)"
    },
    "buttons": {
        "add": "Hinzufügen",
        "resetDefaults": "Zurücksetzen",
        "showMore": "Mehr anzeigen",
        "showLess": "Weniger anzeigen",
        "rerun": "Neu ausführen",
        "showChart": "Diagramm anzeigen",
        "hideChart": "Diagramm ausblenden"
    }
  },
  "settings": {
    "title": "Einstellungen",
    "dataSources": {
        "title": "Datenquellen",
        "description": "Verknüpfen Sie Ihre lokalen Datendateien, um sie schnell neu laden zu können. Die Anwendung merkt sich Ihre Auswahl.",
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
        "description": "Exportieren Sie Ihre Einstellungen (wie die RDC-Liste) in eine Datei oder importieren Sie sie auf einem anderen Gerät. Dies schließt verknüpfte Dateien nicht ein.",
        "exportButton": "Konfiguration exportieren",
        "importButton": "Konfiguration importieren",
        "exportSuccess": "Konfiguration erfolgreich exportiert.",
        "importSuccess": "Konfiguration erfolgreich importiert.",
        "importError": "Fehler beim Import der Konfigurationsdatei."
    },
    "rdcManagement": {
        "title": "RDC-Verwaltung",
        "description": "Fügen Sie regionale Verteilzentren (RDCs) zur Anmeldeliste hinzu oder entfernen Sie sie.",
        "rdcId": "RDC-ID",
        "rdcName": "RDC-Name",
        "addRdc": "RDC hinzufügen",
        "deleteRdc": "Löschen",
        "addSuccess": "RDC erfolgreich hinzugefügt.",
        "deleteSuccess": "RDC erfolgreich gelöscht.",
        "deleteConfirm": "Sind Sie sicher, dass Sie dieses RDC löschen möchten?"
    },
    "watchlists": {
        "title": "Beobachtungslisten",
        "description": "Erstellen und verwalten Sie Listen von Produkten zur Überwachung. (Funktion in Entwicklung)"
    }
  },
  "loginModal": {
      "title": "Betriebsmodus auswählen",
      "hqButton": "Zentrale (HQ)",
      "rdcButton": "Lager (RDC)",
      "password": "Passwort",
      "selectRdc": "Lager auswählen",
      "loginButton": "Anmelden",
      "invalidPassword": "Das Passwort ist falsch."
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
  "columns": {
    "product": {
        "warehouseId": "Lager",
        "dispoGroup": "Dispo-Gruppe",
        "itemGroup": "Art.-Gruppe",
        "orderArea": "Bestellbereich",
        "productId": "Art.-Nr. (Kurz)",
        "fullProductId": "Art.-Nr. (Lang)",
        "name": "Name",
        "caseSize": "Stk./Karton",
        "cartonsPerLayer": "Kartons/Lage",
        "duessFactor": "DD",
        "cartonsPerPallet": "Kartons/Palette",
        "shelfLifeAtReceiving": "W-DATE Tage",
        "shelfLifeAtStore": "S-DATE Tage",
        "customerShelfLife": "C-DATE Tage",
        "price": "Preis",
        "status": "Status",
        "itemLocked": "Gesperrt",
        "slotNr": "Slot",
        "unprocessedDeliveryQty": "Unbearb. Menge",
        "supplierId": "Lieferant-ID",
        "supplierName": "Lieferant-Name",
        "stockOnHand": "Lagerbestand",
        "storeAllocationToday": "Zuteilung Heute",
        "storeAllocationTotal": "Zuteilung Gesamt",
        "promoDate": "Aktionsdatum",
        "estimatedReceivings": "Erw. Eingänge"
    },
    "goodsReceipt": {
        "warehouseId": "Lager",
        "productId": "Art.-Nr. (Kurz)",
        "fullProductId": "Art.-Nr. (Lang)",
        "name": "Name",
        "deliveryUnit": "Liefereinheit",
        "deliveryQtyUom": "Menge (ME)",
        "caseSize": "Stk./Karton",
        "deliveryQtyPcs": "Menge (Stk.)",
        "poNr": "Bestell-Nr.",
        "deliveryDate": "Lieferdatum",
        "bestBeforeDate": "MHD",
        "supplierId": "Lieferant-ID",
        "supplierName": "Lieferant-Name",
        "bolNr": "BOL-Nr.",
        "deliveryNote": "Lieferschein",
        "intSupplierNr": "Int. Lieferant-Nr.",
        "intItemNr": "Int. Artikel-Nr.",
        "caseGtin": "Karton GTIN",
        "liaReference": "LIA-Ref"
    },
    "openOrder": {
        "warehouseId": "Lager",
        "productId": "Art.-Nr. (Kurz)",
        "fullProductId": "Art.-Nr. (Lang)",
        "name": "Name",
        "orderUnit": "Bestelleinheit",
        "orderQtyUom": "Menge (ME)",
        "caseSize": "Stk./Karton",
        "orderQtyPcs": "Menge (Stk.)",
        "poNr": "Bestell-Nr.",
        "supplierId": "Lieferant-ID",
        "supplierName": "Lieferant-Name",
        "deliveryDate": "Erw. Lieferdatum",
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
