import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
} from 'recharts';

/* ─── Hardcoded HBB + 4 peers (realistic data) ─────────────────────── */
const PEERS = [
  {
    symbol: 'HBB', name: 'Hamilton Beach Brands', logo: '',
    revenue: 618e6, grossMarginPct: 24.3, operatingMarginPct: 8.1,
    netMarginPct: 5.2, evToEbitda: 8.7, returnOnEquity: 22.1,
    debtToEquity: 0.87, currentRatio: 1.8, marketCap: 430e6,
    employees: 3800, isTarget: true,
  },
  {
    symbol: 'LCUT', name: 'Lifetime Brands', logo: '',
    revenue: 690e6, grossMarginPct: 36.1, operatingMarginPct: 5.3,
    netMarginPct: 1.8, evToEbitda: 11.2, returnOnEquity: 8.4,
    debtToEquity: 2.1, currentRatio: 2.1, marketCap: 195e6,
    employees: 1400, isTarget: false,
  },
  {
    symbol: 'NPK', name: 'National Presto Industries', logo: '',
    revenue: 280e6, grossMarginPct: 21.8, operatingMarginPct: 10.2,
    netMarginPct: 8.9, evToEbitda: 6.1, returnOnEquity: 9.5,
    debtToEquity: 0.02, currentRatio: 6.2, marketCap: 640e6,
    employees: 800, isTarget: false,
  },
  {
    symbol: 'IRBT', name: 'iRobot Corporation', logo: '',
    revenue: 890e6, grossMarginPct: 22.5, operatingMarginPct: -12.3,
    netMarginPct: -14.1, evToEbitda: -5.2, returnOnEquity: -45.2,
    debtToEquity: 3.8, currentRatio: 1.2, marketCap: 310e6,
    employees: 1100, isTarget: false,
  },
  {
    symbol: 'LOVE', name: 'The Lovesac Company', logo: '',
    revenue: 625e6, grossMarginPct: 56.8, operatingMarginPct: 5.1,
    netMarginPct: 3.8, evToEbitda: 14.3, returnOnEquity: 15.7,
    debtToEquity: 0.15, currentRatio: 2.4, marketCap: 580e6,
    employees: 1900, isTarget: false,
  },
];

const TARGET_COLOR = '#f97316';
const PEER_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'];

