# GERY Wealth Overview — Verbesserungsplan
_Stand: 05.03.2026 · Warte auf Freigabe_

---

## 🔴 KRITISCHE BUGS (Sofort beheben)

### BUG 1 — Kaufdatum bei Crypto-PDF ist immer das Auszugsdatum
**Problem:** Der Cryptoauszug von Trade Republic ist eine **Momentaufnahme** — er zeigt deine aktuellen Bestände, aber NICHT das ursprüngliche Kaufdatum jeder Einheit. Die KI trägt daher das Auszugsdatum (z.B. 04.03.2026) als Kaufdatum ein, was steuerlich falsch ist.

**Fix:**
- PDF-Prompt klarstellen: `date` = Auszugsdatum (Platzhalter, muss manuell korrigiert werden)
- Gelbe Warnung beim Import: "⚠ Kaufdatum ist das Auszugsdatum — bitte für jeden Kauf manuell anpassen!"
- Empfehlung: Bison CSV oder Kontoauszug (37 Seiten) verwenden für genaue Kaufdaten

---

### BUG 2 — Depotauszug Import scheitert / doppelte Einträge
**Problem:** Die Duplikat-Erkennung prüft aktuell: `ISIN + exakt gleiche Stückzahl`. Wenn der Kurs oder die Menge sich leicht geändert hat, wird dasselbe Asset nochmals importiert.

**Fix:** Für Depotauszüge: Duplikat-Check nur per **ISIN** (ohne Qty-Vergleich). Falls ISIN bereits vorhanden → Skip + Info "Position bereits im Portfolio (ISIN: ...)". Falls kein ISIN → Asset-Name-basierter Check.

---

### BUG 3 — Crypto-PDF: Positionen werden doppelt aufgeführt
**Zwei Teilprobleme:**

**3a — Gleicher Upload erkannt nicht als Duplikat:**
Wenn du dieselbe PDF zweimal hochlädst, erkennt die App das nicht, weil sich Kurse geändert haben könnten.

Fix: Upload-Fingerprint speichern (Dateiname + Auszugsdatum + Broker). Wenn gleicher Fingerprint nochmal hochgeladen → Warnung "Diese PDF wurde bereits importiert (04.03.2026 Trade Republic)".

**3b — Mehrere Käufe des gleichen Assets sollen zusammengefasst werden:**
Beispiel: Du hast BTC 3x gekauft à €500 (Lot A), €600 (Lot B), €700 (Lot C). Die App speichert drei Zeilen — richtig für FIFO. Aber das Portfolio soll **eine** Zeile zeigen:
- `BTC · 0.03 Stk. · Ø EK: €600 · Wert: €2.475 · G&V: +€675`
- Mit Expandier-Funktion um einzelne Lots zu sehen

---

### BUG 4 — CSV-Import: Nicht nutzbare Transaktionstypen verursachen Verwirrung
**Problem:** Der aktuelle CSV-Import versucht alle Zeilen zu importieren, einschließlich Deposits (EUR-Einzahlungen), Withdrawals, und Sells — die kein Portfolio-Asset darstellen und Fehler/Verwirrung erzeugen.

**Fix (Teil von Feature 6 unten):** Klare Filterlogik beim Bison-CSV-Import:
- ✅ `Buy` + `Asset` nicht leer → importieren als Lot
- ✅ `Deposit` + `Asset` nicht leer (z.B. BTC-Transfer rein) → importieren als Lot zum Marktpreis
- ❌ `Deposit` + nur EUR (kein Asset) → überspringen (nur Geldeinzahlung)
- ❌ `Withdraw` + nur EUR → überspringen (nur Geldauszahlung)
- ❌ `Sell` → überspringen beim Portfolio-Import (für spätere Gewinn/Verlust-Auswertung vormerken)

---

## 🟡 NEUE FEATURES (nach Freigabe)

### FEATURE 1 — Browser-Tab Logo (Favicon) + Logo als Home-Button

