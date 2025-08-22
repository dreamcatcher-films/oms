export default {
  "header": {
    "title": "OMS",
     "session": {
        "mode": "Tryb",
        "logout": "Wyloguj"
    },
    "autoRefresh": {
        "title": "Auto-odświeżanie",
        "interval": "Interwał",
        "minutes": "min",
        "nextRefreshIn": "Następne odświeżenie za..."
    }
  },
  "sidebar": {
    "import": "Import Danych",
    "dataPreview": "Przeglądanie Danych",
    "threatReport": "Raport Zagrożeń",
    "statusReport": "Raport Statusów",
    "shcReport": "Raport SHC",
    "dashboard": "Dashboard",
    "simulations": "Symulacje",
    "settings": "Ustawienia",
    "footer": {
      "version": "Wersja {{version}}"
    }
  },
  "actions": {
    "runAnalysis": "Uruchom Analizę",
    "clearAll": "Wyczyść Wszystkie Dane"
  },
  "status": {
    "checkingDb": "Sprawdzanie lokalnej bazy danych...",
    "dbOk": "Dane gotowe do analizy.",
    "dbEmpty": "Wybierz pliki z danymi, aby rozpocząć.",
    "dbError": "Błąd podczas sprawdzania bazy danych.",
    "close": "Zamknij powiadomienie",
    "import": {
        "preparing": "Przygotowywanie do importu: {{dataTypeName}}...",
        "clearError": "Błąd podczas czyszczenia bazy danych.",
        "starting": "Rozpoczynanie importu pliku: {{dataTypeName}}...",
        "processing": "Przetwarzanie pliku... Zapisano {{processedCount}} rekordów.",
        "complete": "Import zakończony. Zapisano {{processedCount}} rekordów ({{dataTypeName}}).",
        "parseError": "Błąd krytyczny podczas parsowania pliku: {{dataTypeName}}.",
        "readingFile": "Wczytywanie pliku {{dataTypeName}} do pamięci...",
        "parsingExcel": "Przetwarzanie danych Excel..."
    },
    "clear": {
        "clearing": "Usuwanie danych: {{dataTypeName}}...",
        "cleared": "Dane '{{dataTypeName}}' zostały usunięte.",
        "clearError": "Błąd podczas usuwania danych: {{dataTypeName}}.",
        "clearingAll": "Usuwanie wszystkich danych...",
        "clearedAll": "Wszystkie dane zostały usunięte. Możesz załadować nowe pliki.",
        "clearAllError": "Błąd podczas usuwania danych.",
        "outdatedShcCleared": "Nieaktualne dane SHC vs Planogram z poprzedniego dnia zostały wyczyszczone. Proszę załadować dzisiejsze pliki."
    },
    "autoRefresh": {
        "starting": "Rozpoczynanie automatycznego odświeżania połączonych plików...",
        "complete": "Automatyczne odświeżanie zakończone. Wszystkie pliki załadowano ponownie.",
        "cancelled": "Automatyczne odświeżanie anulowane."
    }
  },
  "import": {
    "products": {
        "title": "1. Dane Podstawowe Artykułów",
        "description": "Plik z informacjami o produktach. Wymaga dwóch wierszy nagłówka."
    },
    "goodsReceipts": {
        "title": "2. Przyjęcie Towaru (eGIN)",
        "description": "Plik z informacjami o przyjęciach towaru. Wymaga dwóch wierszy nagłówka."
    },
    "openOrders": {
        "title": "3. Otwarte Zamówienia",
        "description": "Plik z otwartymi zamówieniami, które nie dotarły jeszcze do magazynu."
    },
    "sales": {
        "title": "4. Dane o Odsprzedaży",
        "description": "Plik z historycznymi danymi o odsprzedaży. Akceptuje .csv lub .txt."
    },
    "shc": {
      "title": "SHC vs Planogram",
      "apiNotSupported": "Łączenie plików nie jest wspierane przez Twoją przeglądarkę.",
      "shc": {
        "title": "Dane ze Sklepów (SHC)"
      },
      "planogram": {
        "title": "Export z Planogramu"
      },
      "orgStructure": {
        "title": "Struktura Organizacyjna"
      },
      "categoryRelation": {
        "title": "Relacja Kategoria-Sklep"
      }
    },
    "status": {
        "updated": "Zaktualizowano",
        "todayAt": "dzisiaj o",
        "noData": "Brak danych",
        "records": "rekordów",
        "linkedTo": "Połączono z",
        "noLinkedFile": "Brak połączonego pliku."
    },
    "buttons": {
        "selectFile": "Wybierz plik",
        "addFile": "Dodaj plik",
        "change": "Zmień",
        "reload": "Załaduj ponownie",
        "clear": "Wyczyść Dane"
    }
  },
  "dataPreview": {
      "tabs": {
          "products": "Produkty",
          "goodsReceipts": "Przyjęcie Towaru (eGIN)",
          "openOrders": "Otwarte Zamówienia",
          "sales": "Odsprzedaże",
          "shc": "Dane SHC",
          "planogram": "Planogram",
          "orgStructure": "Struktura Org.",
          "categoryRelation": "Relacje Kategorii"
      },
      "filters": {
          "warehouse": "Magazyn",
          "all": "Wszystkie",
          "productId": "Nr artykułu",
          "productIdPlaceholder": "np. 40006",
          "status": "Status",
          "apply": "Filtruj",
          "clear": "Wyczyść"
      },
      "table": {
          "deliveries": "dostaw",
          "none": "Brak"
      },
      "pagination": {
          "records": "rekordów",
          "previous": "Poprzednia",
          "next": "Następna",
          "page": "Strona {{currentPage}} z {{totalPages}}"
      }
  },
  "placeholders": {
    "report": {
        "title": "Raport Zagrożeń",
        "description": "Tutaj znajdzie się lista artykułów z potencjalnym ryzykiem strat, posortowana według pilności. Ta funkcjonalność jest w budowie.",
        "accessDenied": "Ta funkcjonalność jest dostępna tylko dla użytkowników Centrali (HQ)."
    },
    "dashboard": {
        "title": "Dashboard",
        "description": "Główny pulpit z kluczowymi wskaźnikami (KPI), wykresami i podsumowaniem stanu magazynu. Ta funkcjonalność jest w budowie."
    }
  },
   "simulations": {
    "controls": {
      "title": "Panel Sterowania Symulacją",
      "warehouse": "Magazyn",
      "selectWarehouse": "Wybierz magazyn",
      "productId": "Nr artykułu",
      "productIdPlaceholder": "Wpisz, aby wyszukać produkt...",
      "run": "Uruchom Symulację"
    },
    "details": {
      "title": "Szczegóły Produktu",
      "days": "dni",
      "locked": "Zablokowany"
    },
    "overrides": {
        "title": "Modyfikacja RLZ (Restlaufzeit)"
    },
    "results": {
      "title": "Wyniki Symulacji",
      "calculating": "Obliczanie symulacji, to może chwilę potrwać...",
      "none": "Brak"
    },
    "kpi": {
      "totalWriteOffValue": "Łączna Wartość Odpisu",
      "daysOfStock": "Dni Zapasu",
      "avgDailySales": "Śr. Sprzedaż Dzienna",
      "nonCompliantReceipts": "Niezgodne Przyjęcia",
      "firstWriteOffDate": "Data Pierwszego Odpisu",
      "aldValue": "Wartość ALD",
      "aldDescription": "Wartość towaru, który jest dotknięty ALD.",
      "salesAdjustUp": "Zwiększ sprzedaż o 10%",
      "salesAdjustDown": "Zmniejsz sprzedaż o 10%",
      "original": "Oryginalna",
      "salesResetTooltip": "Kliknij, aby przywrócić oryginalną wartość"
    },
    "manualDelivery": {
        "title": "Dodaj Ręczną Dostawę",
        "addedTitle": "Dodane Dostawy",
        "date": "Data Dostawy",
        "quantity": "Ilość",
        "bestBeforeDate": "Data Przydatności"
    },
    "initialStock": {
      "title": "Skład Początkowego Stanu Magazynowego",
      "warning": "Początkowy stan magazynowy nie mógł być w pełni dopasowany do przyjęć towaru. Symulacja zakłada, że ta niedopasowana część jest najstarszym towarem i może podlegać wcześniejszym odpisom.",
      "deliveryDate": "Data Dostawy",
      "bestBeforeDate": "Data Przydatności",
      "daysForSale": "Dni na sprzedaż",
      "regulationBreached": "Naruszenie (T/N)",
      "quantity": "Ilość",
      "unknownBatch": "Nieznana partia",
      "legend": {
        "ald": "Ryzyko ALD",
        "writeOff": "Ryzyko odpisu",
        "nonCompliant": "Niezgodne przyjęcie",
        "manual": "Dostawa ręczna"
      }
    },
    "log": {
      "title": "Dziennik Symulacji",
      "date": "Data",
      "stockStart": "Stan początkowy",
      "sales": "Sprzedaż",
      "receipts": "Przyjęcia",
      "writeOffs": "Odpisy",
      "ald": "ALD",
      "stockEnd": "Stan końcowy",
      "notes": "Notatki"
    },
    "chart": {
      "title": "Prognoza Stanu Magazynowego (14 dni)"
    },
    "buttons": {
      "add": "Dodaj",
      "resetDefaults": "Resetuj",
      "showMore": "Pokaż więcej",
      "showLess": "Pokaż mniej",
      "rerun": "Uruchom ponownie",
      "showChart": "Pokaż wykres",
      "hideChart": "Ukryj wykres"
    },
    "watchlist": {
      "viewing": "Przeglądanie pozycji {{current}} z {{total}}"
    }
  },
  "settings": {
    "title": "Ustawienia",
    "dataSources": {
        "title": "Źródła Danych",
        "description": "Połącz swoje lokalne pliki danych, aby umożliwić szybkie przeładowanie. Aplikacja zapamięta Twój wybór.",
        "dataType": "Typ Danych",
        "linkedFile": "Połączony Plik",
        "actions": "Akcje",
        "notLinked": "Nie połączono",
        "linkFile": "Połącz Plik",
        "clearLink": "Usuń Połączenie",
        "linkSuccess": "Plik połączony pomyślnie.",
        "linkError": "Błąd podczas łączenia pliku.",
        "permissionDenied": "Odmówiono uprawnień do odczytu pliku.",
        "permissionNeeded": "Nie udzielono uprawnień do odczytu pliku.",
        "reloadError": "Nie można odczytać pliku. Mógł zostać przeniesiony lub usunięty.",
        "linkClearedSuccess": "Połączenie pliku usunięte.",
        "linkClearedError": "Błąd podczas usuwania połączenia pliku.",
        "clearLinkConfirm": "Czy na pewno chcesz usunąć to połączenie? Dane bazowe nie zostaną usunięte."
    },
    "configManagement": {
        "title": "Zarządzanie Konfiguracją",
        "description": "Eksportuj swoje ustawienia (takie jak lista RDC) do pliku lub importuj je na innym urządzeniu. Nie obejmuje to połączonych plików.",
        "exportButton": "Eksportuj Konfigurację",
        "importButton": "Importuj Konfigurację",
        "exportSuccess": "Konfiguracja wyeksportowana pomyślnie.",
        "importSuccess": "Konfiguracja zaimportowana pomyślnie.",
        "importError": "Błąd podczas importowania pliku konfiguracyjnego."
    },
    "rdcManagement": {
        "title": "Zarządzanie RDC",
        "description": "Dodawaj lub usuwaj Regionalne Centra Dystrybucyjne (RDC) z listy dostępnej przy logowaniu.",
        "rdcId": "ID RDC",
        "rdcName": "Nazwa RDC",
        "addRdc": "Dodaj RDC",
        "deleteRdc": "Usuń",
        "addSuccess": "RDC dodane pomyślnie.",
        "deleteSuccess": "RDC usunięte pomyślnie.",
        "deleteConfirm": "Czy na pewno chcesz usunąć to RDC?"
    },
    "exclusionList": {
      "title": "Zarządzanie Listą Wykluczeń",
      "description": "Importuj listę numerów produktów, które mają być wykluczone z obliczeń 'Podejrzanych Statusów' w Raporcie Statusów. Produkty te będą nadal widoczne w raporcie, ale zostaną podświetlone.",
      "importButton": "Importuj listę (.txt)",
      "clearButton": "Wyczyść listę",
      "currentCount": "Na liście wykluczeń znajduje się {{count}} pozycji.",
      "importSuccess": "Lista wykluczeń zaimportowana pomyślnie. Załadowano {{count}} pozycji.",
      "importError": "Błąd podczas importowania listy wykluczeń.",
      "clearSuccess": "Lista wykluczeń została wyczyszczona.",
      "clearConfirm": "Czy na pewno chcesz wyczyścić całą listę wykluczeń?"
    },
    "shcExclusionList": {
      "title": "Wykluczenia Sklepów SHC",
      "description": "Importuj lub eksportuj listę numerów sklepów, aby tymczasowo wykluczyć je z obliczeń raportu SHC. Wykluczone sklepy zostaną podświetlone i nie będą wliczane do sum.",
      "importButton": "Importuj Listę (.txt)",
      "exportButton": "Eksportuj Listę",
      "clearButton": "Wyczyść Listę",
      "currentCount": "Na liście wykluczeń znajduje się {{count}} sklepów.",
      "importSuccess": "Lista wykluczeń SHC zaimportowana. Załadowano {{count}} sklepów.",
      "importError": "Błąd podczas importowania listy wykluczeń SHC.",
      "clearSuccess": "Lista wykluczeń SHC została wyczyszczona.",
      "clearConfirm": "Czy na pewno chcesz wyczyścić całą listę wykluczeń SHC?"
    },
    "watchlists": {
        "title": "Listy Obserwacyjne",
        "description": "Twórz i zarządzaj listami produktów do monitorowania. (Funkcjonalność w budowie)"
    }
  },
  "loginModal": {
      "title": "Wybierz Tryb Pracy",
      "hqButton": "Centrala (HQ)",
      "rdcButton": "Magazyn (RDC)",
      "password": "Hasło",
      "selectRdc": "Wybierz magazyn",
      "loginButton": "Zaloguj",
      "invalidPassword": "Hasło jest nieprawidłowe."
  },
  "modals": {
    "refresh": {
        "title": "Automatyczne Odświeżanie Danych",
        "message": "Dane zostaną ponownie załadowane za {{seconds}} sekund.",
        "cancel": "Anuluj Odświeżanie"
    },
    "idle": {
        "title": "Sesja wygasła z powodu braku aktywności",
        "continue": "Kontynuuj Sesję"
    }
  },
  "common": {
    "yesShort": "T",
    "noShort": "N"
  },
  "dataType": {
    "products": "Dane Podstawowe",
    "goodsReceipts": "Przyjęcia Towaru",
    "openOrders": "Otwarte Zamówienia",
    "sales": "Dane Sprzedaży",
    "shc": "Dane ze Sklepów (SHC)",
    "planogram": "Planogram",
    "orgStructure": "Struktura Org.",
    "categoryRelation": "Relacje Kategorii"
  },
  "threatReport": {
    "title": "Raport Zagrożeń",
    "description": "Uruchom masową symulację dla produktów na podstawie wybranych kryteriów, aby zidentyfikować pozycje o najwyższym ryzyku odpisu.",
    "controls": {
      "title": "Parametry Raportu",
      "warehouses": "Magazyny",
      "itemGroups": "Grupy Artykułów",
      "statuses": "Statusy",
      "runReport": "Uruchom Raport",
      "selectAll": "Zaznacz wszystko",
      "deselectAll": "Odznacz wszystko",
      "runningTitle": "Generowanie Raportu...",
      "runningDescription": "Analizowanie {{processed}} z {{total}} produktów. To może chwilę potrwać."
    },
    "results": {
      "title": "Wyniki Raportu",
      "noResults": "Żadne produkty nie pasują do wybranych kryteriów lub nie znaleziono żadnych zagrożeń.",
      "goToSimulation": "Analizuj",
      "analyzeSelected": "Analizuj Zaznaczone ({{count}})",
      "warehouseId": "Magazyn",
      "productId": "Artykuł",
      "caseSize": "Rozm. op.",
      "palletFactor": "Wsp. pal.",
      "daysOfStock": "Dni Zapasu",
      "aldValue": "Wartość ALD",
      "avgDailySales": "Śr. Sprzedaż",
      "nonCompliantReceipts": "Niezgodne Przyj.",
      "writeOffValue": "Wartość Odpisu"
    }
  },
  "statusReport": {
    "title": "Raport Spójności Statusów",
    "description": "Uruchom raport, aby znaleźć produkty o niespójnych statusach w różnych magazynach. Raport pokaże tylko produkty, w których wykryto niespójność statusu.",
    "runReport": "Uruchom Raport",
    "runningTitle": "Generowanie Raportu...",
    "runningDescription": "Analizowanie {{processed}} z {{total}} grup produktów.",
    "filters": {
      "title": "Filtry",
      "productId": "Nr artykułu",
      "dominantStatus": "Status",
      "excludeNoStock": "Wyklucz pozycje bez stanu magazynowego",
      "showOnlyUndetermined": "Pokaż tylko pozycje bez dominującego statusu",
      "includeConsistent": "Pokaż również spójne pozycje",
      "excludeWhenDominantIs": "Wyklucz, gdy dominujący status to:",
      "apply": "Zastosuj Filtry",
      "clear": "Wyczyść Filtry",
      "all": "Wszystkie",
      "pastedInfo": "Filtrowanie według {{count}} wklejonych pozycji"
    },
    "exclusionInfo": {
      "info": "Wykluczone pozycje wgrane {{date}} o {{time}}. Załadowano pozycji: {{count}}",
      "updateButton": "Aktualizuj listę"
    },
    "summary": {
      "title": "Podsumowanie Raportu",
      "warehouse": "Magazyn",
      "itemsChecked": "Sprawdzone Pozycje",
      "suspiciousStatuses": "Podejrzane Statusy",
      "excluded": "Wykluczone",
      "status8Items": "Pozycje ze statusem 8"
    },
    "statusTypes": {
      "dominant": "Dominujący",
      "mostFrequent": "Najczęstszy",
      "none": "Nieokreślony"
    },
    "results": {
      "title": "Niespójne Produkty",
      "titleWithConsistent": "Wyniki ({{count}}) wraz ze spójnymi",
      "noResults": "Nie znaleziono produktów o niespójnych statusach.",
      "productId": "Nr artykułu",
      "productName": "Nazwa Produktu",
      "caseSize": "Rozmiar Opakowania",
      "dominantStatus": "Ustalony Status",
      "exportPdf": "Eksportuj do PDF"
    },
    "tooltips": {
      "excluded": "Wykluczone z analizy"
    },
    "pdf": {
      "summaryTitle": "Podsumowanie Magazynów",
      "inconsistentProductsTitle": "Niespójne Produkty",
      "groupedByStatus": "Grupowane według podejrzanego statusu: {{status}}",
      "exportOptionsTitle": "Opcje Eksportu",
      "selectWarehouse": "Wybierz magazyn do eksportu",
      "allWarehouses": "Wszystkie magazyny",
      "exportButton": "Eksportuj",
      "cancelButton": "Anuluj",
      "reportForWarehouse": "Raport dla magazynu",
      "noInconsistencies": "Nie znaleziono niespójności dla tego magazynu w bieżących wynikach.",
      "statusIn": "Status w",
      "generatedOn": "Wygenerowano",
      "activeFilters": "Aktywne Filtry",
      "format": "Format Raportu",
      "summaryFormat": "Szczegółowe Podsumowanie (wg Magazynu)",
      "comparativeFormat": "Tabela Porównawcza (Jak na ekranie)",
      "filterByStatus": "Filtruj wg Podejrzanego Statusu",
      "allStatuses": "Wszystkie Podejrzane Statusy"
    }
  },
  "shcReport": {
    "description": "Uruchom analizę, aby zweryfikować spójność danych SHC w systemie z danymi planogramu.",
    "status": {
      "readingFiles": "Wczytywanie plików..."
    },
    "errors": {
      "allFilesRequired": "Wszystkie 4 zestawy danych muszą być zaimportowane i należy wybrać RDC, aby uruchomić analizę.",
      "fileReadError": "Wystąpił błąd podczas odczytu jednego z połączonych plików."
    },
     "validation": {
      "title": "Sprawdzanie Spójności Danych",
      "message": "{{count}} sklepów znaleziono w Strukturze Organizacyjnej, ale brakuje ich w dzisiejszych danych SHC.",
      "listHeader": "Brakujące sklepy:",
      "continue": "Kontynuuj Mimo To",
      "cancel": "Anuluj"
    },
    "results": {
      "title": "Wyniki Analizy",
      "placeholder": "Uruchom analizę, aby zobaczyć wyniki.",
      "mismatchesTitle": "Niezgodności Danych",
      "storeCountSummary": "Dostępne sklepy w danych SHC: {{shcStoreCount}} / Całkowita liczba sklepów w RDC: {{orgStoreCount}}",
      "downloadAllPdf": "Pobierz pliki PDF dla wszystkich dostępnych sklepów"
    },
    "config": {
      "title": "Konfiguracja Sekcji",
      "description": "Wybierz i zmień kolejność sekcji, które mają być uwzględnione w analizie. Przeciągnij i upuść, aby zmienić kolejność.",
      "save": "Zapisz Konfigurację",
      "import": "Importuj",
      "export": "Eksportuj",
      "importSuccess": "Konfiguracja sekcji zaimportowana pomyślnie.",
      "exportSuccess": "Konfiguracja sekcji wyeksportowana pomyślnie.",
      "importError": "Błąd podczas importowania konfiguracji sekcji.",
      "saved": "Konfiguracja zapisana.",
      "unsaved": "Masz niezapisane zmiany.",
      "addNew": "Dodaj wszystkie nowe sekcje",
      "removeStale": "Usuń wszystkie nieaktualne sekcje",
      "new": "Nowa",
      "stale": "Nieaktualna",
      "selectAll": "Zaznacz wszystko",
      "deselectAll": "Odznacz wszystko",
      "activeSectionsSummary": "{{active}} aktywnych z {{total}} dostępnych",
      "refreshOrder": "Odśwież kolejność w sekcji"
    },
    "rdcSelector": {
      "label": "Wybierz RDC",
      "placeholder": "Wybierz RDC..."
    },
    "table": {
      "warehouse": "Magazyn",
      "hos": "Kierownik Sprzedaży",
      "am": "Kierownik Rejonu",
      "store": "Sklep",
      "discrepancies": "Rozbieżności",
      "avgPerStore": "Śr. na Sklep",
      "itemNumber": "Nr artykułu",
      "itemName": "Nazwa artykułu",
      "planShc": "Plan SHC",
      "storeShc": "Sklep SHC",
      "diff": "Różnica",
      "section": "Sekcja",
      "itemGroup": "Grupa towarowa",
      "sectionWidth": "Szerokość ustawienia",
      "excluded": "(Wyłączone z sum)",
      "tooltip": {
        "toggleExclusion": "Przełącz wykluczenie",
        "exportPdf": "Eksportuj sklep do PDF"
      }
    }
  },
  "columns": {
    "product": {
      "warehouseId": "Magazyn",
      "dispoGroup": "Grupa Dyspo",
      "itemGroup": "Grupa Art.",
      "orderArea": "Obszar Zam.",
      "productId": "Nr art. (Krótki)",
      "fullProductId": "Nr art. (Pełny)",
      "name": "Nazwa",
      "caseSize": "Szt./Op.",
      "cartonsPerLayer": "Op./Warstwa",
      "duessFactor": "DD",
      "cartonsPerPallet": "Op./Paleta",
      "shelfLifeAtReceiving": "W-DATE dni",
      "shelfLifeAtStore": "S-DATE dni",
      "customerShelfLife": "C-DATE dni",
      "price": "Cena",
      "status": "Status",
      "itemLocked": "Zablokowany",
      "slotNr": "Slot",
      "unprocessedDeliveryQty": "Nieprzetw. Dost.",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "stockOnHand": "Stan Magazynowy",
      "storeAllocationToday": "Alok. Dziś",
      "storeAllocationTotal": "Alok. Całkowita",
      "promoDate": "Data Promocji",
      "estimatedReceivings": "Szac. Przyjęcia"
    },
    "goodsReceipt": {
      "warehouseId": "Magazyn",
      "productId": "Nr art. (Krótki)",
      "fullProductId": "Nr art. (Pełny)",
      "name": "Nazwa",
      "deliveryUnit": "Jedn. Dostawy",
      "deliveryQtyUom": "Ilość (J.m.)",
      "caseSize": "Szt./Op.",
      "deliveryQtyPcs": "Ilość (Szt.)",
      "poNr": "Nr Zamówienia",
      "deliveryDate": "Data Dostawy",
      "bestBeforeDate": "Data Przydatności",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "bolNr": "Nr BOL",
      "deliveryNote": "Dowód Dostawy",
      "intSupplierNr": "Wew. Nr Dost.",
      "intItemNr": "Wew. Nr Art.",
      "caseGtin": "GTIN Opakowania",
      "liaReference": "Ref. LIA"
    },
    "openOrder": {
      "warehouseId": "Magazyn",
      "productId": "Nr art. (Krótki)",
      "fullProductId": "Nr art. (Pełny)",
      "name": "Nazwa",
      "orderUnit": "Jedn. Zamówienia",
      "orderQtyUom": "Ilość (J.m.)",
      "caseSize": "Szt./Op.",
      "orderQtyPcs": "Ilość (Szt.)",
      "poNr": "Nr Zamówienia",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "deliveryDate": "Plan. Data Dost.",
      "creationDate": "Data Utworzenia",
      "deliveryLeadTime": "Czas Realizacji (dni)"
    },
    "sale": {
      "resaleDate": "Data Odsprzedaży",
      "warehouseId": "Magazyn",
      "productId": "Nr artykułu",
      "productName": "Nazwa Produktu",
      "quantity": "Sprzedana Ilość"
    },
    "shc": {
        "storeNumber": "Numer sklepu",
        "itemNumber": "Numer artykułu",
        "itemDescription": "Opis artykułu",
        "piecesInBox": "Sztuki w opakowaniu",
        "itemStatus": "Status artykułu",
        "itemGroup": "Grupa towarowa",
        "shelfCapacity": "Pojemność półki (SHC)",
        "shelfCapacityUnit": "Jednostka SHC"
    },
    "planogram": {
        "generalStoreArea": "Ogólny obszar sklepu",
        "settingSpecificallyFor": "Ustawienie dla",
        "settingWidth": "Szerokość ustawienia",
        "itemNumber": "Numer artykułu",
        "itemName": "Nazwa artykułu",
        "targetShc": "Docelowe SHC",
        "facings": "Liczba frontów",
        "depth": "Głębokość"
    },
    "orgStructure": {
        "storeNumber": "Numer sklepu",
        "storeName": "Nazwa sklepu",
        "warehouseId": "ID Magazynu",
        "areaManager": "Kierownik Rejonu",
        "headOfSales": "Kierownik Sprzedaży"
    },
    "categoryRelation": {
        "generalStoreArea": "Ogólny obszar sklepu",
        "settingSpecificallyFor": "Ustawienie dla",
        "settingWidth": "Szerokość ustawienia",
        "storeNumber": "Numer sklepu"
    }
  }
}
