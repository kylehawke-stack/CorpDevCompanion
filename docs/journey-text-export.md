# Journey UI -- Proposed Text (Editable)

Edit any text below and return it. I'll build all three components in one shot using your exact copy.

Formatting notes:
- [ZONE LABEL] = small uppercase labels above groups
- [BADGE] = the pill badge shown on each step card
- **Bold** = headings / names
- {placeholder} = dynamic values pulled from data at runtime

---

## MOCKUP 1: How It Works Page (Option B -- Zones layout)

### Page Header

- Label: `HOW IT WORKS`
- Heading: `From financial analysis to M&A shortlist in six steps`
- Subheading: `CorpDev Companion combines rigorous financial analysis with collaborative team input to produce a consensus-driven acquisition strategy. Here is the full process.`

---

### Zone 1: "The system does the homework"

[ZONE LABEL]: `THE SYSTEM DOES THE HOMEWORK`

#### Step 1 -- Analyze

- **Title:** `Company Analysis`
- [BADGE]: `System`
- **Description:** `CorpDev Companion ingests financial statements, earnings calls, analyst coverage, and competitive data to build a complete picture of the company's M&A starting position -- revenue trajectory, margins, leverage, acquisition history, and available firepower.`
- **Outputs:** `Financial highlights` | `Revenue mix breakdown` | `Acquisition firepower estimate` | `Earnings call insights` | `Analyst perspectives`

#### Step 2 -- Benchmark

- **Title:** `Peer Benchmarking`
- [BADGE]: `System`
- **Description:** `Selected competitors are benchmarked across every key metric -- revenue, margins, valuation, returns on capital, leverage, and acquisition firepower. This shows where the company leads, lags, and has room to grow through M&A.`
- **Outputs:** `Peer financial comparison` | `Relative valuation analysis` | `Competitive firepower ranking` | `Key takeaways`

---

### Zone 2: "Your team sets the direction"

[ZONE LABEL]: `YOUR TEAM SETS THE DIRECTION`

#### Step 3 -- Align on Strategy

- **Title:** `Strategic Priorities`
- [BADGE]: `Team Input`
- **Vote info:** `~25 comparisons, ~2 min`
- **Description:** `Your team votes on 6 strategic dimensions using quick pairwise comparisons -- growth objective, target profile, risk posture, integration approach, capability priority, and strategic proximity. Each vote is simply choosing between two options.`
- **Outputs:** `Force-ranked strategic priorities` | `Positioning on each spectrum` | `Team consensus baseline`
- **Flow note:** `Your strategic priorities feed directly into Step 4 to generate relevant market segments.`

#### Step 4 -- Prioritize Markets

- **Title:** `Market Segments`
- [BADGE]: `Team Input`
- **Vote info:** `~50 comparisons, ~5 min`
- **Description:** `Based on your strategic priorities, CorpDev Companion generates relevant market segments and product categories. Your team compares pairs to identify the most promising areas for acquisition -- narrowing a broad landscape into focused hunting grounds.`
- **Outputs:** `Ranked market segments` | `Ranked product categories` | `Refined search parameters`
- **Flow note:** `Your top segments and categories feed into Step 5 to identify specific companies.`

#### Step 5 -- Identify Targets

- **Title:** `Target Companies`
- [BADGE]: `Team Input`
- **Vote info:** `Open-ended, add more anytime`
- **Description:** `From your top segments and categories, CorpDev Companion identifies specific acquisition targets. Your team compares companies head-to-head to build a ranked shortlist grounded in both strategic alignment and team consensus.`
- **Outputs:** `Ranked target companies` | `Head-to-head comparison data` | `Consensus-driven shortlist`
- **Flow note:** `Your ranked targets become the foundation of the final strategic brief.`

---

### Zone 3: "The deliverable"

[ZONE LABEL]: `THE DELIVERABLE`

#### Step 6 -- Strategic Brief