**1a — Favicon (Browser-Tab):**
Eine Zeile im `<head>` mit einem SVG-Favicon (Gold-Diamant ◆ oder 💰-Emoji):
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>">
```

**1b — Logo oben links = Home-Button:**
Das GERY-Logo / der App-Name oben links in der Navigationsleiste ist aktuell nur Text — kein klickbares Element. Fix: Logo mit `onclick="showPage('dashboard', null)"` versehen + Cursor Pointer + leichter Hover-Effekt, sodass ein Klick darauf immer zur Dashboard-Übersicht zurückführt. Standard-UX-Pattern das Nutzer intuitiv erwarten.

---

### FEATURE 2 — FIFO Lot-Tracking + Steuerfreier Exit

**Konzept:** Jeder Kauf = ein "Lot" (bereits so gespeichert). Neu: Aggregierte Ansicht im Portfolio + FIFO-Status pro Lot.

Portfolio-Tabelle zeigt aggregierte Zeile (Asset, Gesamt-Qty, Durchschnitts-EK, G&V). Expandierbar zeigt einzelne Lots mit:
- Kaufdatum, Stückzahl, Kaufpreis pro Stück
- 🟢 "Steuerfrei" (Haltefrist abgelaufen) oder 🔴 "Noch X Tage" (Countdown bis steuerfreier Exit)
- Steuer-Typ: §23 EStG (Crypto/Edelmetalle) vs. Abgeltungssteuer (Aktien/ETF)

---

### FEATURE 3 — Potenzielle Steuer bei Verkauf jetzt

**Deutsches Steuerrecht — Zusammenfassung der Recherche:**

| Asset-Typ | Haltefrist | Steuersatz (kurz) | Steuersatz (lang) | Freibetrag |
|---|---|---|---|---|
| **Krypto** (§23 EStG) | 12 Monate | Grenzsteuersatz (~42%) + Soli | **0% (steuerfrei)** | €1.000/Jahr |
| **Aktien** (§20 EStG) | keine | 25% + Soli = **26,375%** | 25% + Soli = **26,375%** | €1.000/Jahr (Sparerpauschbetrag) |
| **ETFs** (InvStG) | keine | 26,375% (30% Teilfreistellung) | 26,375% (30% Teilfreistellung) | €1.000/Jahr |
| **Edelmetalle** (§23 EStG) | 12 Monate | Grenzsteuersatz + Soli | **0% (steuerfrei)** | €600/Jahr |

**Berechnung "Potenzielle Steuer":**
```
Gewinn = (Aktueller Kurs × Menge) − (Kaufpreis × Menge)
→ Krypto < 12 Monate: Steuer = Gewinn × 0,42 (Grenzsteuersatz Annahme)
→ Krypto > 12 Monate: Steuer = 0
→ Aktien/ETF: Steuer = Gewinn × 0,26375
→ ETF: 30% des Gewinns steuerfrei (Teilfreistellung)
→ Freibetrag abziehen (user-konfigurierbar, Standard: €1.000)
```

**Implementation:** Neues Feld in der Portfolio-Tabelle: "Est. Steuer" mit Tooltip-Erklärung. Plus: Dashboard-Kachel "Geschätzte Steuerlast (bei Verkauf heute)".

---

### FEATURE 4 — Kontoauszug-Import (Trade Republic PDF — Transaktionsliste)

Der Kontoauszug (37 Seiten) enthält alle echten Kauf- und Verkaufs-Transaktionen mit exakten Daten. Das ist die **wertvollste Datenquelle** für FIFO-Tracking bei Trade Republic.

**Neuer Import-Flow:**
1. PDF hochladen → KI erkennt Kontoauszug-Format
2. Filtert nur "Kauf" / "Sparplan" Transaktionen (Sells, Einzahlungen ignorieren)
3. Jede Transaktion = ein Lot mit echtem Kaufdatum
4. Zeigt Vorschau: "37 Kauftransaktionen gefunden"
5. Transaction-ID-basierte Duplikat-Prüfung verhindert Doppelimport

---

### FEATURE 5 — Vorabpauschale-Rechner (ETF)

Für Nutzer mit ETFs: Jährliche Steuer auf nicht-ausgeschüttete Wertsteigerungen (auch wenn nicht verkauft).

**Formel 2025:** Basiszins 2,53% × Fondswert × 70% (Teilfreistellung) = Vorabpauschale × 26,375%

Neues Widget auf der Dashboard-Seite: "Voraussichtliche Vorabpauschale 2025: €XXX"

---

### FEATURE 6 — Position bearbeiten: Kaufdatum + Felder manuell editieren ⭐ NEU

**Problem:** Wenn Positionen via PDF-Import oder manuell eingegeben werden, gibt es aktuell keinen Weg das Kaufdatum (oder andere Felder) nachträglich zu korrigieren — nur Löschen und neu eingeben. Da Kaufdatum nicht automatisch aus dem Cryptoauszug/Depotauszug gelesen werden kann, muss der User es manuell korrigieren können.

**Fix: ✏️ Edit-Button pro Portfolio-Zeile**

Jede Zeile in der Portfolio-Tabelle bekommt einen kleinen ✏️-Button neben dem bestehenden 🗑️-Löschen-Button. Klick öffnet ein Edit-Modal mit allen Feldern vorausgefüllt:

```
┌─ Position bearbeiten ────────────────────────┐
│ Asset:      [BTC          ]                  │
│ Typ:        [Krypto    ▾  ]                  │
│ Menge:      [0.02500000   ]                  │
│ Kaufpreis:  [42.059,27 €  ]                  │
│ Kaufdatum:  [2021-05-14   ] ← wichtigstes Feld│
│ Plattform:  [Bison        ]                  │
│ Notiz:      [              ]                  │
│                                              │
│         [Abbrechen]  [✓ Speichern]           │
└──────────────────────────────────────────────┘
```

**Besonders wichtig für:** Korrekte Haltefrist-Berechnung (steuerfreier Exit nach 1 Jahr) — ein falsches Kaufdatum führt zu falscher Steuereinschätzung.

**Verhalten nach Speichern:** Portfolio sofort aktualisieren, G&V und Steuerberechnung neu berechnen.

---

### FEATURE 7 — Bison CSV-Import (Überarbeitung + Bereinigung) ⭐ NEU

**Hintergrund:** Bison exportiert eine `transactionhistory.csv` mit vollständiger Transaktionshistorie — das ist die **idealste Datenquelle** für FIFO-Tracking (echte Kaufdaten, genaue Preise, Transaction-IDs).

**Analysiertes CSV-Format (`transactionhistory.csv`):**
```
Transaction ID; Transaction type; Currency; Asset; Eur (amount); Asset (amount); Asset (market price); Fee; Date (UTC)
```

**Alle Transaktionstypen im CSV:**
| Typ | Beschreibung | Im Portfolio? |
|---|---|---|
| `Buy` | Kauf mit EUR | ✅ **Importieren** als Lot |
| `Deposit` + Asset (z.B. BTC) | Crypto-Transfer rein | ✅ **Importieren** zum Marktpreis |
| `Deposit` + nur EUR (kein Asset) | Geldeinzahlung | ❌ **Überspringen** |
| `Withdraw` + nur EUR | Geldauszahlung | ❌ **Überspringen** |
| `Sell` | Verkauf | ❌ **Überspringen** (für jetzt) |

**Field-Mapping für Imports:**
```
Asset            → asset (uppercase: "Btc" → "BTC", "Sol" → "SOL")
Asset (amount)   → qty
Asset (market price) → buyPrice (genauer als Eur/qty)
Date (UTC)       → date (Format: "2024-01-01 14:28:55" → "2024-01-01")
Transaction ID   → txId (für Duplikat-Prüfung: gleiche ID nie zweimal)
```

**Duplikat-Prüfung:** Per `Transaction ID` — jede Transaktion hat eine eindeutige UUID. Wenn dieselbe CSV nochmals hochgeladen wird, werden bereits importierte IDs übersprungen statt doppelt eingefügt.

**Vorschau vor Import:**
```
📊 transactionhistory.csv · 47 Transaktionen analysiert
  ✅ 38 Käufe → werden importiert (BTC × 15, ETH × 8, SOL × 9, ...)
  ⏭  9 Zeilen übersprungen (5 EUR-Einzahlungen, 3 Verkäufe, 1 Auszahlung)
  ⏭  0 Duplikate (bereits importierte Transaction-IDs)
