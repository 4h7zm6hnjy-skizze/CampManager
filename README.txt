CampManager v62 – Update für den aktuellen v60/v61-Stand

NEU IM JAHRESABSCHLUSS:
- Beim Öffnen des Jahresabschlusses fragt die App jedes Mal:
  „Sollen alle Rechnungen und Dokumente für das gewählte Jahr mit in die PDF eingebunden werden?“
- Auswahl „Ja – mit Rechnungen & Dokumenten“:
  - Bilder/Fotos werden als eigene Seiten in die PDF eingefügt.
  - Bereits vorhandene PDF-Dokumente werden mit ihren Originalseiten an den Jahresabschluss angehängt.
  - Es wird automatisch eine Anlagenübersicht eingefügt.
  - Die fertige Datei heißt „…-mit-Rechnungen-und-Dokumenten.pdf“.
- Auswahl „Nein – nur Jahresabschluss“:
  - Es wird die normale Jahresabschluss-PDF ohne Anlagen erstellt.
- Auswahl „Abbrechen“:
  - Der Vorgang wird beendet.
- Auf iPhone/iPad öffnet sich weiterhin nach Möglichkeit das Teilen-Menü, sodass „In Dateien sichern“ gewählt werden kann.
- Falls ein gespeichertes Dokument auf dem Gerät fehlt, wird – wenn vorhanden – die Cloud-Kopie verwendet.
- Nicht verfügbare oder nicht einbettbare Dateien werden im PDF als Hinweis-Anlage vermerkt.

PDF-MERGE:
- Für das Zusammenführen vorhandener PDF-Dokumente wird pdf-lib 1.17.1 (MIT) bei Bedarf im Browser geladen.
- Primärquelle: jsDelivr; Fallback: cdnjs und unpkg.
- Ohne Internet funktioniert die normale Jahresabschluss-PDF weiterhin. Das erstmalige Zusammenführen von PDF-Anlagen benötigt die Bibliothek aus dem Internet, sofern sie noch nicht im Browsercache vorhanden ist.

WEITERHIN ENTHALTEN AUS v61:
- Rechnungen/Belege an allen Kostenstellen per Kamera oder Mediathek.
- Kfz-Tarif: Übernachtungen bestimmen nur die Tarifstufe; Auto bleibt eigener Kostenpunkt.

INSTALLATION AUF GITHUB:
1. cost-receipts.js im Hauptverzeichnis durch die neue Datei ersetzen.
2. sw.js durch die neue Datei ersetzen.
3. index.html NICHT ersetzen.
4. CampManager vollständig schließen.
5. App/Seite online neu öffnen und einmal neu laden.

Bestehende CampManager-Daten in LocalStorage und IndexedDB werden nicht gelöscht.
