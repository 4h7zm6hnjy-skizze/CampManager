CampManager v63 – Reparaturupdate

BEHOBEN 1 – JAHRESABSCHLUSS:
- „Jahresabschluss öffnen“ wird NICHT mehr durch das Add-on abgefangen.
- Dadurch öffnet sich der Jahresabschluss wieder mit der originalen CampManager-Funktion.
- Erst wenn im geöffneten Jahresabschluss auf „PDF speichern“ getippt wird, fragt CampManager:
  „Sollen alle Rechnungen und Dokumente des gewählten Jahres mit in die PDF aufgenommen werden?“
- Ja: Rechnungen/Dokumente werden als Anlagen angehängt.
- Nein: normale Jahresabschluss-PDF.
- Abbrechen: keine PDF wird gespeichert.

BEHOBEN 2 – RECHNUNGEN / BELEGE:
- Belege werden jetzt direkt im Dokumentenspeicher gespeichert.
- Die alte Umleitung über die Versicherungsfunktion wurde entfernt.
- In der Kosten-Übersicht gibt es bei jedem Kostenpunkt direkte Schaltflächen:
  „📷 Rechnung“ und „🖼️ Mediathek“.
- Zusätzlich gibt es in den einzelnen Kostenbereichen eigene Belegbereiche mit:
  „📷 Foto aufnehmen“, „🖼️ Aus Mediathek“ und „📁 Datei / PDF“.
- Unter „Kosten“ werden Reparaturen, Neuanschaffungen und Sonstiges getrennt geführt.
- Unterstützte Kostenstellen:
  Jahresmiete/Jahresbeitrag, Kaution, Versicherung, Steuer, Ratenzahlung,
  Strom/Zählermiete, Fahrten, Reparaturen, Neuanschaffungen, Sonstiges,
  Petroleum, Gas/Gasflaschen, Gasprüfung und Verträge.
- Gespeicherte Belege können geöffnet, bearbeitet und gelöscht werden.

WICHTIG:
- Bestehende CampManager-Daten werden nicht gelöscht.
- index.html muss für dieses Reparaturupdate NICHT ersetzt werden.

INSTALLATION AUF GITHUB:
1. cost-receipts.js im Hauptverzeichnis durch die v63-Datei ersetzen.
2. sw.js im Hauptverzeichnis durch die v63-Datei ersetzen.
3. Beide Dateien wirklich überschreiben, nicht als „cost-receipts (1).js“ oder „sw (1).js“ hochladen.
4. CampManager auf dem iPhone vollständig schließen.
5. Die Web-App/Seite einmal online neu öffnen und neu laden.
6. Danach die Home-Screen-App erneut öffnen.

Falls noch v62 angezeigt wird, ist noch der alte Service-Worker-Cache aktiv. Nach dem erneuten Online-Laden sollte oben v63 erscheinen.
