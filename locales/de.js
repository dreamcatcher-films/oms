export default {
  "header": {
    "title": "OMS",
    "session": {
        "mode": "Modus",
        "logout": "Abmelden"
    },
    "autoRefresh": {
        "title": "Auto-Aktualisierung",
        "interval": "Intervall",
        "minutes": "Min",
        "nextRefreshIn": "Nächste Aktualisierung in..."
    }
  },
  "sidebar": {
    "import": "Datenimport",
    "dataPreview": "Datenvorschau",
    "threatReport": "Risikobericht",
    "statusReport": "Statusbericht",
    "shcReport": "SHC-Bericht",
    "writeOffsReport": "Abschreibungsbericht",
    "dashboard": "Dashboard",
    "simulations": "Simulationen",
    "settings": "Einstellungen",
    "footer": {
        "version": "Version {{version}}"
    }
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
        "parseError": "Kritischer Fehler beim Parsen der Datei: {{dataTypeName}}.",
        "readingFile": "Datei {{dataTypeName}} wird in den Speicher gelesen...",
        "parsingExcel": "Excel-Daten werden verarbeitet..."
    },
    "clear": {
        "clearing": "Daten werden gelöscht: {{dataTypeName}}...",
        "cleared": "Daten '{{dataTypeName}}' wurden gelöscht.",
        "clearError": "Fehler beim Löschen der Daten: {{dataTypeName}}.",
        "clearingAll": "Alle Daten werden gelöscht...",
        "clearedAll": "Alle Daten wurden gelöscht. Sie können jetzt neue Dateien laden.",
        "clearAllError": "Fehler beim Löschen der Daten.",
        "outdatedShcCleared": "Veraltete SHC vs. Planogramm-Daten vom Vortag wurden gelöscht. Bitte laden Sie die heutigen Dateien hoch."
    },
     "autoRefresh": {
        "starting": "Automatische Aktualisierung der verknüpften Dateien wird gestartet...",
        "complete": "Automatische Aktualisierung abgeschlossen. Alle verknüpften Dateien neu geladen.",
        "cancelled": "Automatische Aktualisierung abgebrochen."
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
    "shc": {
      "title": "SHC vs. Planogramm",
      "apiNotSupported": "Dateiverknüpfung wird von Ihrem Browser nicht unterstützt.",
      "shc": {
        "title": "Filialdaten (SHC)"
      },
      "planogram": {
        "title": "Planogramm-Export"
      },
      "orgStructure": {
        "title": "Organisationsstruktur"
      },
      "categoryRelation": {
        "title": "Kategorie-Filial-Beziehung"
      }
    },
    "writeOffs": {
        "title": "Daten für Abschreibungsbericht",
        "weekly": "Ist-Daten Wöchentlich (.csv)",
        "ytd": "Ist-Daten Kumuliert (.csv)",
        "targets": "Plandaten (.json)"
    },
    "status": {
        "updated": "Aktualisiert",
        "todayAt": "heute um",
        "noData": "Keine Daten",
        "records": "Datensätze",
        "linkedTo": "Verknüpft mit",
        "noLinkedFile": "Keine Datei verknüpft."
    },
    "buttons": {
        "selectFile": "Datei wählen",
        "addFile": "Datei hinzufügen",
        "change": "Ändern",
        "reload": "Neu laden",
        "clear": "Daten löschen"
    }
  },
  "dataPreview": {
      "tabs": {
          "products": "Produkte",
          "goodsReceipts": "Wareneingang (eGIN)",
          "openOrders": "Offene Bestellungen",
          "sales": "Verkäufe",
          "shc": "SHC-Daten",
          "planogram": "Planogramm",
          "orgStructure": "Org-Struktur",
          "categoryRelation": "Kategorie-Beziehung",
          "writeOffsWeekly": "Abschreibungen (Wöchentlich)",
          "writeOffsYTD": "Abschreibungen (YTD)"
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
        "clearLink": "Verknüpfung löschen",
        "linkSuccess": "Datei erfolgreich verknüpft.",
        "linkError": "Fehler beim Verknüpfen der Datei.",
        "permissionDenied": "Berechtigung zum Lesen der Datei verweigert.",
        "permissionNeeded": "Berechtigung zum Lesen der Datei nicht erteilt.",
        "reloadError": "Datei konnte nicht gelesen werden. Sie wurde möglicherweise verschoben oder gelöscht.",
        "linkClearedSuccess": "Dateiverknüpfung gelöscht.",
        "linkClearedError": "Fehler beim Löschen der Dateiverknüpfung.",
        "clearLinkConfirm": "Möchten Sie diese Verknüpfung wirklich löschen? Die zugrunde liegenden Daten werden nicht gelöscht."
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
    "dooManagement": {
        "title": "Verwaltung der Directors of Operations",
        "description": "Importieren Sie eine JSON-Datei, um zu definieren, welcher Director of Operations für welche RDCs verantwortlich ist.",
        "importButton": "DoO-Liste importieren (.json)",
        "clearButton": "DoO-Liste löschen",
        "importSuccess": "DoO-Liste erfolgreich importiert. {{count}} Direktoren geladen.",
        "importError": "Fehler beim Importieren der DoO-Liste.",
        "clearSuccess": "DoO-Liste wurde gelöscht.",
        "clearConfirm": "Möchten Sie die Liste der Directors of Operations wirklich löschen?"
    },
    "exclusionList": {
      "title": "Ausschlusslisten-Verwaltung",
      "description": "Importieren Sie eine Liste von Artikelnummern, die von den Berechnungen der 'Verdächtigen Status' im Statusbericht ausgeschlossen werden sollen. Die Produkte werden im Bericht weiterhin sichtbar, aber hervorgehoben sein.",
      "importButton": "Liste importieren (.txt)",
      "clearButton": "Liste löschen",
      "currentCount": "Es befinden sich {{count}} Artikel auf der Ausschlussliste.",
      "importSuccess": "Ausschlussliste erfolgreich importiert. {{count}} Artikel geladen.",
      "importError": "Fehler beim Import der Ausschlussliste.",
      "clearSuccess": "Ausschlussliste gelöscht.",
      "clearConfirm": "Möchten Sie die gesamte Ausschlussliste wirklich löschen?"
    },
    "shcExclusionList": {
      "title": "SHC-Filialausschlussliste",
      "description": "Importieren oder exportieren Sie eine Liste von Filialnummern, um sie vorübergehend von den Berechnungen des SHC-Berichts auszuschließen. Ausgeschlossene Filialen werden hervorgehoben und nicht in den Summen berücksichtigt.",
      "importButton": "Liste importieren (.txt)",
      "exportButton": "Liste exportieren",
      "clearButton": "Liste löschen",
      "currentCount": "Es befinden sich {{count}} Filialen auf der Ausschlussliste.",
      "importSuccess": "SHC-Ausschlussliste importiert. {{count}} Filialen geladen.",
      "importError": "Fehler beim Import der SHC-Ausschlussliste.",
      "clearSuccess": "SHC-Ausschlussliste wurde gelöscht.",
      "clearConfirm": "Möchten Sie die gesamte SHC-Ausschlussliste wirklich löschen?"
    },
     "shcCompliance": {
      "title": "SHC-Konformitätsberichtsdaten",
      "description": "Importieren Sie historische Datendateien, die zur Erstellung des SHC-Konformitätsberichts erforderlich sind.",
      "baseline": {
        "title": "Basisdaten",
        "description": "Importieren Sie eine einmalige JSON-Datei mit den anfänglichen Abweichungswerten für jede Filiale zu Beginn des Projekts.",
        "button": "Basisdaten importieren (.json)",
        "downloadTemplate": "Vorlage herunterladen"
      },
      "previousWeek": {
        "title": "Daten der Vorwoche",
        "description": "Importieren Sie die JSON-Datei mit den Abweichungswerten aus der Vorwoche. Diese Datei kann aus dem Konformitätsbericht selbst generiert werden.",
        "button": "Vorwoche importieren (.json)",
        "downloadTemplate": "Vorlage herunterladen"
      },
      "importSuccess": "{{type}}-Daten erfolgreich importiert und gespeichert.",
      "importError": "Fehler beim Importieren der Datei. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei mit der richtigen Struktur handelt."
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
  "modals": {
    "refresh": {
        "title": "Automatische Datenaktualisierung",
        "message": "Die Daten werden in {{seconds}} Sekunden neu geladen.",
        "cancel": "Aktualisierung abbrechen"
    },
    "idle": {
        "title": "Sitzung wegen Inaktivität abgelaufen",
        "continue": "Sitzung fortsetzen"
    }
  },
  "common": {
    "yesShort": "J",
    "noShort": "N"
  },
  "dataType": {
    "products": "Stammdaten",
    "goodsReceipts": "Wareneingänge",
    "openOrders": "Offene Bestellungen",
    "sales": "Verkaufsdaten",
    "shc": "Filialdaten (SHC)",
    "planogram": "Planogramm",
    "orgStructure": "Organisationsstruktur",
    "categoryRelation": "Kategorie-Beziehung",
    "writeOffsWeekly": "Abschreibungen (Woche)",
    "writeOffsYTD": "Abschreibungen (YTD)",
    "writeOffsTargets": "Abschreibungen (Ziele)"
  },
  "threatReport": {
    "title": "Risikobericht",
    "description": "Führen Sie eine Massensimulation für Produkte basierend auf ausgewählten Kriterien durch, um Artikel mit dem höchsten Abschreibungsrisiko zu identifizieren.",
    "controls": {
      "title": "Berichtsparameter",
      "warehouses": "Lager",
      "itemGroups": "Warengruppen",
      "statuses": "Status",
      "runReport": "Bericht starten",
      "selectAll": "Alle auswählen",
      "deselectAll": "Alle abwählen",
      "runningTitle": "Bericht wird erstellt...",
      "runningDescription": "{{processed}} von {{total}} Produkten analysiert. Dies kann einen Moment dauern."
    },
    "results": {
      "title": "Berichtsergebnisse",
      "noResults": "Keine Produkte entsprechen den ausgewählten Kriterien oder es wurden keine Risiken gefunden.",
      "goToSimulation": "Analysieren",
      "analyzeSelected": "Ausgewählte analysieren ({{count}})",
      "warehouseId": "Lager",
      "productId": "Artikel",
      "caseSize": "VE-Größe",
      "palletFactor": "Pal.-Faktor",
      "daysOfStock": "Lagerreichweite",
      "aldValue": "ALD-Wert",
      "avgDailySales": "Ø Verkauf",
      "nonCompliantReceipts": "Regelw. Eingänge",
      "writeOffValue": "Abschr.-Wert"
    }
  },
  "statusReport": {
    "title": "Statuskonsistenzbericht",
    "description": "Führen Sie einen Bericht aus, um Produkte mit inkonsistenten Status in verschiedenen Lagern zu finden. Der Bericht zeigt nur Produkte an, bei denen eine Statusinkonsistenz festgestellt wurde.",
    "runReport": "Bericht starten",
    "runningTitle": "Bericht wird erstellt...",
    "runningDescription": "{{processed}} von {{total}} Produktgruppen werden analysiert.",
    "filters": {
      "title": "Filter",
      "productId": "Artikel-Nr.",
      "dominantStatus": "Status",
      "excludeNoStock": "Artikel ohne Bestand ausschließen",
      "showOnlyUndetermined": "Nur Artikel ohne dominanten Status anzeigen",
      "includeConsistent": "Auch konsistente Artikel anzeigen",
      "excludeWhenDominantIs": "Ausschließen, wenn dominanter Status:",
      "apply": "Filter anwenden",
      "clear": "Filter löschen",
      "all": "Alle",
      "pastedInfo": "Filterung nach {{count}} eingefügten Artikeln"
    },
    "exclusionInfo": {
      "info": "Ausgeschlossene Artikel hochgeladen am {{date}} um {{time}}. Geladene Artikel: {{count}}",
      "updateButton": "Liste aktualisieren"
    },
    "summary": {
      "title": "Berichtszusammenfassung",
      "warehouse": "Lager",
      "itemsChecked": "Geprüfte Artikel",
      "suspiciousStatuses": "Verdächtige Status",
      "excluded": "Ausgeschlossen",
      "status8Items": "Artikel mit Status 8"
    },
    "statusTypes": {
      "dominant": "Dominant",
      "mostFrequent": "Häufigster",
      "none": "Unbestimmt"
    },
    "results": {
      "title": "Inkonsistente Produkte",
      "titleWithConsistent": "Ergebnisse ({{count}}) inkl. konsistenter",
      "noResults": "Keine Produkte mit inkonsistenten Status gefunden.",
      "productId": "Artikel-Nr.",
      "productName": "Produktname",
      "caseSize": "VE-Größe",
      "dominantStatus": "Ermittelter Status",
      "exportPdf": "Als PDF exportieren"
    },
    "tooltips": {
      "excluded": "Von der Analyse ausgeschlossen"
    },
    "pdf": {
      "summaryTitle": "Lagerzusammenfassung",
      "inconsistentProductsTitle": "Inkonsistente Produkte",
      "groupedByStatus": "Gruppiert nach verdächtigem Status: {{status}}",
      "exportOptionsTitle": "Exportoptionen",
      "selectWarehouse": "Lager zum Exportieren auswählen",
      "allWarehouses": "Alle Lager",
      "exportButton": "Exportieren",
      "cancelButton": "Abbrechen",
      "reportForWarehouse": "Bericht für Lager",
      "noInconsistencies": "Für dieses Lager wurden in den aktuellen Ergebnissen keine Inkonsistenzen gefunden.",
      "statusIn": "Status in",
      "generatedOn": "Erstellt am",
      "activeFilters": "Aktive Filter",
      "format": "Berichtsformat",
      "summaryFormat": "Detaillierte Zusammenfassung (nach Lager)",
      "comparativeFormat": "Vergleichstabelle (wie auf dem Bildschirm)",
      "filterByStatus": "Nach verdächtigem Status filtern",
      "allStatuses": "Alle verdächtigen Status"
    }
  },
  "shcReport": {
    "description": "Führen Sie eine Analyse durch, um die Konsistenz der SHC-Daten im System mit den Planogrammdaten zu überprüfen.",
    "status": {
      "readingFiles": "Dateien werden gelesen..."
    },
    "errors": {
      "allFilesRequired": "Alle 4 Datensätze müssen importiert und ein RDC ausgewählt werden, um die Analyse zu starten.",
      "fileReadError": "Beim Lesen einer der verknüpften Dateien ist ein Fehler aufgetreten."
    },
     "validation": {
      "title": "Datenkonsistenzprüfung",
      "message": "{{count}} Filialen in der Organisationsstruktur gefunden, die in den heutigen SHC-Daten fehlen.",
      "listHeader": "Fehlende Filialen:",
      "continue": "Trotzdem fortfahren",
      "cancel": "Abbrechen"
    },
    "results": {
      "title": "Analyseergebnisse",
      "excludedCount": "({{count}} ausgeschlossen)",
      "placeholder": "Führen Sie die Analyse aus, um die Ergebnisse hier zu sehen.",
      "mismatchesTitle": "Dateninkonsistenzen",
      "storeCountSummary": "Verfügbare Filialen in SHC-Daten: {{shcStoreCount}} / Gesamtanzahl Filialen im RDC: {{orgStoreCount}}",
      "downloadAllPdf": "PDFs für verfügbare Filialen herunterladen",
      "generateComplianceReport": "Konformitätsbericht erstellen"
    },
    "config": {
      "title": "Bereichskonfiguration",
      "description": "Wählen und ordnen Sie die Bereiche an, die in die Analyse einbezogen werden sollen. Ziehen und ablegen, um die Reihenfolge zu ändern.",
      "save": "Konfiguration speichern",
      "import": "Importieren",
      "export": "Exportieren",
      "importSuccess": "Bereichskonfiguration erfolgreich importiert.",
      "exportSuccess": "Bereichskonfiguration erfolgreich exportiert.",
      "importError": "Fehler beim Importieren der Bereichskonfiguration.",
      "saved": "Konfiguration gespeichert.",
      "unsaved": "Sie haben nicht gespeicherte Änderungen.",
      "addNew": "Alle neuen Bereiche hinzufügen",
      "removeStale": "Alle veralteten Bereiche entfernen",
      "new": "Neu",
      "stale": "Veraltet",
      "selectAll": "Alle auswählen",
      "deselectAll": "Alle abwählen",
      "activeSectionsSummary": "{{active}} aktiv von {{total}} verfügbar",
      "refreshOrder": "Reihenfolge im Bereich aktualisieren"
    },
    "rdcSelector": {
      "label": "RDC auswählen",
      "placeholder": "RDC auswählen..."
    },
    "table": {
      "warehouse": "Lager",
      "hos": "Verkaufsleiter",
      "am": "Gebietsleiter",
      "store": "Filiale",
      "discrepancies": "Abweichungen",
      "avgPerStore": "Ø pro Filiale",
      "itemNumber": "Artikelnummer",
      "itemName": "Artikelname",
      "planShc": "Plan-SHC",
      "storeShc": "Filial-SHC",
      "diff": "Differenz",
      "section": "Bereich",
      "itemGroup": "Warengruppe",
      "sectionWidth": "Bereichsbreite",
      "excluded": "(Aus Summen ausgeschlossen)",
      "tooltip": {
        "toggleExclusion": "Ausschluss umschalten",
        "exportPdf": "Filiale als PDF exportieren"
      }
    },
    "complianceReport": {
      "title": "SHC-Konformitätsbericht",
      "exportPdf": "Konformitäts-PDF herunterladen",
      "exportSnapshot": "Daten der aktuellen Woche exportieren",
      "printReport": "Bericht drucken",
      "exportSnapshotSuccess": "Daten der aktuellen Woche erfolgreich exportiert.",
      "noData": "Bericht kann nicht erstellt werden. Bitte importieren Sie Basisdaten und Daten der Vorwoche in den Einstellungen.",
      "storeName": "Filialname",
      "currently": "Aktuell",
      "weekMinus1": "Woche -1",
      "start": "Start",
      "change": "Änderung (aktuell/start)"
    }
  },
  "writeOffsReport": {
    "chooseWeek": "Woche wählen",
    "expandToDoO": "Bis DoO erweitern",
    "expandToRdc": "Bis RDC erweitern",
    "expandToHos": "Bis VL erweitern",
    "expandToAm": "Bis GL erweitern",
    "collapseAll": "Alle einklappen",
    "sortByTurnover": "Nach Umsatz sortieren",
    "sortByDeviation": "Nach Abweichung sortieren"
  },
  "columns": {
    "product": {
      "warehouseId": "Lager",
      "dispoGroup": "Dispo-Gruppe",
      "itemGroup": "Warengr.",
      "orderArea": "Bestellber.",
      "productId": "Art.-Nr. (Kurz)",
      "fullProductId": "Art.-Nr. (Lang)",
      "name": "Name",
      "caseSize": "Stk./VE",
      "cartonsPerLayer": "VE/Lage",
      "duessFactor": "DD",
      "cartonsPerPallet": "VE/Palette",
      "shelfLifeAtReceiving": "W-DATE Tage",
      "shelfLifeAtStore": "S-DATE Tage",
      "customerShelfLife": "C-DATE Tage",
      "price": "Preis",
      "status": "Status",
      "itemLocked": "Gesperrt",
      "slotNr": "Slot",
      "unprocessedDeliveryQty": "Unverarb. Lief.",
      "supplierId": "Lief.-ID",
      "supplierName": "Lieferantenname",
      "stockOnHand": "Lagerbestand",
      "storeAllocationToday": "Zuteil. Heute",
      "storeAllocationTotal": "Zuteil. Gesamt",
      "promoDate": "Aktionsdatum",
      "estimatedReceivings": "Gesch. Eingänge"
    },
    "goodsReceipt": {
      "warehouseId": "Lager",
      "productId": "Art.-Nr. (Kurz)",
      "fullProductId": "Art.-Nr. (Lang)",
      "name": "Name",
      "deliveryUnit": "Liefereinheit",
      "deliveryQtyUom": "Menge (ME)",
      "caseSize": "Stk./VE",
      "deliveryQtyPcs": "Menge (Stk.)",
      "poNr": "Bestell-Nr.",
      "deliveryDate": "Lieferdatum",
      "bestBeforeDate": "MHD",
      "supplierId": "Lief.-ID",
      "supplierName": "Lieferantenname",
      "bolNr": "BOL-Nr.",
      "deliveryNote": "Lieferschein",
      "intSupplierNr": "Int. Lief.-Nr.",
      "intItemNr": "Int. Art.-Nr.",
      "caseGtin": "VE GTIN",
      "liaReference": "LIA-Ref."
    },
    "openOrder": {
      "warehouseId": "Lager",
      "productId": "Art.-Nr. (Kurz)",
      "fullProductId": "Art.-Nr. (Lang)",
      "name": "Name",
      "orderUnit": "Bestelleinheit",
      "orderQtyUom": "Menge (ME)",
      "caseSize": "Stk./VE",
      "orderQtyPcs": "Menge (Stk.)",
      "poNr": "Bestell-Nr.",
      "supplierId": "Lief.-ID",
      "supplierName": "Lieferantenname",
      "deliveryDate": "Gepl. Lief.-Datum",
      "creationDate": "Erstelldatum",
      "deliveryLeadTime": "Vorlaufzeit (Tage)"
    },
    "sale": {
      "resaleDate": "Verkaufsdatum",
      "warehouseId": "Lager",
      "productId": "Artikel-Nr.",
      "productName": "Produktname",
      "quantity": "Verkaufte Menge"
    },
    "shc": {
        "storeNumber": "Filialnummer",
        "itemNumber": "Artikelnummer",
        "itemDescription": "Artikelbeschreibung",
        "piecesInBox": "Stück pro Karton",
        "itemStatus": "Artikelstatus",
        "itemGroup": "Warengruppe",
        "shelfCapacity": "Regalkapazität (SHC)",
        "shelfCapacityUnit": "SHC-Einheit"
    },
    "planogram": {
        "generalStoreArea": "Allgemeiner Filialbereich",
        "settingSpecificallyFor": "Einstellung speziell für",
        "settingWidth": "Einstellungsbreite",
        "itemNumber": "Artikelnummer",
        "itemName": "Artikelname",
        "targetShc": "Ziel-SHC",
        "facings": "Facings",
        "depth": "Tiefe"
    },
    "orgStructure": {
        "storeNumber": "Filialnummer",
        "storeName": "Filialname",
        "warehouseId": "Lager-ID",
        "areaManager": "Gebietsleiter",
        "headOfSales": "Verkaufsleiter"
    },
    "categoryRelation": {
        "generalStoreArea": "Allgemeiner Filialbereich",
        "settingSpecificallyFor": "Einstellung speziell für",
        "settingWidth": "Einstellungsbreite",
        "storeNumber": "Filialnummer"
    },
    "writeOffs": {
        "regionManagerStore": "Alle / DoO / RDC / VL / GL / Filiale",
        "turnover": "Umsatz",
        "writeOffsValue": "Abschreibungswert",
        "writeOffsPercent": "Abschreibung %",
        "writeOffsTotalValue": "Abschr.-Wert Gesamt",
        "writeOffsTotalPercent": "Abschr. % Gesamt",
        "discountsValue": "Rabattwert",
        "discountsPercent": "Rabatt %",
        "damagesValue": "Schadenswert",
        "damagesPercent": "Schaden %",
        "targetPercent": "Ziel %",
        "deviation": "Abweichung p.p."
    },
     "writeOffsActual": {
      "metricName": "Metrikname",
      "period": "Zeitraum",
      "storeNumber": "Filialnummer",
      "storeName": "Filialname",
      "itemGroupNumber": "Warengr.-Nr.",
      "itemGroupName": "Warengr.-Name",
      "value": "Wert"
    }
  }
}
