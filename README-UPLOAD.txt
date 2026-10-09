CampManager v65 - Reparatur-Komplettversion
Stand: 09.10.2026

WICHTIG: Diese Version ersetzt die gemischte v60/v64-Installation vollständig.
Bitte ALLE Dateien aus diesem Paket in das GitHub-Hauptverzeichnis hochladen und vorhandene Dateien ersetzen.

Besonders wichtig zu ersetzen:
- index.html
- sw.js
- version.json
- cost-receipts.js
- manifest.webmanifest

Die aktive Startdatei muss exakt index.html heißen.
Dateien wie "index 2.html", "index 3.html" usw. sind nicht aktiv und können später gelöscht werden.

Nach dem Upload auf dem iPhone:
1. Internetverbindung aktiv lassen.
2. CampManager komplett schließen.
3. App erneut öffnen.
4. Falls ein Update-Banner erscheint: "Aktualisieren" antippen.
5. Unter Einstellungen muss anschließend "CampManager v65" stehen.

Behoben in v65:
- PDF speichern und Drucken des Jahresabschlusses repariert.
- Sichtbare Frage, ob Rechnungen/Dokumente eingebunden werden sollen.
- iPhone/PWA: nach der PDF-Erstellung erscheint ein neuer Button für Teilen/Drucken bzw. "In Dateien sichern".
- Rechnungen/Belege direkt an Kostenstellen: Kamera, Mediathek oder Datei/PDF.
- Belege werden im Dokumentenspeicher abgelegt und über Backup/Cloud wie andere Dokumente behandelt.
- Updateprüfung repariert und Cache-Verhalten neu aufgebaut.
- index.html, version.json und Service Worker sind auf dieselbe Version v65 gesetzt.
- Alte v61-v64 Script-Injektion entfernt.
- Auto-Tarif: Übernachtungen wählen genau eine Kfz-Tarifstufe; Auto bleibt eigener Kostenpunkt.

Hinweis zu Anlagen im Jahresabschluss:
- Ohne Anlagen funktioniert die PDF vollständig lokal.
- Für das Zusammenführen vorhandener PDF-/Bild-Anlagen wird pdf-lib 1.17.1 bei Bedarf aus einem der hinterlegten CDNs geladen.
- Ist diese Bibliothek nicht erreichbar, bietet die App automatisch an, den Jahresabschluss ohne Anlagen zu erstellen.
