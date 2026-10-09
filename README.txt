CampManager v64 – Jahresabschluss PDF & Drucken repariert

NEU / BEHOBEN:
- Beim Klick auf „PDF speichern“ wird IMMER gefragt:
  „Sollen alle Rechnungen und Dokumente des gewählten Jahres mit in die PDF aufgenommen werden?“
- Beim Klick auf „Drucken“ wird JETZT EBENFALLS IMMER gefragt:
  „Sollen alle Rechnungen und Dokumente des gewählten Jahres mit in den Druck aufgenommen werden?“
- Auswahl:
  JA = Jahresabschluss + Rechnungen + Dokumente
  NEIN = nur normaler Jahresabschluss
  ABBRECHEN = keine Aktion
- Die Frage erscheint auch dann, wenn 0 Dokumente gefunden wurden.
- Bei iPhone/iPad wird beim Drucken mit Anlagen eine gemeinsame PDF erzeugt.
  Im danach geöffneten Teilen-Menü „Drucken“ wählen.
- PDF-Dateien werden soweit möglich als Originalseiten angehängt.
- Bilder/Fotos werden als eigene PDF-Seiten angehängt.
- „Jahresabschluss öffnen“ wird weiterhin NICHT blockiert.

ZUSÄTZLICHE ABSICHERUNG:
- PDF- und Druck-Schaltflächen werden direkt verdrahtet.
- Zusätzlich bleibt der globale Click-Handler als Fallback aktiv.
- Der v64-Service-Worker entfernt alte v61/v62/v63 Add-on-Tags und lädt
  cost-receipts.js mit Cache-Busting neu.

RECHNUNGEN / BELEGE:
- Die v63-Belegfunktion bleibt vollständig erhalten:
  Kamera, Mediathek und Datei/PDF in den Kostenbereichen.

INSTALLATION AUF GITHUB:
1. cost-receipts.js im Hauptverzeichnis ERSETZEN.
2. sw.js im Hauptverzeichnis ERSETZEN.
3. Nicht als „cost-receipts (1).js“ oder „sw (1).js“ hochladen.
4. CampManager auf dem iPhone komplett schließen.
5. Seite/Web-App einmal ONLINE neu öffnen.
6. Danach die Home-Screen-App erneut öffnen.
7. Oben muss „v64“ stehen.

WICHTIG:
Die bestehende index.html und deine gespeicherten Daten werden nicht ersetzt.
