CampManager – komplette Neu-Version v6

Die eigentliche App läuft komplett aus EINER index.html.
Es gibt keine externe JavaScript-Bibliothek und keinen Service Worker, der alte Versionen cachen kann.

Enthalten:
- vollständige Logoanzeige ohne Beschnitt
- mehrere Campingplätze/Stellplätze
- schneller Wechsel zwischen den Plätzen
- jeder Platz hat eigene Daten
- nächste Anreise
- offene Einkäufe
- Kostenübersicht ohne Lebensmittel und Ausflüge
- Petroleum: Einkauf / Verbrauch / Bestand setzen
- Strom ausschließlich als Jahreswerte: Verbrauch / Stromkosten / Zählermiete
- Übernachtungszähler
- Rasenpflege
- Heckenschnitt max. 2 Einträge pro Jahr
- Verträge und Fristen
- Gasprüfungen
- Kalenderexport (.ics) für iPhone/Apple Kalender
- Familienverwaltung
- JSON-Backup und Import
- optionaler Supabase Familien-/Mehrgeräte-Sync
- Migration der bisherigen lokalen CampManager-Daten

GitHub:
1. Im Repository die vorhandene index.html ersetzen.
2. Commit changes.
3. GitHub Pages neu laden.

Logo:
Die vorhandene logo.jpg im Repository wird verwendet.
Das Logo wird mit object-fit: contain vollständig angezeigt.

Cloud-Sync:
1. Kostenloses Supabase-Projekt anlegen.
2. supabase.sql im SQL Editor ausführen.
3. In CampManager -> Zahnrad die Project URL und den Anon/Public Key eintragen.
4. Familienkonto erstellen.
5. Auf allen Geräten mit derselben E-Mail + Passwort anmelden.