function fmt(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${(val / 1e3).toFixed(0)}K`;
}

function pctFmt(val: number): string { return `${val.toFixed(1)}%`; }

/* ─── Best / Worst for cell highlighting ────────────────────────────── */
function getBestWorst(key: string, higherIsBetter = true) {
  const vals = PEERS.map(p => (p as any)[key]).filter((v: any) => typeof v === 'number' && !isNaN(v));
  if (vals.length === 0) return { best: undefined, worst: undefined };
  return {
    best: higherIsBetter ? Math.max(...vals) : Math.min(...vals),
    worst: higherIsBetter ? Math.min(...vals) : Math.max(...vals),
  };
}

function MetricCell({ val, best, worst, format }: {
  val: number | undefined; best: number | undefined; worst: number | undefined;
  format: (v: number) => string;
}) {
  if (val == null || isNaN(val)) return <span className="text-[#475569]">--</span>;
  const isBest = best != null && val === best;
  const isWorst = worst != null && val === worst;
  return (
    <span className={`font-mono text-sm ${
      isBest ? 'text-emerald-400' : isWorst ? 'text-red-400' : val < 0 ? 'text-red-400' : 'text-[#e2e8f0]'
    }`}>
      {format(val)}
    </span>
  );
}

/* ─── Custom Recharts tooltip ───────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-[#e2e8f0] mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-[#94a3b8]">
          <span style={{ color: entry.color }}>{entry.name}</span>: {
            typeof entry.value === 'number'
              ? entry.value >= 1e6 ? fmt(entry.value) : `${entry.value}%`
              : entry.value
          }
        </p>
      ))}
    </div>
  );
}

export function PeerBenchmarkMockup() {
  const bw = useMemo(() => ({
    grossMarginPct: getBestWorst('grossMarginPct'),
    operatingMarginPct: getBestWorst('operatingMarginPct'),
    netMarginPct: getBestWorst('netMarginPct'),
    evToEbitda: getBestWorst('evToEbitda', false),
    returnOnEquity: getBestWorst('returnOnEquity'),
  }), []);

  /* Revenue bar chart */
  const revenueData = useMemo(() =>
    [...PEERS].sort((a, b) => a.revenue - b.revenue).map(p => ({
      name: p.symbol,
      revenue: p.revenue,
    })),
  []);

  /* Margin grouped bar */
  const marginData = useMemo(() =>
    PEERS.map(p => ({
      name: p.symbol,
      'Gross': +p.grossMarginPct.toFixed(1),
      'Operating': +p.operatingMarginPct.toFixed(1),
      'Net': +p.netMarginPct.toFixed(1),
    })),
  []);

  /* Radar data */
  const radarData = useMemo(() => {
    const metrics: { key: string; label: string; invert?: boolean }[] = [
      { key: 'grossMarginPct', label: 'Gross Margin' },
      { key: 'netMarginPct', label: 'Net Margin' },
      { key: 'returnOnEquity', label: 'ROE' },
      { key: 'currentRatio', label: 'Liquidity' },
      { key: 'debtToEquity', label: 'Low Debt', invert: true },
    ];
    const ranges = metrics.map(m => {
      const vals = PEERS.map(p => (p as any)[m.key]).filter((v: any) => typeof v === 'number' && !isNaN(v));
      return { min: Math.min(...vals), max: Math.max(...vals) };
    });
    return metrics.map((m, mi) => {
      const row: Record<string, string | number> = { metric: m.label };
      PEERS.forEach(p => {
        const raw = (p as any)[m.key];
        if (typeof raw !== 'number' || isNaN(raw)) { row[p.symbol] = 0; return; }
        const { min, max } = ranges[mi];
        const range = max - min || 1;
        let n = ((raw - min) / range) * 100;
        if (m.invert) n = 100 - n;
        row[p.symbol] = Math.max(0, +n.toFixed(0));
      });
      return row;
    });
  }, []);

  const companyColors: Record<string, string> = {};
  let ci = 0;
  PEERS.forEach(p => {
    companyColors[p.symbol] = p.isTarget ? TARGET_COLOR : PEER_COLORS[ci++ % PEER_COLORS.length];
  });

  return (
    <div className="min-h-screen bg-[#0f1419] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
            Peer Benchmarking
          </p>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">
            Financial Comparison
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            Most recent annual data -- <span className="text-[#f97316]">HBB</span> vs. 4 selected peers
          </p>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.location.reload(); }}
            className="inline-block mt-3 text-xs text-[#64748b] hover:text-[#94a3b8] underline underline-offset-2"
          >
            Back to home
          </a>
        </div>

        {/* ── KPI Summary Row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Revenue', value: fmt(618e6), sub: 'HBB annual' },
            { label: 'Gross Margin', value: '24.3%', sub: 'Peer avg: 32.3%' },
            { label: 'EV/EBITDA', value: '8.7x', sub: 'Peer avg: 6.6x' },
            { label: 'ROE', value: '22.1%', sub: 'Peer avg: -2.8%' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4">
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#64748b] mb-1">
                {kpi.label}
              </p>
              <p className="font-mono text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Metrics Table ────────────────────────────────────── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a3a4e]">
                  <th className="text-left py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">Company</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">Gross Margin</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">Op. Margin</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">Net Margin</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">EV/EBITDA</th>
                  <th className="text-right py-3 px-4 font-medium text-[#64748b] text-xs uppercase tracking-wider">ROE</th>
                </tr>
              </thead>
              <tbody>
                {PEERS.map((peer) => (
                  <tr
                    key={peer.symbol}
                    className={`border-b border-[#2a3a4e]/50 ${
                      peer.isTarget ? 'bg-[#f97316]/5' : 'hover:bg-[#1e293b]'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${peer.isTarget ? 'bg-[#f97316]' : 'bg-[#3b82f6]'}`} />
                        <div>
                          <span className="text-[#e2e8f0] font-medium">{peer.name}</span>
                          {peer.isTarget && (
                            <span className="ml-2 text-[9px] bg-[#f97316]/20 text-[#f97316] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                              Target
                            </span>
                          )}
                          <p className="text-[11px] text-[#64748b]">{peer.symbol} | {fmt(peer.marketCap ?? 0)} mkt cap</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-[#e2e8f0]">
                      {fmt(peer.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MetricCell val={peer.grossMarginPct} best={bw.grossMarginPct.best} worst={bw.grossMarginPct.worst} format={pctFmt} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MetricCell val={peer.operatingMarginPct} best={bw.operatingMarginPct.best} worst={bw.operatingMarginPct.worst} format={pctFmt} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MetricCell val={peer.netMarginPct} best={bw.netMarginPct.best} worst={bw.netMarginPct.worst} format={pctFmt} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MetricCell val={peer.evToEbitda} best={bw.evToEbitda.best} worst={bw.evToEbitda.worst} format={v => `${v.toFixed(1)}x`} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MetricCell val={peer.returnOnEquity} best={bw.returnOnEquity.best} worst={bw.returnOnEquity.worst} format={pctFmt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Charts Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Revenue Bar */}
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
              Scale
            </p>
            <h3 className="text-base font-semibold text-[#e2e8f0] mb-4">Revenue Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={fmt}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#2a3a4e' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {revenueData.map((entry) => (
                    <Cell key={entry.name} fill={companyColors[entry.name] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin Grouped Bar */}
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
              Profitability
            </p>
            <h3 className="text-base font-semibold text-[#e2e8f0] mb-4">Margin Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={marginData} margin={{ left: -15, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#2a3a4e' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => `${v}%`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Gross" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Operating" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Net" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Radar Chart -- full width ────────────────────────── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
            Financial Profile
          </p>
          <h3 className="text-base font-semibold text-[#e2e8f0] mb-1">
            Normalized Comparison
          </h3>
          <p className="text-xs text-[#64748b] mb-4">
            Each metric scaled 0-100 relative to the peer group
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="#2a3a4e" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <PolarRadiusAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                tickCount={5}
                domain={[0, 100]}
                axisLine={false}
              />
              {PEERS.map(p => (
                <Radar
                  key={p.symbol}
                  name={p.symbol}
                  dataKey={p.symbol}
                  stroke={companyColors[p.symbol]}
                  fill={companyColors[p.symbol]}
                  fillOpacity={p.isTarget ? 0.25 : 0.06}
                  strokeWidth={p.isTarget ? 2.5 : 1.5}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                iconType="circle"
                iconSize={8}
              />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Key Takeaways ────────────────────────────────────── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
            Key Takeaways
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Margin Gap',
                body: 'HBB\'s 24% gross margin lags Lovesac (57%) and Lifetime Brands (36%). Acquisitions should target margin-accretive businesses.',
              },
              {
                title: 'Balance Sheet Strength',
                body: 'At 0.87x D/E with 22% ROE, HBB is better capitalized than most peers. iRobot\'s distressed balance sheet may present opportunistic deals.',
              },
              {
                title: 'Valuation',
                body: 'HBB trades at 8.7x EV/EBITDA -- a moderate multiple. National Presto at 6.1x is the cheapest; Lovesac at 14.3x is most expensive.',
              },
            ].map(t => (
              <div key={t.title}>
                <p className="text-sm font-semibold text-[#e2e8f0] mb-1">{t.title}</p>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <div className="text-center">
          <button className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-10 py-3 rounded-lg transition-colors">
            Begin Strategic Prioritization
          </button>
        </div>
      </div>
    </div>
  );
}
