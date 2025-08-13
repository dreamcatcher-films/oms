
export default {
  "header": {
    "title": "OMS"
  },
  "sidebar": {
    "import": "Import Danych",
    "dataPreview": "Przeglądanie Danych",
    "threatReport": "Raport Zagrożeń",
    "dashboard": "Dashboard",
    "simulations": "Symulacje",
    "settings": "Ustawienia"
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
    "status": {
        "updated": "Zaktualizowano",
        "todayAt": "dzisiaj o",
        "noData": "Brak danych",
        "records": "rekordów",
        "linkedTo": "Połączono z"
    },
    "buttons": {
        "selectFile": "Wybierz plik",
        "change": "Zmień",
        "reload": "Załaduj ponownie",
        "clear": "Wyczyść"
    }
  },
  "dataPreview": {
      "tabs": {
          "products": "Produkty",
          "goodsReceipts": "Przyjęcie Towaru (eGIN)",
          "openOrders": "Otwarte Zamówienia",
          "sales": "Odsprzedaże"
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
        "description": "Tutaj znajdzie się lista artykułów z potencjalnym ryzykiem strat, posortowana według pilności. Ta funkcjonalność jest w budowie."
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
      "aldLegend": "Jeżeli dostawa zagrożona ALD, to jest zaznaczona na pomarańczowo."
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
        "clearLink": "Wyczyść",
        "linkSuccess": "Plik połączono pomyślnie.",
        "linkError": "Błąd podczas łączenia pliku.",
        "permissionDenied": "Odmówiono uprawnień do odczytu pliku.",
        "permissionNeeded": "Nie udzielono uprawnień do odczytu pliku.",
        "reloadError": "Nie można odczytać pliku. Mógł zostać przeniesiony lub usunięty."
    },
    "configManagement": {
        "title": "Zarządzanie Konfiguracją",
        "description": "Eksportuj swoje ustawienia do pliku lub importuj je na innym urządzeniu. (Funkcja w budowie)",
        "exportButton": "Eksportuj Konfigurację",
        "importButton": "Importuj Konfigurację"
    },
    "watchlists": {
        "title": "Listy Obserwowane",
        "description": "Twórz i zarządzaj listami produktów do monitorowania. (Funkcja w budowie)"
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
    "sales": "Dane o odsprzedaży"
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
    }
  }
}
