import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';

// ── Realistic HBB + peers data from FMP ──
const TARGET = 'HBB';

interface Peer {
  symbol: string;
  name: string;
  revenue: number;
  grossMarginPct: number;
  operatingMarginPct: number;
  netMarginPct: number;
  ebitda: number;
  ebitdaMarginPct: number;
  marketCap: number;
  peRatio: number | null;
  evToEbitda: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  employees: number | null;
  // New fields from expanded PeerFinancials
  freeCashFlow: number | null;
  cashAndCashEquivalents: number | null;
  totalDebt: number | null;
  interestCoverage: number | null;
  roic: number | null;
  revenueGrowthPct: number | null;
  acquisitionsNet: number | null;
}

const PEERS: Peer[] = [
  { symbol: 'HBB', name: 'Hamilton Beach Brands', revenue: 618_000_000, grossMarginPct: 24.3, operatingMarginPct: 8.1, netMarginPct: 5.2, ebitda: 72_000_000, ebitdaMarginPct: 11.7, marketCap: 400_000_000, peRatio: 12.4, evToEbitda: 6.3, returnOnEquity: 22.1, debtToEquity: 0.87, currentRatio: 1.45, employees: 4200, freeCashFlow: 52_000_000, cashAndCashEquivalents: 45_000_000, totalDebt: 52_000_000, interestCoverage: 8.2, roic: 18.4, revenueGrowthPct: 3.2, acquisitionsNet: -12_000_000 },
  { symbol: 'LCUT', name: 'Lifetime Brands', revenue: 680_000_000, grossMarginPct: 36.2, operatingMarginPct: 4.8, netMarginPct: 0.9, ebitda: 56_000_000, ebitdaMarginPct: 8.2, marketCap: 135_000_000, peRatio: 68.2, evToEbitda: 7.1, returnOnEquity: 2.8, debtToEquity: 1.92, currentRatio: 2.12, employees: 2800, freeCashFlow: 28_000_000, cashAndCashEquivalents: 18_000_000, totalDebt: 248_000_000, interestCoverage: 2.1, roic: 3.5, revenueGrowthPct: -1.8, acquisitionsNet: -5_000_000 },
  { symbol: 'LOVE', name: 'The Lovesac Company', revenue: 620_000_000, grossMarginPct: 57.8, operatingMarginPct: 5.2, netMarginPct: 3.8, ebitda: 48_000_000, ebitdaMarginPct: 7.7, marketCap: 490_000_000, peRatio: 20.8, evToEbitda: 10.2, returnOnEquity: 14.2, debtToEquity: 0.15, currentRatio: 1.88, employees: 1200, freeCashFlow: 38_000_000, cashAndCashEquivalents: 85_000_000, totalDebt: 12_000_000, interestCoverage: 42.5, roic: 12.1, revenueGrowthPct: 8.4, acquisitionsNet: 0 },
  { symbol: 'IRBT', name: 'iRobot Corporation', revenue: 890_000_000, grossMarginPct: 22.1, operatingMarginPct: -8.5, netMarginPct: -11.2, ebitda: -45_000_000, ebitdaMarginPct: -5.1, marketCap: 190_000_000, peRatio: null, evToEbitda: null, returnOnEquity: -48.5, debtToEquity: 2.85, currentRatio: 1.15, employees: 1100, freeCashFlow: -68_000_000, cashAndCashEquivalents: 112_000_000, totalDebt: 285_000_000, interestCoverage: -3.2, roic: -22.8, revenueGrowthPct: -12.5, acquisitionsNet: 0 },
  { symbol: 'FLXS', name: 'Flexsteel Industries', revenue: 380_000_000, grossMarginPct: 20.6, operatingMarginPct: 5.9, netMarginPct: 4.1, ebitda: 32_000_000, ebitdaMarginPct: 8.4, marketCap: 275_000_000, peRatio: 17.6, evToEbitda: 8.6, returnOnEquity: 11.8, debtToEquity: 0.42, currentRatio: 2.35, employees: 2400, freeCashFlow: 22_000_000, cashAndCashEquivalents: 28_000_000, totalDebt: 35_000_000, interestCoverage: 12.8, roic: 10.2, revenueGrowthPct: -4.2, acquisitionsNet: -18_000_000 },
  { symbol: 'SNBR', name: 'Sleep Number Corp', revenue: 1_700_000_000, grossMarginPct: 58.2, operatingMarginPct: -2.1, netMarginPct: -5.8, ebitda: 18_000_000, ebitdaMarginPct: 1.1, marketCap: 400_000_000, peRatio: null, evToEbitda: null, returnOnEquity: null, debtToEquity: null, currentRatio: 0.48, employees: 4900, freeCashFlow: -15_000_000, cashAndCashEquivalents: 8_000_000, totalDebt: 620_000_000, interestCoverage: 0.8, roic: -8.5, revenueGrowthPct: -6.1, acquisitionsNet: 0 },
];

