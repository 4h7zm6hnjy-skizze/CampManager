CampManager v56 – Kfz-Tarif-Hotfix

Korrektur:
- Das Auto ist ein eigener Kostenpunkt.
- Die tatsächlichen Stellplatz-Übernachtungen bestimmen nur die Kfz-Tarifstufe:
  0–90 / 91–180 / 181–365.
- Berechnung: Anzahl Autos × Tarif der erreichten Stufe.
- Das Auto wird NICHT unter Personen abgerechnet.
- Die Personenauswahl beeinflusst die Kfz-Kosten nicht.

Beispiel:
122 Übernachtungen + 1 Auto + Kfz-Tarif 91–180 = 80,00 €
=> Auto = 1 × 80,00 € = 80,00 €.

Installation:
1. sw.js und version.json in deinem GitHub-Projekt ersetzen.
2. Web-App öffnen.
3. Falls „Neue CampManager-Version verfügbar“ erscheint: Aktualisieren tippen.
4. Falls nötig App einmal vollständig schließen und erneut öffnen.

Hinweis:
Der direkte GitHub-Schreibzugriff war beim Erstellen dieses Hotfixes mit HTTP 403 blockiert.
Darum wird die Korrektur über den Service Worker auf die vorhandene v55 angewendet, ohne deine bestehenden Daten zu verändern.
