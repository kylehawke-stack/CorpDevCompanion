# CorpDev Companion Design System

## Purpose
This doc is the coordination spec between **v0** (frontend) and **Claude Code** (backend).
v0 owns the BriefingPage UI. Claude Code owns the Netlify functions and data pipeline.
Both reference `src/types/index.ts` as the shared data contract.

---

## Theme: Bloomberg Editorial
Dark, data-rich, authoritative. Bloomberg Terminal meets The Economist.

## Colors (5 total)
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0f1419` | Primary dark bg |
| Surface/Cards | `#1a2332` | Card backgrounds with `border #2a3a4e` |
| Accent | `#f97316` | CTAs, highlights, section labels |
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
font-mono text-2xl font-bold text-white
```

### Section Labels
```
uppercase tracking-widest text-[10px] font-semibold text-[#f97316]
```

### Pullquotes (Earnings Call & Analyst)
```
border-l-4 border-[#f97316]
pl-5 py-3
bg-[#f97316]/[0.04] rounded-r-lg
Italic text, speaker attribution below
```

---

## Intelligence Briefing Layout

### Structure (top to bottom)
1. **Company Header** -- left-aligned, logo + name + ticker chip + CEO inline
2. **KPI Strip** -- 4-stat tight row: Revenue, Profitability, Leverage, Firepower
3. **Revenue Mix** -- compact horizontal bar with inline legend
4. **Narrative Cards** -- 2-column grid of 6 analysis cards (observation text only, no headline numbers)
5. **Pullquote Cards** -- full-width Earnings Call Insights + Analyst Perspectives with emphasized quotes
6. **CTA Button** -- Continue to next phase

### Grid Rules
- `max-w-7xl` centered container
- 4-column for KPIs (`grid-cols-2 lg:grid-cols-4`)
- 2-column for narrative cards (`grid-cols-1 lg:grid-cols-2`)
- Full-width for revenue mix and pullquote cards

---

## Data Contract (src/types/index.ts)

### What the backend already provides

**From `analyze-company.mts`** (deterministic, computed from FMP API data):
6 `FinancialHighlight` objects with `{ label, value, detail, observation }`:

| # | label | value example | detail example |
|---|-------|---------------|----------------|
| 1 | Revenue & Growth | $618M | +3.2% YoY growth |
| 2 | Profitability | 24.3% | 8.1% operating margin |
| 3 | Cash Flow & Firepower | $52M | $45M cash on hand |
| 4 | Acquisition Firepower | $123M | $45M cash + $78M est. capacity |
| 5 | Leverage & Capacity | 0.87x | $52M net debt |
| 6 | Acquisitiveness | Selective Buyer | $24M deployed in 2 years |

**Firepower formula** (already in analyze-company.mts line 502):
```
estCapacity = max(FCF * 1.5, 0)
dryPowder = cash + estCapacity
```

**From `generate-briefing.mts`** (AI-generated, same `FinancialHighlight` shape):
3 insight cards:

| # | label | Contains quote? |
|---|-------|-----------------|
| 7 | Earnings Call Insights | YES - attributed CEO/exec quote |
| 8 | Analyst Perspectives | YES - attributed analyst quote |
| 9 | Competitive Positioning | No |

### How the frontend uses the data

The types file exports `BRIEFING_CARD_GROUPS` which maps labels to layout sections:

```typescript
kpiLabels: ['Revenue & Growth', 'Profitability', 'Leverage & Capacity', 'Acquisition Firepower']
narrativeLabels: ['Revenue & Growth', 'Profitability', 'Cash Flow & Firepower', 'Acquisitiveness', 'Leverage & Capacity', 'Competitive Positioning']
pullquoteLabels: ['Earnings Call Insights', 'Analyst Perspectives']
```

- **KPI strip**: Shows only `value` and `detail` from highlights matching `kpiLabels`
- **Narrative cards**: Shows only `observation` from highlights matching `narrativeLabels`
- **Pullquote cards**: Parses quotes from `observation` text via regex for `pullquoteLabels`

### Quote parsing (current approach)
The frontend extracts quotes from observation text using this regex pattern:
```
/(As\s+)?(CEO|CFO|Analyst|...)\s+[Name]+\s+(noted|asked|...):\s*["](quote)["]/
```
This works today but is fragile. A future improvement would be for the backend to return structured `quote` and `speaker` fields.

### Future backend improvements (optional, not blocking)
If Claude Code wants to make quotes more reliable, add to the AI response schema:
```typescript
interface StructuredInsight extends FinancialHighlight {
  quote?: string;    // The extracted quote text
  speaker?: string;  // Attribution (e.g. "CEO Scott Tidey")
}
```
The frontend will prefer structured fields if present, falling back to regex parsing.

---

## File Reference

| File | Owner | Purpose |
|------|-------|---------|
| `src/types/index.ts` | Shared | Data contract (types + card groupings) |
| `src/pages/BriefingPage.tsx` | v0 | Production Intelligence Briefing page |
| `src/pages/BriefingMockup.tsx` | v0 | Static design mockup (viewable at /#mockup) |
| `netlify/functions/analyze-company.mts` | Claude Code | FMP data fetch + 6 computed highlights |
| `netlify/functions/generate-briefing.mts` | Claude Code | AI-generated 3 insight cards + strategic ideas |
| `src/context/GameStateContext.tsx` | Shared | State management, stores highlights + segments |
| `design-system.md` | Shared | This coordination spec |
