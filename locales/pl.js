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
        "parseError": "Błąd krytyczny podczas parsowania pliku: {{dataTypeName}}."
    },
    "clear": {
        "clearing": "Usuwanie danych: {{dataTypeName}}...",
        "cleared": "Dane '{{dataTypeName}}' zostały usunięte.",
        "clearError": "Błąd podczas usuwania danych: {{dataTypeName}}.",
        "clearingAll": "Usuwanie wszystkich danych...",
        "clearedAll": "Wszystkie dane zostały usunięte. Możesz załadować nowe pliki.",
        "clearAllError": "Błąd podczas usuwania danych."
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
      "daysForSale": "Dni na Sprzedaż",
      "regulationBreached": "Przekroczone (T/N)",
      "quantity": "Ilość",
      "unknownBatch": "Nieznana Partia",
      "legend": {
        "ald": "Ryzyko ALD",
        "writeOff": "Zagrożenie Odpisem",
        "nonCompliant": "Niezgodne Przyjęcie",
        "manual": "Dostawa Ręczna"
      }
    },
    "log": {
      "title": "Dziennik Symulacji",
      "date": "Data",
      "stockStart": "Stan Początkowy",
      "sales": "Sprzedaż",
      "receipts": "Przyjęcia",
      "writeOffs": "Odpisy",
      "ald": "ALD",
      "stockEnd": "Stan Końcowy",
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
        "rerun": "Uruchom Ponownie",
        "showChart": "Pokaż Wykres",
        "hideChart": "Ukryj Wykres"
    },
    "watchlist": {
        "viewing": "Przeglądany artykuł {{current}} z {{total}}"
    }
  },
  "settings": {
    "title": "Ustawienia",
    "dataSources": {
        "title": "Źródła Danych",
        "description": "Połącz swoje lokalne pliki z danymi, aby umożliwić ich szybkie ponowne ładowanie. Aplikacja zapamięta Twój wybór.",
        "dataType": "Typ Danych",
        "linkedFile": "Połączony Plik",
        "actions": "Akcje",
        "notLinked": "Nie połączono",
        "linkFile": "Połącz Plik",
        "clearLink": "Usuń Połączenie",
        "linkSuccess": "Plik połączono pomyślnie.",
        "linkError": "Błąd podczas łączenia pliku.",
        "permissionDenied": "Odmówiono uprawnień do odczytu pliku.",
        "permissionNeeded": "Nie udzielono uprawnień do odczytu pliku.",
        "reloadError": "Nie można odczytać pliku. Mógł zostać przeniesiony lub usunięty.",
        "linkClearedSuccess": "Połączenie z plikiem usunięte.",
        "linkClearedError": "Błąd podczas usuwania połączenia z plikiem.",
        "clearLinkConfirm": "Czy na pewno chcesz usunąć to połączenie? Dane z bazy nie zostaną usunięte."
    },
    "configManagement": {
        "title": "Zarządzanie Konfiguracją",
        "description": "Eksportuj swoje ustawienia (jak lista RDC) do pliku lub importuj je na innym urządzeniu. Ta opcja nie obejmuje połączonych plików.",
        "exportButton": "Eksportuj Konfigurację",
        "importButton": "Importuj Konfigurację",
        "exportSuccess": "Konfiguracja wyeksportowana pomyślnie.",
        "importSuccess": "Konfiguracja zaimportowana pomyślnie.",
        "importError": "Błąd podczas importu pliku konfiguracyjnego."
    },
    "rdcManagement": {
        "title": "Zarządzanie Magazynami (RDC)",
        "description": "Dodawaj lub usuwaj Regionalne Centra Dystrybucyjne (RDC) z listy dostępnej przy logowaniu.",
        "rdcId": "ID Magazynu",
        "rdcName": "Nazwa Magazynu",
        "addRdc": "Dodaj Magazyn",
        "deleteRdc": "Usuń",
        "addSuccess": "Magazyn dodany pomyślnie.",
        "deleteSuccess": "Magazyn usunięty pomyślnie.",
        "deleteConfirm": "Czy na pewno chcesz usunąć ten magazyn?"
    },
    "exclusionList": {
      "title": "Zarządzanie Listą Wykluczeń",
      "description": "Zaimportuj listę numerów produktów, które mają być wykluczone z obliczeń 'Podejrzanych statusów' w Raporcie Statusów. Produkty te nadal będą widoczne w raporcie, ale zostaną podświetlone.",
      "importButton": "Importuj listę (.txt)",
      "clearButton": "Wyczyść listę",
      "currentCount": "Na liście wykluczeń znajduje się {{count}} pozycji.",
      "importSuccess": "Lista wykluczeń zaimportowana pomyślnie. Załadowano {{count}} pozycji.",
      "importError": "Błąd podczas importu listy wykluczeń.",
      "clearSuccess": "Lista wykluczeń została wyczyszczona.",
      "clearConfirm": "Czy na pewno chcesz wyczyścić całą listę wykluczeń?"
    },
    "watchlists": {
        "title": "Listy Obserwowane",
        "description": "Twórz i zarządzaj listami produktów do monitorowania. (Funkcja w budowie)"
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
        "title": "Automatyczne odświeżanie danych",
        "message": "Dane zostaną ponownie załadowane za {{seconds}} sekund.",
        "cancel": "Anuluj odświeżanie"
    },
    "idle": {
        "title": "Sesja wygasła z powodu braku aktywności",
        "continue": "Kontynuuj sesję"
    }
  },
  "common": {
    "yesShort": "T",
    "noShort": "N"
  },
  "dataType": {
    "products": "Dane podstawowe",
    "goodsReceipts": "Przyjęcia towaru",
    "openOrders": "Otwarte zamówienia",
    "sales": "Dane o odsprzedaży",
    "shc": "Dane ze Sklepów (SHC)",
    "planogram": "Planogram",
    "orgStructure": "Struktura Org.",
    "categoryRelation": "Relacja Kategoria-Sklep"
  },
  "threatReport": {
    "title": "Raport Zagrożeń",
    "description": "Uruchom symulację zbiorczą dla produktów na podstawie wybranych kryteriów, aby zidentyfikować pozycje o najwyższym ryzyku odpisu.",
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
      "analyzeSelected": "Analizuj zaznaczone ({{count}})",
      "warehouseId": "Magazyn",
      "productId": "Artykuł",
      "caseSize": "Szt. w kart.",
      "palletFactor": "Kart. na pal.",
      "daysOfStock": "Dni Zapasu (RW)",
      "aldValue": "Wartość ALD",
      "avgDailySales": "Śr. Sprzedaż",
      "nonCompliantReceipts": "Niezgodne Przyj.",
      "writeOffValue": "Wartość Odpisu"
    }
  },
  "statusReport": {
    "title": "Raport Spójności Statusów",
    "description": "Uruchom raport, aby znaleźć produkty z niespójnymi statusami w różnych magazynach. Raport pokaże tylko produkty, w których wykryto niezgodność statusu.",
    "runReport": "Uruchom Raport",
    "runningTitle": "Generowanie Raportu...",
    "runningDescription": "Analizowanie {{processed}} z {{total}} grup produktów.",
    "filters": {
      "title": "Filtry",
      "productId": "Nr artykułu",
      "dominantStatus": "Status",
      "excludeNoStock": "Wyklucz art. bez stanu mag.",
      "showOnlyUndetermined": "Pokaż tylko art. bez statusu dominującego",
      "includeConsistent": "Pokaż także spójne pozycje",
      "excludeWhenDominantIs": "Wyklucz, gdy status dominujący to:",
      "apply": "Filtruj",
      "clear": "Wyczyść filtry",
      "all": "Wszystkie",
      "pastedInfo": "Filtrowanie wg {{count}} wklejonych pozycji"
    },
    "exclusionInfo": {
      "info": "Wykluczone pozycje wgrano {{date}} o {{time}}. Załadowano pozycji: {{count}}",
      "updateButton": "Zaktualizuj listę"
    },
    "summary": {
      "title": "Podsumowanie Raportu",
      "warehouse": "Magazyn",
      "itemsChecked": "Sprawdzone art.",
      "suspiciousStatuses": "Podejrzane statusy",
      "excluded": "Wykluczone",
      "status8Items": "Artykuły ze stat. 8"
    },
    "statusTypes": {
      "dominant": "Dominujący",
      "mostFrequent": "Najczęstszy",
      "none": "Nieokreślony"
    },
    "results": {
      "title": "Niespójne Produkty",
      "titleWithConsistent": "Wyniki ({{count}}) z uwzgl. Spójnych",
      "noResults": "Nie znaleziono produktów z niespójnymi statusami.",
      "productId": "Nr artykułu",
      "productName": "Nazwa produktu",
      "caseSize": "Szt. w kart.",
      "dominantStatus": "Ustalony Status",
      "exportPdf": "Eksportuj do PDF"
    },
    "tooltips": {
      "excluded": "Wykluczony z analizy"
    },
    "pdf": {
      "summaryTitle": "Podsumowanie dla magazynów",
      "inconsistentProductsTitle": "Niespójne Produkty",
      "groupedByStatus": "Grupowane wg podejrzanego statusu: {{status}}",
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
      "summaryFormat": "Podsumowanie Szczegółowe (wg Magazynu)",
      "comparativeFormat": "Tabela Porównawcza (jak na Ekranie)",
      "filterByStatus": "Filtruj wg Podejrzanego Statusu",
      "allStatuses": "Wszystkie Podejrzane Statusy"
    }
  },
  "shcReport": {
    "description": "Uruchom analizę weryfikującą zgodność danych SHC w systemie z danymi w planogramach.",
    "status": {
      "readingFiles": "Wczytywanie plików..."
    },
    "errors": {
      "allFilesRequired": "Wszystkie 4 pliki muszą być połączone, aby uruchomić analizę.",
      "fileReadError": "Wystąpił błąd podczas odczytu jednego z połączonych plików."
    },
    "results": {
      "title": "Wyniki Analizy",
      "placeholder": "Uruchom analizę, aby zobaczyć tutaj wyniki."
    }
  },
  "columns": {
    "product": {
      "warehouseId": "Magazyn",
      "dispoGroup": "Grupa Dispo",
      "itemGroup": "Grupa Tow.",
      "orderArea": "Obszar Zam.",
      "productId": "Nr art. krótki",
      "fullProductId": "Nr art. pełny",
      "name": "Nazwa",
      "caseSize": "Szt. w kart.",
      "cartonsPerLayer": "Kart. na war.",
      "duessFactor": "DD",
      "cartonsPerPallet": "Kart. na pal.",
      "shelfLifeAtReceiving": "W-DATE dni",
      "shelfLifeAtStore": "S-DATE dni",
      "customerShelfLife": "C-DATE dni",
      "price": "Cena",
      "status": "Status",
      "itemLocked": "Zablokowany",
      "slotNr": "Slot",
      "unprocessedDeliveryQty": "Nieroz. dost.",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "stockOnHand": "Stan mag.",
      "storeAllocationToday": "Alok. dzisiaj",
      "storeAllocationTotal": "Alok. łączna",
      "promoDate": "Data promo",
      "estimatedReceivings": "Szac. dostawy"
    },
    "goodsReceipt": {
      "warehouseId": "Magazyn",
      "productId": "Nr art. krótki",
      "fullProductId": "Nr art. pełny",
      "name": "Nazwa",
      "deliveryUnit": "Jedn. dostawy",
      "deliveryQtyUom": "Ilość (J.m.)",
      "caseSize": "Szt. w kart.",
      "deliveryQtyPcs": "Ilość (szt.)",
      "poNr": "Nr zamówienia",
      "deliveryDate": "Data dostawy",
      "bestBeforeDate": "Data przydatności",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "bolNr": "BOL Nr",
      "deliveryNote": "Nota dostawy",
      "intSupplierNr": "Międz. ID Dostawcy",
      "intItemNr": "Międz. nr art.",
      "caseGtin": "GTIN kartonu",
      "liaReference": "LIA Ref"
    },
    "openOrder": {
      "warehouseId": "Magazyn",
      "productId": "Nr art. krótki",
      "fullProductId": "Nr art. pełny",
      "name": "Nazwa",
      "orderUnit": "Jedn. zamówienia",
      "orderQtyUom": "Ilość (J.m.)",
      "caseSize": "Szt. w kart.",
      "orderQtyPcs": "Ilość (szt.)",
      "poNr": "Nr zamówienia",
      "supplierId": "ID Dostawcy",
      "supplierName": "Nazwa Dostawcy",
      "deliveryDate": "Plan. data dostawy",
      "creationDate": "Data utworzenia",
      "deliveryLeadTime": "Czas realizacji (dni)"
    },
    "sale": {
      "resaleDate": "Data odsprzedaży",
      "warehouseId": "Magazyn",
      "productId": "Nr artykułu",
      "productName": "Nazwa produktu",
      "quantity": "Sprzedana ilość"
    },
    "shc": {
        "storeNumber": "Numer sklepu",
        "itemNumber": "Numer artykułu",
        "itemDescription": "Opis artykułu",
        "piecesInBox": "Szt. w kartonie",
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
        "facings": "Facingi",
        "depth": "Głębokość"
    },
    "orgStructure": {
        "storeNumber": "Numer sklepu",
        "storeName": "Nazwa sklepu",
        "warehouseId": "ID Magazynu",
        "areaManager": "Area Manager",
        "headOfSales": "Head of Sales"
    },
    "categoryRelation": {
        "generalStoreArea": "Ogólny obszar sklepu",
        "settingSpecificallyFor": "Ustawienie dla",
        "settingWidth": "Szerokość ustawienia",
        "storeNumber": "Numer sklepu"
    }
  }
}