const CHART_COLORS: Record<string, string> = {
  HBB: '#f97316',
  LCUT: '#3b82f6',
  LOVE: '#8b5cf6',
  IRBT: '#06b6d4',
  FLXS: '#10b981',
  SNBR: '#f59e0b',
};

function fmt(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${(val / 1e3).toFixed(0)}K`;
}

function pct(val: number | null): string {
  if (val == null) return '\u2014';
  return `${val.toFixed(1)}%`;
}

function ratio(val: number | null): string {
  if (val == null) return '\u2014';
  return `${val.toFixed(2)}x`;
}

function numFmt(val: number | null): string {
  if (val == null) return '\u2014';
  return val.toLocaleString();
}

// ── Rank badge ──
function getRank(peers: Peer[], symbol: string, key: keyof Peer, higherBetter = true): number {
  const valid = peers
    .filter(p => p[key] != null && typeof p[key] === 'number' && !isNaN(p[key] as number))
    .sort((a, b) => {
      const av = a[key] as number;
      const bv = b[key] as number;
      return higherBetter ? bv - av : av - bv;
    });
  return valid.findIndex(p => p.symbol === symbol) + 1;
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  if (rank === 0) return null;
  const color = rank === 1
    ? 'text-emerald-400 bg-emerald-400/10'
    : rank === total
      ? 'text-red-400 bg-red-400/10'
      : 'text-[#64748b] bg-transparent';
  return (
    <span className={`ml-1.5 text-[9px] font-mono font-bold px-1 py-0.5 rounded ${color}`}>
      #{rank}
    </span>
  );
}

// ── Inline horizontal metric bar ──
function MetricBar({ peers, metricKey, format, higherBetter = true }: {
  peers: Peer[];
  metricKey: keyof Peer;
  format: (v: number) => string;
  higherBetter?: boolean;
}) {
  const vals = peers
    .map(p => ({ symbol: p.symbol, val: p[metricKey] as number | null }))
    .filter((d): d is { symbol: string; val: number } => d.val != null && !isNaN(d.val));

  if (vals.length === 0) return <span className="text-[#475569] text-xs">No data</span>;

  const sorted = [...vals].sort((a, b) => higherBetter ? b.val - a.val : a.val - b.val);
  const absMax = Math.max(...vals.map(d => Math.abs(d.val)));

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map(d => {
        const width = (Math.abs(d.val) / absMax) * 100;
        const isTarget = d.symbol === TARGET;
        const isNeg = d.val < 0;
        return (
          <div key={d.symbol} className="flex items-center gap-2">
            <span className={`text-[10px] font-mono w-10 shrink-0 text-right ${isTarget ? 'text-[#f97316] font-bold' : 'text-[#94a3b8]'}`}>
              {d.symbol}
            </span>
            <div className="flex-1 h-3.5 bg-[#0f1419] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${Math.max(width, 3)}%`,
                  backgroundColor: isNeg ? '#ef4444' : (CHART_COLORS[d.symbol] || '#64748b'),
                  opacity: isTarget ? 1 : 0.55,
                }}
              />
            </div>
            <span className={`text-[11px] font-mono w-16 text-right shrink-0 ${isTarget ? 'text-[#e2e8f0] font-semibold' : 'text-[#94a3b8]'}`}>
              {format(d.val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Custom scatter tooltip ──
function ScatterTooltipContent({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-[#e2e8f0] mb-1">{d.symbol} <span className="font-normal text-[#64748b]">{d.name}</span></p>
      <p className="text-[#94a3b8]">{'Gross Margin: '}{pct(d.x)}</p>
      <p className="text-[#94a3b8]">{'EV/EBITDA: '}{d.y != null ? `${d.y.toFixed(1)}x` : '\u2014'}</p>
      <p className="text-[#94a3b8]">{'Revenue: '}{fmt(d.z)}</p>
    </div>
  );
}

// ── Chart tooltip ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-[#e2e8f0] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-[#94a3b8]">
          <span style={{ color: entry.color }}>{'\u25CF '}{entry.name}</span>{': '}
          {typeof entry.value === 'number'
            ? entry.value >= 1e6 ? fmt(entry.value) : `${entry.value}%`
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export function PeerBenchmarkMockup() {
  const target = PEERS.find(p => p.symbol === TARGET)!;
  const peerOnly = PEERS.filter(p => p.symbol !== TARGET);
  const peerAvg = (key: keyof Peer) => {
    const vals = peerOnly.filter(p => p[key] != null && typeof p[key] === 'number' && !isNaN(p[key] as number)).map(p => p[key] as number);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const validCount = (key: keyof Peer) => PEERS.filter(p => p[key] != null && typeof p[key] === 'number' && !isNaN(p[key] as number)).length;

  // Radar data
  const radarMetrics: { key: keyof Peer; label: string; invert?: boolean }[] = [
    { key: 'grossMarginPct', label: 'Gross Margin' },
    { key: 'operatingMarginPct', label: 'Op. Margin' },
    { key: 'returnOnEquity', label: 'ROE' },
    { key: 'currentRatio', label: 'Liquidity' },
    { key: 'debtToEquity', label: 'Low Leverage', invert: true },
  ];

  const radarData = radarMetrics.map(m => {
    const vals = PEERS.map(p => p[m.key]).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const row: Record<string, string | number> = { metric: m.label };
    PEERS.forEach(p => {
      const raw = p[m.key];
      if (typeof raw !== 'number' || isNaN(raw)) { row[p.symbol] = 0; return; }
      let norm = ((raw - min) / range) * 100;
      if (m.invert) norm = 100 - norm;
      row[p.symbol] = Math.max(0, +norm.toFixed(0));
    });
    return row;
  });

  // Scatter: Gross Margin vs EV/EBITDA, sized by Revenue
  const scatterData = PEERS
    .filter(p => p.evToEbitda != null && p.evToEbitda > 0 && p.grossMarginPct != null)
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      x: p.grossMarginPct,
      y: p.evToEbitda!,
      z: p.revenue,
      fill: CHART_COLORS[p.symbol],
    }));

  // Margin grouped bar
  const marginData = PEERS.map(p => ({
    name: p.symbol,
    'Gross': +p.grossMarginPct.toFixed(1),
    'Operating': +p.operatingMarginPct.toFixed(1),
    'Net': +p.netMarginPct.toFixed(1),
  }));

  return (
    <div className="min-h-screen bg-[#0f1419] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Peer Benchmarking</p>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">
            {target.name}
            <span className="text-[#64748b] font-normal text-lg ml-3">vs. Competitive Set</span>
          </h1>
          <p className="text-sm text-[#64748b] mt-1">Financial comparison across {PEERS.length} companies using most recent annual data</p>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.location.reload(); }}
            className="inline-block mt-2 text-xs text-[#475569] hover:text-[#94a3b8] underline underline-offset-2 transition-colors"
          >
            Back to home
          </a>
        </div>

        {/* ── KPI Comparison Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          {([
            { label: 'Revenue', val: fmt(target.revenue), avg: fmt(peerAvg('revenue') ?? 0), rank: getRank(PEERS, TARGET, 'revenue') },
            { label: 'Rev Growth', val: pct(target.revenueGrowthPct), avg: pct(peerAvg('revenueGrowthPct')), rank: getRank(PEERS, TARGET, 'revenueGrowthPct') },
            { label: 'Gross Margin', val: pct(target.grossMarginPct), avg: pct(peerAvg('grossMarginPct')), rank: getRank(PEERS, TARGET, 'grossMarginPct') },
            { label: 'Free Cash Flow', val: fmt(target.freeCashFlow ?? 0), avg: fmt(peerAvg('freeCashFlow') ?? 0), rank: getRank(PEERS, TARGET, 'freeCashFlow') },
            { label: 'ROIC', val: pct(target.roic), avg: pct(peerAvg('roic')), rank: getRank(PEERS, TARGET, 'roic') },
            { label: 'EV/EBITDA', val: target.evToEbitda ? `${target.evToEbitda.toFixed(1)}x` : '\u2014', avg: peerAvg('evToEbitda') ? `${peerAvg('evToEbitda')!.toFixed(1)}x` : '\u2014', rank: getRank(PEERS, TARGET, 'evToEbitda', false) },
          ]).map(kpi => (
            <div key={kpi.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">{kpi.label}</p>
                <span className="text-[10px] font-mono text-[#64748b]">#{kpi.rank} of {PEERS.length}</span>
              </div>
              <p className="font-mono text-2xl font-bold text-white leading-none">{kpi.val}</p>
              <p className="text-[11px] text-[#64748b] mt-1.5">{'Peer avg: '}{kpi.avg}</p>
            </div>
          ))}
        </div>

        {/* ── Small Multiple Metric Bars ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Revenue</p>
            <MetricBar peers={PEERS} metricKey="revenue" format={fmt} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Free Cash Flow</p>
            <MetricBar peers={PEERS} metricKey="freeCashFlow" format={fmt} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Gross Margin</p>
            <MetricBar peers={PEERS} metricKey="grossMarginPct" format={v => pct(v)} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">ROIC</p>
            <MetricBar peers={PEERS} metricKey="roic" format={v => pct(v)} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Interest Coverage</p>
            <MetricBar peers={PEERS} metricKey="interestCoverage" format={v => `${v.toFixed(1)}x`} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Revenue Growth YoY</p>
            <MetricBar peers={PEERS} metricKey="revenueGrowthPct" format={v => pct(v)} />
          </div>
        </div>

        {/* ── Acquisition Firepower ── */}
        {(() => {
          const firepowerData = PEERS
            .map(p => {
              const cash = p.cashAndCashEquivalents ?? 0;
              const fcf = p.freeCashFlow ?? 0;
              const fp = cash + Math.max(fcf * 1.5, 0);
              return { symbol: p.symbol, name: p.name, cash, fcf, firepower: fp, isTarget: p.symbol === TARGET };
            })
            .filter(d => d.firepower > 0)
            .sort((a, b) => b.firepower - a.firepower);

          if (firepowerData.length === 0) return null;

          const maxFP = Math.max(...firepowerData.map(d => d.firepower));

          return (
            <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Acquisition Firepower</p>
                  <p className="text-xs text-[#64748b]">
                    Estimated M&A capacity based on cash on hand plus sustainable free cash flow
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {firepowerData.map((d, i) => {
                  const barPct = (d.firepower / maxFP) * 100;
                  return (
                    <div key={d.symbol} className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono w-4 text-right shrink-0 ${i === 0 ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                        {i + 1}
                      </span>
                      <span className={`text-xs font-mono w-10 shrink-0 text-right ${d.isTarget ? 'text-[#f97316] font-bold' : 'text-[#94a3b8]'}`}>
                        {d.symbol}
                      </span>
                      <div className="flex-1 h-6 bg-[#0f1419] rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all flex items-center"
                          style={{
                            width: `${Math.max(barPct, 4)}%`,
                            backgroundColor: d.isTarget ? '#f97316' : CHART_COLORS[d.symbol] || '#3b82f6',
                            opacity: d.isTarget ? 1 : 0.6,
                          }}
                        >
                          <span className="text-[10px] font-mono font-semibold text-white pl-2 truncate">
                            {fmt(d.firepower)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right w-40">
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {fmt(d.cash)}{' cash'}
                        </span>
                        <span className="text-[10px] text-[#475569] mx-1">+</span>
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {fmt(Math.max(d.fcf * 1.5, 0))}{' (1.5\u00d7 FCF)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-[#475569] mt-3 italic">
                {'Firepower = Cash + 1.5 \u00d7 max(FCF, 0). Estimates near-term acquisition capacity from existing resources.'}
              </p>
            </div>
          );
        })()}

        {/* ── Comprehensive Metrics Table ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a3a4e]">
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-widest text-[#f97316] font-semibold sticky left-0 bg-[#1a2332] z-10">Company</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Revenue</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Rev Grw</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">EBITDA</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">FCF</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Gross %</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Op %</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Net %</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Mkt Cap</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">P/E</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">EV/EBITDA</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">ROIC</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">ROE</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">D/E</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Int Cov</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Current</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Employees</th>
                </tr>
              </thead>
              <tbody>
                {PEERS.map(p => {
                  const isTarget = p.symbol === TARGET;
                  const rowBg = isTarget ? 'bg-[#f97316]/[0.04]' : 'hover:bg-[#1e2a3a]';
                  const nameColor = isTarget ? 'text-[#f97316]' : 'text-[#e2e8f0]';
                  const cellBase = 'font-mono';
                  const negClass = (v: number | null) => v != null && v < 0 ? 'text-red-400' : 'text-[#e2e8f0]';
                  return (
                    <tr key={p.symbol} className={`border-b border-[#2a3a4e]/40 ${rowBg}`}>
                      <td className={`py-2.5 px-3 sticky left-0 z-10 ${isTarget ? 'bg-[#1b2435]' : 'bg-[#1a2332]'}`}>
                        <span className={`font-semibold ${nameColor}`}>{p.symbol}</span>
                        {isTarget && <span className="ml-1.5 text-[8px] bg-[#f97316]/20 text-[#f97316] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Target</span>}
                        <p className="text-[10px] text-[#475569] truncate max-w-[120px]">{p.name}</p>
                      </td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{fmt(p.revenue)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} ${negClass(p.revenueGrowthPct)}`}>{pct(p.revenueGrowthPct)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} ${negClass(p.ebitda)}`}>{fmt(p.ebitda)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`${cellBase} ${negClass(p.freeCashFlow)}`}>{p.freeCashFlow != null ? fmt(p.freeCashFlow) : '\u2014'}</span>
                        <RankBadge rank={getRank(PEERS, p.symbol, 'freeCashFlow')} total={validCount('freeCashFlow')} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`${cellBase} text-[#e2e8f0]`}>{pct(p.grossMarginPct)}</span>
                        <RankBadge rank={getRank(PEERS, p.symbol, 'grossMarginPct')} total={validCount('grossMarginPct')} />
                      </td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} ${negClass(p.operatingMarginPct)}`}>{pct(p.operatingMarginPct)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} ${negClass(p.netMarginPct)}`}>{pct(p.netMarginPct)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{fmt(p.marketCap)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{p.peRatio != null ? `${p.peRatio.toFixed(1)}x` : '\u2014'}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{p.evToEbitda != null && p.evToEbitda > 0 ? `${p.evToEbitda.toFixed(1)}x` : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`${cellBase} ${negClass(p.roic)}`}>{pct(p.roic)}</span>
                        <RankBadge rank={getRank(PEERS, p.symbol, 'roic')} total={validCount('roic')} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`${cellBase} ${negClass(p.returnOnEquity)}`}>{pct(p.returnOnEquity)}</span>
                        <RankBadge rank={getRank(PEERS, p.symbol, 'returnOnEquity')} total={validCount('returnOnEquity')} />
                      </td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{ratio(p.debtToEquity)}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} ${negClass(p.interestCoverage)}`}>{p.interestCoverage != null ? `${p.interestCoverage.toFixed(1)}x` : '\u2014'}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#e2e8f0]`}>{p.currentRatio != null ? `${p.currentRatio.toFixed(2)}x` : '\u2014'}</td>
                      <td className={`py-2.5 px-3 text-right ${cellBase} text-[#94a3b8]`}>{numFmt(p.employees)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Charts: Scatter + Radar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Valuation Map Scatter */}
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Valuation Map</p>
            <p className="text-xs text-[#64748b] mb-4">Gross margin vs. EV/EBITDA -- bubble size = revenue</p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Gross Margin"
                  tickFormatter={v => `${v}%`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#2a3a4e' }}
                  label={{ value: 'Gross Margin %', position: 'bottom', offset: 8, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="EV/EBITDA"
                  tickFormatter={v => `${v}x`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#2a3a4e' }}
                  label={{ value: 'EV/EBITDA', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="z" range={[300, 1000]} />
                <Tooltip content={<ScatterTooltipContent />} />
                {target.evToEbitda && (
                  <>
                    <ReferenceLine x={target.grossMarginPct} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.3} />
                    <ReferenceLine y={target.evToEbitda} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.3} />
                  </>
                )}
                <Scatter data={scatterData}>
                  {scatterData.map((entry) => (
                    <Cell
                      key={entry.symbol}
                      fill={entry.fill}
                      fillOpacity={entry.symbol === TARGET ? 1 : 0.65}
                      stroke={entry.symbol === TARGET ? '#f97316' : 'transparent'}
                      strokeWidth={entry.symbol === TARGET ? 2 : 0}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {scatterData.map(d => (
                <span key={d.symbol} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  {d.symbol}
                </span>
              ))}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Financial Profile</p>
            <p className="text-xs text-[#64748b] mb-4">Normalized 0-100 across the peer group</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="#2a3a4e" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {PEERS.map(p => (
                  <Radar
                    key={p.symbol}
                    name={p.symbol}
                    dataKey={p.symbol}
                    stroke={CHART_COLORS[p.symbol]}
                    fill={CHART_COLORS[p.symbol]}
                    fillOpacity={p.symbol === TARGET ? 0.25 : 0.03}
                    strokeWidth={p.symbol === TARGET ? 2.5 : 1}
                    strokeOpacity={p.symbol === TARGET ? 1 : 0.45}
                  />
                ))}
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3a4e', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {PEERS.map(p => (
                <span key={p.symbol} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[p.symbol] }} />
                  {p.symbol}{p.symbol === TARGET ? ' (Target)' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Margin Comparison Full Width ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Margin Stack</p>
          <p className="text-xs text-[#64748b] mb-4">Gross, operating, and net margins by company</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marginData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#2a3a4e' }} tickLine={false} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                iconType="circle"
                iconSize={8}
                {...{ payload: [
                  { value: 'Gross', type: 'circle', color: '#10b981' },
                  { value: 'Operating', type: 'circle', color: '#3b82f6' },
                  { value: 'Net', type: 'circle', color: '#f59e0b' },
                ] } as Record<string, unknown>}
              />
              <Bar dataKey="Gross" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Operating" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Net" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Key Takeaways ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-4">Key Takeaways</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title: 'Valuation Advantage', body: `HBB trades at 6.3x EV/EBITDA -- the cheapest valued company with positive EBITDA in the peer set. Combined with 24% gross margins and 22% ROE, this creates a strong platform for accretive bolt-on acquisitions.` },
              { title: 'Margin Opportunity', body: `LOVE and SNBR achieve 57-58% gross margins via DTC channels. HBB's 24% margin has significant upside if the direct-to-consumer strategy gains traction -- a 2x improvement path exists.` },
              { title: 'Balance Sheet Strength', body: `At 0.87x D/E with a 1.45x current ratio, HBB has meaningful debt capacity for acquisitions. By contrast, IRBT (2.85x D/E) and LCUT (1.92x D/E) are over-levered.` },
              { title: 'Distressed Peers = Opportunity', body: `iRobot (-11% net margin, -$45M EBITDA) and Sleep Number (-5.8% net, 0.48 current ratio) may present acquisition or asset-purchase opportunities at depressed valuations.` },
            ].map(t => (
              <div key={t.title} className="border-l-2 border-[#f97316]/40 pl-4">
                <p className="text-sm font-semibold text-[#e2e8f0] mb-1">{t.title}</p>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-10 py-3 rounded-lg transition-colors text-sm">
            Begin Strategic Prioritization
          </button>
        </div>
      </div>
    </div>
  );
}