- **Title:** `Strategic Brief`
- [BADGE]: `Output`
- **Description:** `All votes are synthesized into a comprehensive strategic brief -- force-ranked priorities, market focus areas, and target companies, informed by external M&A best practices. This is the artifact your team takes into deal discussions.`
- **Outputs:** `Force-ranked results across all tiers` | `Strategic narrative` | `M&A best practices alignment`

---

### Pairwise Voting Explainer Section

- [ZONE LABEL]: `WHY PAIRWISE COMPARISONS?`
- **Heading:** `Making the complex simple`
- **Body:** `Instead of asking people to rank a long list (which is slow and cognitively exhausting), we show two options at a time. Just pick the one you think matters more. That is it.`

- **Bullet 1 -- Fast:** `Each comparison takes a few seconds, not minutes`
- **Bullet 2 -- Intuitive:** `No complex scoring rubrics or forced ranking`
- **Bullet 3 -- Rigorous:** `Bradley-Terry model produces statistically valid rankings from simple inputs`
- **Bullet 4 -- Collaborative:** `Multiple team members vote independently, results aggregate automatically`

Example comparison card:
- Option A: `Market Share Consolidation` (dimension: `Growth Objective`)
- Option B: `Category Extension` (dimension: `Growth Objective`)
- Caption: `Just tap the option that matters more to your M&A strategy`

---

### Invite Teammates Section

- [ZONE LABEL]: `BETTER TOGETHER`
- **Heading:** `Invite your team`
- **Body:** `The more people who vote, the more reliable the consensus rankings become. Share the session code with colleagues so they can contribute their own comparisons. All votes are aggregated into a single consensus ranking.`

Confidence thresholds:
- `25+ votes` -- `Directional`
- `50+ votes` -- `Strong signal`
- `100+ votes` -- `High confidence`

- Session code display: `{sessionCode}` (e.g. `AFBK3UCR`)
- Button: `Copy invite link`
- Caption: `Anyone with the code can join and vote`

---

### CTA

- Button: `Begin Step 3: Strategic Priorities`
- Caption: `6 dimensions, ~25 comparisons, ~2 minutes`

---
---

## MOCKUP 2: Header Progress Tracker (Option A -- Pips)

Six numbered circles connected by thin lines. Completed steps show a checkmark. Current step is enlarged with a label underneath.

Step labels (shown only when that step is current):
1. `Analyze`
2. `Benchmark`
3. `Strategy`
4. `Markets`
5. `Targets`
6. `Brief`

Info icon tooltip (on hover): `View full process`

---
---

## MOCKUP 3: Process Popup (Vertical, grouped into 3 zones)

### Popup Header

- Label: `PROCESS OVERVIEW`
- Subtitle: `Step {currentStep} of 6`

---

### Zone 1: "Foundation"

[ZONE LABEL]: `FOUNDATION`

**Step 1 -- Company Analysis**
- Status when done: `Complete`
- Status when current: `Current`
- Current-step description: `Analyzing financial statements, earnings calls, and competitive data.`

**Step 2 -- Peer Benchmarking**
- Current-step description: `Comparing metrics against selected peer companies.`

---

### Zone 2: "Team Alignment"

[ZONE LABEL]: `TEAM ALIGNMENT`

**Step 3 -- Strategic Priorities**
- Current-step description: `Vote on 6 strategic dimensions to set the M&A direction.`

**Step 4 -- Market Segments**
- Current-step description: `Compare market segments and product categories generated from your strategic priorities.`

**Step 5 -- Target Companies**
- Current-step description: `Compare specific acquisition targets generated from your top segments.`

---

### Zone 3: "Deliverable"

[ZONE LABEL]: `DELIVERABLE`

**Step 6 -- Strategic Brief**
- Current-step description: `Review force-ranked results and the consensus-driven strategic brief.`

---

### Popup Footer

- Left: `{N} steps remaining` (or `Process complete`)
- Right: `Close` button
