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
- Heading: `Expert guidance and team alignment on your M&A strategy`
- Subheading: `Corp Dev Companion combines rigorous financial and market analysis with collaborative team input to produce a consensus-driven acquisition strategy. Here is the full process.`

---

### Zone 1: "The system does the homework"

[ZONE LABEL]: `THE SYSTEM DOES THE HOMEWORK`

#### Step 1 -- Analyze

- **Title:** `Company Analysis`
- [BADGE]: `System`
- **Description:** `Corp Dev Companion ingests your company's financial statements, earnings calls, analyst coverage, and competitive data to build a complete picture of the company's M&A starting position -- revenue trajectory, margins, leverage, acquisition history, and available firepower.`
- **Outputs:** `Financial highlights` | `Revenue mix breakdown` | `Acquisition firepower estimate` | `Earnings call insights` | `Analyst perspectives`

#### Step 2 -- Benchmark

- **Title:** `Peer Benchmarking`
- [BADGE]: `System`
- **Description:** `Selected competitors are benchmarked across the same key metric -- revenue, margins, valuation, returns on capital, leverage, and acquisition firepower. This shows where the company leads, lags, and has room to grow through M&A.`
- **Outputs:** `Peer financial comparison` | `Relative valuation analysis` | `Historical acquisitiveness` | `Competitive firepower ranking` 

---

### Zone 2: "Your team sets the direction"

[ZONE LABEL]: `YOUR TEAM SETS THE DIRECTION`

#### Step 3 -- Align on Strategy

- **Title:** `Strategic Priorities`
- [BADGE]: `Team Input`
- **Vote info:** `Decide how you want to use M&A`
- **Description:** `Your team votes on 6 strategic dimensions using quick pairwise comparisons -- growth objective, target profile, risk posture, integration approach, capability priority, and strategic proximity. Each vote is simply choosing between two options.`
- **Outputs:** `Force-ranked strategic priorities` | `Positioning on each spectrum` | `Team consensus baseline`
- **Flow note:** `Your strategic priorities inform Step 4.`

#### Step 4 -- Prioritize Markets

- **Title:** `Market Segments and Product Categories`
- [BADGE]: `Team Input`
- **Vote info:** `Prioritize and narrow down where you use M&A`
- **Description:** `Based on your strategic priorities, Corp Dev Companion generates relevant market segments and product categories. Your team compares pairs to identify the most promising areas for acquisition. New adjacencies are injected real-time based on your voting.`
- **Outputs:** `Ranked market segments` | `Ranked product categories` | `Refined search parameters`
- **Flow note:** `Your top segments and categories feed into Step 5.`

#### Step 5 -- Identify Targets

- **Title:** `Target Companies`
- [BADGE]: `Team Input`
- **Vote info:** `Prioritize and rank the universe of relevant targets`
- **Description:** `From your top segments and categories, Corp Dev Companion identifies specific acquisition targets. Your team compares companies head-to-head to build a ranked shortlist grounded in both strategic alignment and team consensus.`
- **Outputs:** `Ranked target companies` | `Head-to-head comparison data` | `Consensus-driven shortlist`
- **Flow note:** `Your ranked targets are aligned with the team prior to outreach.`

---

### Zone 3: "The deliverable"

[ZONE LABEL]: `SUMMARIZE AND SYNTHESIZE THE RESULT`

#### Step 6 -- Strategic Brief

- **Title:** `Strategic Brief`
- [BADGE]: `Output`
- **Description:** `All votes are synthesized into a comprehensive strategic brief which is informed by your personalized starting point, team alignment, and proven M&A best practices. This is your M&A strategy - a north star to guide all deal discussions.`
- **Outputs:** `Force-ranked priorities` | `Aligned executive team` | `M&A "North Star"` | `Strategic narrative for deal discussions` |  `M&A best practices`

---

### Pairwise Voting Explainer Section

- [ZONE LABEL]: `WHY PAIRWISE COMPARISONS?`
- **Heading:** `Make the complex simple`
- **Body:** `Instead of endless meetings, Powerpoints, and debates, M&A strategy is boiled down to something super simple: pick the better of two options... many times. Proven statistical models do the rest.`

- **Bullet 1 -- Fast:** `Each comparison takes a few seconds, not an hour long meeting`
- **Bullet 2 -- Intuitive:** `No complex scoring rubrics subject to individual bias`
- **Bullet 3 -- Rigorous:** `Proven model ("Bradley-Terry") produces statistically valid rankings from many votes`
- **Bullet 4 -- Collaborative:** `Multiple team members vote independently, results aggregate real-time`

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
- `25+ votes / 2 people` -- `Directional`
- `50+ votes / 3 people` -- `Strong signal`
- `100+ votes / 5 people` -- `High confidence`

- Session code display: `{sessionCode}` (e.g. `AFBK3UCR`)
- Button: `Copy invite link`
- Caption: `Anyone with the code can join and vote`

---

### CTA

- Button: `Begin Step 3: Strategic Priorities`
- Caption: `6 dimensions, ~25 comparisons, ~5 minutes per person`

---
---

## MOCKUP 2: Header Progress Tracker (Option A -- Pips)

Six numbered circles connected by thin lines. Completed steps show a checkmark. Current step is enlarged with a label underneath.

Step labels (shown only when that step is current):
1. `Analyze Starting Point`
2. `Benchmark Peers`
3. `Set Strategy`
4. `Prioritize Markets`
5. `Prioritize Targets`
6. `Summarize Result`

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
- Current-step description: `Create and refine your M&A strategy - a "North Star" to guide all M&A activity and deal discussions.`

---

### Popup Footer

- Left: `{N} steps remaining` (or `Process complete`)
- Right: `Close` button