```

**Bereinigung des bestehenden CSV-Import-Tabs:** Der aktuelle Import-Tab zeigt sowohl "TradeRepublik CSV" als auch "Bison CSV" als separate Optionen — beide mit unscharfer Logik. Fix: Klare einzelne Option "Bison Transaction History CSV" mit der obigen Logik ersetzen.

---

## 🔵 APP-QUALITÄT & SONSTIGES

### QUALITÄT 1 — Gemini PDF-Import funktioniert nicht gut
**Problem:** Das Anthropic-PDF-Format (`type:'document'`) funktioniert nur mit Claude. GPT und Gemini haben andere Formate.

**Fix:** Im Netlify-Proxy: Bei Gemini/GPT das PDF zunächst in Base64 → Text extrahieren (via pdf-parse Bibliothek), dann als Text an die KI schicken. Alternativ: PDF-Import immer über Claude-API routen (Fallback falls kein Claude-Key).

### QUALITÄT 2 — Portfolio-Chart (Wertentwicklung)
Zeitachsen-Chart der Gesamtportfolio-Performance. Berechnet aus historischen Trades + aktuellen Kursen. Einfache Liniengrafik mit Chart.js.

### QUALITÄT 3 — Kurs-Alerts für Aktien
Aktuelle Kurs-Alerts funktionieren nur für Krypto (CoinGecko). Erweitern auf Aktien via Yahoo Finance (Stock Watchlist Ticker → Alert verknüpfen).

### QUALITÄT 4 — Export (CSV / PDF-Report)
"Portfolio exportieren" → CSV-Download aller Positionen + Lots. Ideal für Steuerberater-Übergabe.

### QUALITÄT 5 — Mobile-Optimierung
Portfolio-Tabelle auf kleinen Bildschirmen schwer lesbar (viele Spalten). → Responsive "Card"-Ansicht auf Mobile.

### QUALITÄT 6 — Offline-Funktion (PWA)
Service Worker + Manifest → App kann auf dem Homescreen gespeichert werden, lädt auch offline.

### QUALITÄT 7 — News-Feed nach Asset gefiltert
Auf der Marktanalyse-Seite: Google News / RSS für die gehaltenen Assets (z.B. "NVIDIA Nachrichten").

---

## 📋 PRIORISIERUNG (Vorschlag)

| Priorität | Item | Aufwand | Wert |
|---|---|---|---|
| 🔴 P0 | Bug 1: Kaufdatum-Warnung | 30 min | Hoch |
| 🔴 P0 | Bug 2: Depotauszug Duplikat-Fix | 30 min | Hoch |
| 🔴 P0 | Bug 3a: PDF-Fingerprint Duplikat | 45 min | Hoch |
| 🔴 P0 | Bug 4: CSV-Import Filterlogik bereinigen | 30 min | Hoch |
| 🟡 P1 | Feature 1: Favicon | 5 min | Quick Win |
| 🟡 P1 | Feature 6: Edit-Button (Kaufdatum manuell) | 1h | Sehr Hoch |
| 🟡 P1 | Feature 7: Bison CSV-Import (neu) | 2h | Sehr Hoch |
| 🟡 P1 | Feature 3: Potenzielle Steuer | 3h | Sehr Hoch |
| 🟡 P1 | Feature 2: FIFO Lot-View | 4h | Sehr Hoch |
| 🟡 P2 | Bug 3b: Aggregierte Portfolio-View | 2h | Hoch |
| 🟡 P2 | Feature 4: Kontoauszug-Import | 3h | Hoch |
| 🔵 P3 | Qualität 1: Gemini PDF-Fix | 2h | Mittel |
| 🔵 P3 | Feature 5: Vorabpauschale | 1h | Mittel |
| 🔵 P3 | Qualität 2: Portfolio-Chart | 2h | Mittel |
| 🔵 P3 | Qualität 3: Aktien-Alerts | 1h | Mittel |
| 🔵 P4 | Qualität 4: CSV-Export | 1h | Mittel |
| 🔵 P4 | Qualität 5: Mobile-Optimierung | 3h | Mittel |
| 🔵 P4 | Qualität 6: PWA Offline | 2h | Gering |
| 🔵 P4 | Qualität 7: News-Feed | 2h | Gering |

---

## 🇩🇪 STEUERRECHT — Detailquellen

- **Krypto:** §23 Abs. 1 S. 1 Nr. 2 EStG · BMF-Schreiben 06.03.2025 · Haltefrist 1 Jahr · FIFO per Wallet
- **Aktien/ETF:** §20 EStG · 25% + 5,5% Soli = 26,375% · kein Haltefristen-Vorteil · Sparerpauschbetrag €1.000
- **ETF Besonderheit:** §20 InvStG · 30% Teilfreistellung auf Equity-ETFs · Vorabpauschale jährlich
- **Edelmetalle:** §23 EStG (wie Krypto) · Haltefrist 1 Jahr · Freibetrag €600 (nicht €1.000!)
- **FIFO:** Standard-Methode lt. BMF · Per Depot-/Wallet-Basis getrennt

_Hinweis: Dies ist keine Steuerberatung. Für verbindliche Auskünfte bitte Steuerberater konsultieren._
