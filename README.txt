CampManager v21 – KOMPLETTE VERSION
===================================

WICHTIG FÜR GITHUB
1. Alle Dateien aus diesem Ordner in das Stammverzeichnis des GitHub-Repositories hochladen.
2. Die vorhandene index.html MUSS durch diese index.html ersetzt werden.
3. Alte Dateien wie "index 2.html", "index 3.html" usw. werden nicht benötigt.
4. Deine vorhandene logo.jpg bleibt erhalten. Die Datei logo-fallback.jpg wird nur genutzt, falls logo.jpg fehlt.
5. GitHub Pages weiter auf Branch "main" und Ordner "/ (root)" betreiben.

NEU IN v21
- automatische Update-/Versionsprüfung
- PWA mit Service Worker und Offline-Fallback
- deutlich zuverlässigere Aktualisierung der index.html
- Cloud-Dokumente über privaten Supabase Storage
- tägliches Cloud-Backup + Backup-Liste/Wiederherstellung/Download
- lokale Backup-Datei weiterhin möglich
- Jahresmiete mit automatischem 90-Übernachtungen-Zähler
- automatische Zusatzkosten nach Überschreitung des Kontingents
- Erwachsene/Kinder im Vertrag
- Autos und Anhänger mit Anzahl/Jahrespreis
- frei definierbare zusätzliche Positionen in der Jahresmiete
- Fälligkeit der Jahresmiete
- Strom: Anfangs-/Endzählerstand, Preis/kWh, automatische Berechnung
- Stromvergleich mit Vorjahr
- Fristenverwaltung inkl. Anhänger-TÜV, Versicherung usw.
- automatische Vertrags- und Gasprüfungsfristen
- verbessertes Dashboard
- Jahresvergleich der Kosten
- Jahresabschluss/PDF berücksichtigt die neuen Positionen

SUPABASE
Für die neuen Cloud-Funktionen muss die Datei supabase.sql EINMAL vollständig
im SQL Editor deines Supabase-Projekts ausgeführt werden. Danach in der App unter
Einstellungen die Project URL und den Publishable/Anon Key hinterlegen und anmelden.

WICHTIG ZUM 90-NÄCHTE-ZÄHLER
Die App zählt die Übernachtungen aus den eingetragenen Aufenthalten. Bei aktivierter
automatischer Berechnung werden die Nächte oberhalb des Inklusiv-Kontingents mit
der hinterlegten Anzahl Erwachsene/Kinder multipliziert. Falls dein Campingvertrag
anders abrechnet, kann die Berechnung bei der Jahresmiete auf "Manuell" gestellt werden.

VERSION: 21
STAND: 01.10.2026


INSTALLATION ALS APP
- Android/Chrome: In Einstellungen erscheint bei unterstützten Browsern „App installieren“.
- iPhone/iPad: Safari → Teilen → Zum Home-Bildschirm.
- Die App startet danach im Standalone-Modus und funktioniert mit dem Service Worker auch offline.

UPDATEVERHALTEN
- Beim Start prüft CampManager version.json und den Service Worker auf eine neue Version.
- Wenn eine neue Version bereitsteht, erscheint oben ein Update-Hinweis mit „Aktualisieren“.
