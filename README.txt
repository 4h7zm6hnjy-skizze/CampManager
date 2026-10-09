CampManager v65

Komplette Reparaturversion auf Basis der stabilen v60-Komplettversion.

Schwerpunkte:
- Jahresabschluss öffnen, als PDF speichern und drucken
- Auswahl mit/ohne Rechnungen und Dokumente
- Rechnungs- und Belegverwaltung an allen Kostenstellen
- PWA-Updateprüfung und Versionsgleichstand repariert
- Service Worker ohne nachträgliche Script-Injektion
- Datenmigration aus v60 und älteren Versionen
- korrigierte Auto-Tariflogik

Technische Prüfungen vor Auslieferung:
- JavaScript-Syntax von index.html, sw.js und cost-receipts.js geprüft
- Start-/Render-Smoke-Test in einer simulierten Browser-Umgebung erfolgreich
- Update-/Versionstest v65 erfolgreich
- Export-Abfrage für PDF sichtbar getestet
- Basis-Jahresabschluss-PDF programmgesteuert erzeugt und gerendert

Die vollständige Bedienung auf einem realen iPhone/PWA konnte in dieser Laufzeitumgebung nicht automatisiert werden.
