CampManager v61 – Update für den aktuellen v60-Stand

Dieses Update ist so gebaut, dass deine aktuelle index.html unverändert bleibt.
Dadurch gehen die neueren Funktionen der v60 nicht verloren.

NEU:
- Unter jeder Kostenstelle gibt es einen Bereich „Rechnungen & Belege“.
- Rechnung direkt mit der Kamera fotografieren.
- Vorhandenes Bild aus der iPhone-Mediathek auswählen.
- Gespeicherte Rechnungen direkt öffnen, bearbeiten und löschen.
- Rechnungen werden im bestehenden CampManager-Dokumentenspeicher abgelegt.
- Damit werden sie auch vom vorhandenen Monatsbackup / Wiederherstellungssystem erfasst.

Kostenstellen mit Rechnungsbereich:
- Jahresmiete / Jahresbeitrag
- Kaution
- Versicherungen
- Steuer
- Ratenzahlung
- Strom
- Hin- & Rückfahrten
- allgemeine Kosten / Jahresbeitrag / Reparatur / Neuanschaffung / Sonstiges
- Petroleum
- Gas

ZUSÄTZLICH KORRIGIERT:
- Auto bleibt ein eigener Kostenpunkt.
- Die tatsächlichen Übernachtungen bestimmen ausschließlich die Kfz-Tarifstufe.
- Beispiel: 122 Übernachtungen = Tarifstufe 91–180.
- Bei 1 Auto und 80 € Tarif werden genau 80 € berechnet.
- Das Auto wird niemals als Person berechnet.
- Die Nächte werden nicht mit dem Autotarif multipliziert.

INSTALLATION AUF GITHUB:
1. cost-receipts.js in das Hauptverzeichnis deines CampManager-Repositories hochladen.
2. Die vorhandene sw.js durch die neue sw.js aus diesem Update ersetzen.
3. index.html NICHT ersetzen.
4. CampManager einmal vollständig schließen.
5. Seite/App online neu öffnen und danach noch einmal neu laden bzw. erneut öffnen.

Die neue Service-Worker-Datei lädt deine vorhandene index.html weiter und fügt die v61-Erweiterung automatisch hinzu.
Bestehende CampManager-Daten in LocalStorage und IndexedDB werden nicht gelöscht.
