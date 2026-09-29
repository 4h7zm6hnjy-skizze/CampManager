# Die Hentschel's – CampManager Platz 161

Mobile Web-App/PWA für die gemeinsame Verwaltung des Dauerstellplatzes auf mehreren Geräten.

## Enthalten

- Dashboard mit nächster Anreise, offenen Einkäufen, Aufgaben, Übernachtungen und Petroleum-Bestand
- Stellplatzdaten und Familienprofile
- Inventar, Aufgaben, Einkaufsliste
- Kostenübersicht: Jahresgebühr, Strom, Petroleum, Reparaturen, Neuanschaffungen, Sonstiges
- Petroleum-Verwaltung mit Käufen/Verbrauch/Bestand
- Strom nur als Jahreswerte: Verbrauch, Stromkosten, Zählermiete
- Übernachtungszähler
- Rasenpflege und zwei Heckenschnitte pro Jahr mit Datum
- Verträge inkl. Fristen und Dokument-Upload
- Gasprüfung inkl. Fälligkeit, Ergebnis, Mängeln und Prüfbescheinigung
- Saisonstart- und Winterfest-Checklisten
- PWA-Installation auf iPhone/Android/Desktop
- lokale Zwischenspeicherung und Cloud-Synchronisierung

## Mehrere Geräte: einmalig Supabase einrichten

Die App selbst ist statisch und kann z. B. kostenlos über GitHub Pages laufen. Für gemeinsame Daten benötigt sie eine Datenbank. Vorgesehen ist Supabase; der kostenlose Tarif genügt für eine Familien-App.

1. Kostenloses Supabase-Projekt erstellen.
2. In Supabase **SQL Editor** öffnen und den Inhalt von `supabase.sql` ausführen.
3. Unter **Project Settings -> API** die **Project URL** und die **anon/public key** kopieren.
4. In `config.js` eintragen:

```js
window.CAMP_CONFIG = {
  supabaseUrl: "https://DEIN-PROJEKT.supabase.co",
  supabaseAnonKey: "DEINE-ANON-KEY"
};
```

5. Dateien auf GitHub Pages hochladen.
6. Beim ersten Öffnen ein Familienkonto registrieren. Auf allen Geräten mit demselben Familienkonto anmelden.

Wichtig: Die anon/public key ist für Browser-Apps vorgesehen. Die Daten werden durch die in `supabase.sql` aktivierten Row-Level-Security-Regeln geschützt. Niemals einen `service_role`-Key in `config.js` eintragen.

## Lokal testen

Die App kann ohne Cloud im lokalen Modus getestet werden. Dann bleiben Daten nur auf diesem Gerät.

Einfach einen Webserver starten, z. B.:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

## GitHub Pages

Das Projekt benötigt keinen Build-Schritt. Alle Dateien kommen direkt ins Repository. In GitHub unter **Settings -> Pages** die Bereitstellung aus dem Hauptbranch aktivieren.

## Datenschutz

Cloud-Daten sind an das angemeldete Supabase-Benutzerkonto gebunden. Vertrags- und Prüfungsdokumente werden in einem privaten Storage-Bucket gespeichert. Die App lädt keine persönlichen Daten an Werbe- oder Trackingdienste.
