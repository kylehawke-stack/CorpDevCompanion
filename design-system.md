# CorpDev Companion Design System

## Theme: Bloomberg Editorial
Dark, data-rich, authoritative. Think Bloomberg Terminal meets The Economist.

## Colors (5 total)
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0f1419` | Primary dark bg (`surface-base`) |
| Surface/Cards | `#1a2332` | Card backgrounds with `border #2a3a4e` |
| Accent | `#f97316` | CTAs, highlights, active states, section labels |
| Text primary | `#e2e8f0` | Headings, important values |
| Text muted | `#64748b` | Labels, secondary info |

## Fonts
- **Headings + body**: Inter (`font-sans`)
- **Data/metrics/monospace**: JetBrains Mono (`font-mono`)

## Component Patterns

### Cards
```
bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6
```

### KPI Values
```
font-mono text-3xl font-bold text-white
```

### Section Labels
```
uppercase tracking-widest text-xs text-[#f97316]
```

### Signal Badges
Small pills with colored dots:
- Green dot = positive / bullish
- Amber dot = warning / neutral
- Red dot = negative / bearish

### Pullquotes (Earnings Call & Analyst)
```
Orange left border (border-l-4 border-[#f97316])
Italic text
Tinted background (bg-[#f97316]/5 or similar)
Speaker attribution below quote
```

## Intelligence Briefing Layout

### Structure (top to bottom)
1. **Company Header** — logo, name, sector, ticker, market cap
2. **KPI Strip** — 4-stat tight row: Revenue, Margin, Leverage, Firepower
3. **Two-Column Grid** — narrative cards side by side
   - Revenue & Growth + Revenue Mix (stacked bar compact)
   - Profitability + Cash Flow & Firepower
   - Acquisitiveness + Competitive Positioning
4. **Pullquote Section** — Earnings Call Insights + Analyst Perspectives
   - Large italic quotes with orange left border
   - Proper speaker attribution
   - These are the visual anchors at bottom of page
5. **CTA Button** — Continue to next phase

### Grid Rules
- `max-w-7xl` centered container
- 2-column grid for narrative cards
- 4-column strip for KPIs
- Full-width for pullquote cards

### Visual Signal Badges
Each card gets a sentiment indicator:
- `Bullish` — green dot + text
- `Neutral` — amber dot + text
- `Bearish` — red dot + text
Based on the financial observation sentiment
