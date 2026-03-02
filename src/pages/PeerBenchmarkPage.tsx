import { useMemo } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Cell,
} from 'recharts';
import type { PeerFinancials } from '../types/index.ts';

// ── Formatters ──

function fmt(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function pct(val: number | null | undefined): string {
  if (val == null) return '\u2014';
  return `${val.toFixed(1)}%`;
}

function ratio(val: number | null | undefined): string {
  if (val == null) return '\u2014';
  return `${val.toFixed(2)}x`;
}

function numFmt(val: number | null | undefined): string {
  if (val == null) return '\u2014';
  return val.toLocaleString();
}

// ── Chart colors ──

const CHART_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];

// ── Rank helper ──

function getRank(peers: PeerFinancials[], symbol: string, key: keyof PeerFinancials, higherBetter = true): number {
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

// ── Inline metric bar (small multiples) ──

function MetricBar({ peers, targetSymbol, metricKey, format, colorMap, higherBetter = true }: {
  peers: PeerFinancials[];
  targetSymbol: string | undefined;
  metricKey: keyof PeerFinancials;
  format: (v: number) => string;
  colorMap: Record<string, string>;
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
        const isTarget = d.symbol === targetSymbol;
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
                  backgroundColor: isNeg ? '#ef4444' : (colorMap[d.symbol] || '#64748b'),
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

// ── Custom tooltips ──

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

// ── Main Page ──

export function PeerBenchmarkPage() {
  const { state, dispatch } = useGameState();
  const targetSymbol = state.companyProfile?.symbol;
  const targetName = state.companyProfile?.companyName || targetSymbol || 'Target';

  const handleContinue = () => {
    dispatch({ type: 'SET_PHASE', phase: 'voting_step1' });
  };

  // Sort: target first, then peers by revenue desc
  const sorted = useMemo(() => [...state.peerFinancials].sort((a, b) => {
    if (a.symbol === targetSymbol) return -1;
    if (b.symbol === targetSymbol) return 1;
    return b.revenue - a.revenue;
  }), [state.peerFinancials, targetSymbol]);

  const total = sorted.length;

  // Build color map
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let peerIdx = 1; // index 0 = orange for target
    sorted.forEach(p => {
      if (p.symbol === targetSymbol) {
        map[p.symbol] = '#f97316';
      } else {
        map[p.symbol] = CHART_COLORS[peerIdx % CHART_COLORS.length];
        peerIdx++;
      }
    });
    return map;
  }, [sorted, targetSymbol]);

  // Peer averages (excluding target)
  const peerOnly = useMemo(() => sorted.filter(p => p.symbol !== targetSymbol), [sorted, targetSymbol]);
  const peerAvg = (key: keyof PeerFinancials) => {
    const vals = peerOnly.filter(p => p[key] != null && typeof p[key] === 'number' && !isNaN(p[key] as number)).map(p => p[key] as number);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const validCount = (key: keyof PeerFinancials) => sorted.filter(p => p[key] != null && typeof p[key] === 'number' && !isNaN(p[key] as number)).length;

  const target = sorted.find(p => p.symbol === targetSymbol);

  // Radar data
  const radarMetrics: { key: keyof PeerFinancials; label: string; invert?: boolean }[] = [
    { key: 'grossMarginPct', label: 'Gross Margin' },
    { key: 'operatingMarginPct', label: 'Op. Margin' },
    { key: 'returnOnEquity', label: 'ROE' },
    { key: 'currentRatio', label: 'Liquidity' },
    { key: 'debtToEquity', label: 'Low Leverage', invert: true },
  ];

  const radarData = useMemo(() => radarMetrics.map(m => {
    const vals = sorted.map(p => p[m.key]).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const row: Record<string, string | number> = { metric: m.label };
    sorted.forEach(p => {
      const raw = p[m.key];
      if (typeof raw !== 'number' || isNaN(raw)) { row[p.symbol] = 0; return; }
      let norm = ((raw - min) / range) * 100;
      if (m.invert) norm = 100 - norm;
      row[p.symbol] = Math.max(0, +norm.toFixed(0));
    });
    return row;
  }), [sorted]);

  // Scatter: Gross Margin vs EV/EBITDA, sized by Revenue
  const scatterData = useMemo(() => sorted
    .filter(p => p.evToEbitda != null && (p.evToEbitda as number) > 0 && p.grossMarginPct != null)
    .map(p => ({
      symbol: p.symbol,
      name: p.name,
      x: p.grossMarginPct,
      y: p.evToEbitda!,
      z: p.revenue,
      fill: colorMap[p.symbol] || '#64748b',
    })),
  [sorted, colorMap]);

  // Margin grouped bar
  const marginData = useMemo(() => sorted.map(p => ({
    name: p.symbol,
    'Gross': +(p.grossMarginPct ?? 0).toFixed(1),
    'Operating': +(p.operatingMarginPct ?? 0).toFixed(1),
    'Net': +(p.netMarginPct ?? 0).toFixed(1),
  })), [sorted]);

  return (
    <div className="min-h-screen bg-[#0f1419] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Peer Benchmarking</p>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">
            {targetName}
            <span className="text-[#64748b] font-normal text-lg ml-3">vs. Competitive Set</span>
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            Financial comparison across {total} companies using most recent annual data
          </p>
        </div>

        {/* KPI Comparison Strip */}
        {target && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {([
              { label: 'Revenue', val: fmt(target.revenue), avg: fmt(peerAvg('revenue') ?? 0), rank: getRank(sorted, targetSymbol!, 'revenue') },
              { label: 'Gross Margin', val: pct(target.grossMarginPct), avg: pct(peerAvg('grossMarginPct')), rank: getRank(sorted, targetSymbol!, 'grossMarginPct') },
              { label: 'EV/EBITDA', val: target.evToEbitda ? `${target.evToEbitda.toFixed(1)}x` : '\u2014', avg: peerAvg('evToEbitda') ? `${peerAvg('evToEbitda')!.toFixed(1)}x` : '\u2014', rank: getRank(sorted, targetSymbol!, 'evToEbitda', false) },
              { label: 'Return on Equity', val: pct(target.returnOnEquity), avg: pct(peerAvg('returnOnEquity')), rank: getRank(sorted, targetSymbol!, 'returnOnEquity') },
            ]).map(kpi => (
              <div key={kpi.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">{kpi.label}</p>
                  <span className="text-[10px] font-mono text-[#64748b]">#{kpi.rank} of {total}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-white leading-none">{kpi.val}</p>
                <p className="text-[11px] text-[#64748b] mt-1.5">{'Peer avg: '}{kpi.avg}</p>
              </div>
            ))}
          </div>
        )}

        {/* Small Multiple Metric Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Revenue</p>
            <MetricBar peers={sorted} targetSymbol={targetSymbol} metricKey="revenue" format={fmt} colorMap={colorMap} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Gross Margin</p>
            <MetricBar peers={sorted} targetSymbol={targetSymbol} metricKey="grossMarginPct" format={v => pct(v)} colorMap={colorMap} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">Return on Equity</p>
            <MetricBar peers={sorted} targetSymbol={targetSymbol} metricKey="returnOnEquity" format={v => pct(v)} colorMap={colorMap} />
          </div>
        </div>

        {/* Acquisition Firepower Comparison */}
        {(() => {
          // Estimate firepower per peer using available data:
          // Firepower = EBITDA * max(0, targetLeverage - currentD/E)
          // where targetLeverage = 3.0x (conservative max for M&A)
          // This approximates incremental debt capacity from EBITDA headroom.
          // NOTE for Claude Code: pipe through cash + totalDebt from FMP
          // balance sheet to PeerFinancials for a more precise calculation:
          // Firepower = cash + EBITDA * max(0, 3.0 - D/E)
          const TARGET_LEVERAGE = 3.0;
          const firepowerData = sorted
            .map(p => {
              const ebitda = p.ebitda ?? 0;
              const de = p.debtToEquity ?? 0;
              const headroom = Math.max(0, TARGET_LEVERAGE - de);
              const fp = ebitda > 0 ? ebitda * headroom : 0;
              return { symbol: p.symbol, name: p.name, ebitda, de, headroom, firepower: fp, isTarget: p.symbol === targetSymbol };
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
                    Estimated M&A capacity based on EBITDA and leverage headroom (target: {TARGET_LEVERAGE.toFixed(1)}x D/E ceiling)
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {firepowerData.map((d, i) => {
                  const barPct = (d.firepower / maxFP) * 100;
                  return (
                    <div key={d.symbol} className="flex items-center gap-3">
                      {/* Rank */}
                      <span className={`text-[10px] font-mono w-4 text-right shrink-0 ${i === 0 ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                        {i + 1}
                      </span>

                      {/* Company */}
                      <span className={`text-xs font-mono w-10 shrink-0 text-right ${d.isTarget ? 'text-[#f97316] font-bold' : 'text-[#94a3b8]'}`}>
                        {d.symbol}
                      </span>

                      {/* Bar */}
                      <div className="flex-1 h-6 bg-[#0f1419] rounded overflow-hidden relative">
                        <div
                          className="h-full rounded transition-all flex items-center"
                          style={{
                            width: `${Math.max(barPct, 4)}%`,
                            backgroundColor: d.isTarget ? '#f97316' : colorMap[d.symbol] || '#3b82f6',
                            opacity: d.isTarget ? 1 : 0.6,
                          }}
                        >
                          <span className="text-[10px] font-mono font-semibold text-white pl-2 truncate">
                            {fmt(d.firepower)}
                          </span>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="shrink-0 text-right w-32">
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {fmt(d.ebitda)} EBITDA
                        </span>
                        <span className="text-[10px] text-[#475569] mx-1">{'\u00d7'}</span>
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {d.headroom.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-[#475569] mt-3 italic">
                {'Firepower = EBITDA \u00d7 (3.0x ceiling \u2013 current D/E). Assumes incremental debt capacity only; excludes cash on hand.'}
              </p>
            </div>
          );
        })()}

        {/* Comprehensive Metrics Table */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a3a4e]">
                  <th className="text-left py-3 px-3 text-[10px] uppercase tracking-widest text-[#f97316] font-semibold sticky left-0 bg-[#1a2332] z-10">Company</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Revenue</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">EBITDA</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Gross Margin</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Oper. Margin</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Net Margin</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Mkt Cap</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">P/E</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">EV/EBITDA</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">ROE</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">D/E</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Current Ratio</th>
                  <th className="text-right py-3 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-medium">Employees</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => {
                  const isTarget = p.symbol === targetSymbol;
                  const rowBg = isTarget ? 'bg-[#f97316]/[0.04]' : 'hover:bg-[#1e2a3a]';
                  const nameColor = isTarget ? 'text-[#f97316]' : 'text-[#e2e8f0]';
                  const negClass = (v: number | null | undefined) => v != null && v < 0 ? 'text-red-400' : 'text-[#e2e8f0]';
                  return (
                    <tr key={p.symbol} className={`border-b border-[#2a3a4e]/40 ${rowBg}`}>
                      <td className={`py-2.5 px-3 sticky left-0 z-10 ${isTarget ? 'bg-[#1b2435]' : 'bg-[#1a2332]'}`}>
                        <div className="flex items-center gap-2">
                          {p.logo && (
                            <img
                              src={p.logo}
                              alt=""
                              className="w-5 h-5 rounded object-contain bg-white p-0.5 shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div>
                            <span className={`font-semibold ${nameColor}`}>{p.symbol}</span>
                            {isTarget && <span className="ml-1.5 text-[8px] bg-[#f97316]/20 text-[#f97316] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Target</span>}
                            <p className="text-[10px] text-[#475569] truncate max-w-[120px]">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{fmt(p.revenue)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono ${negClass(p.ebitda)}`}>{p.ebitda ? fmt(p.ebitda) : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono text-[#e2e8f0]">{pct(p.grossMarginPct)}</span>
                        <RankBadge rank={getRank(sorted, p.symbol, 'grossMarginPct')} total={validCount('grossMarginPct')} />
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono ${negClass(p.operatingMarginPct)}`}>{pct(p.operatingMarginPct)}</td>
                      <td className={`py-2.5 px-3 text-right font-mono ${negClass(p.netMarginPct)}`}>{pct(p.netMarginPct)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{p.marketCap ? fmt(p.marketCap) : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{p.peRatio != null ? `${p.peRatio.toFixed(1)}x` : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{p.evToEbitda != null && p.evToEbitda > 0 ? `${p.evToEbitda.toFixed(1)}x` : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-mono ${negClass(p.returnOnEquity)}`}>{pct(p.returnOnEquity)}</span>
                        <RankBadge rank={getRank(sorted, p.symbol, 'returnOnEquity')} total={validCount('returnOnEquity')} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{ratio(p.debtToEquity)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{p.currentRatio != null ? `${p.currentRatio.toFixed(2)}x` : '\u2014'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#94a3b8]">{numFmt(p.employees)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts: Scatter + Radar */}
        <div className="grid grid-cols-1 gap-6 mb-8">

          {/* Valuation Map Scatter */}
          {scatterData.length >= 2 && target && (
            <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Valuation Map</p>
              <p className="text-xs text-[#64748b] mb-4">Gross margin vs. EV/EBITDA -- bubble size = revenue</p>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
                  <XAxis
                    type="number" dataKey="x" name="Gross Margin"
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={{ stroke: '#2a3a4e' }}
                    label={{ value: 'Gross Margin %', position: 'bottom', offset: 8, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="EV/EBITDA"
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
                        fillOpacity={entry.symbol === targetSymbol ? 1 : 0.65}
                        stroke={entry.symbol === targetSymbol ? '#f97316' : 'transparent'}
                        strokeWidth={entry.symbol === targetSymbol ? 2 : 0}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3 justify-center">
                {scatterData.map(d => (
                  <span key={d.symbol} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                    {d.symbol}{d.symbol === targetSymbol ? ' (Target)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Radar Chart */}
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Financial Profile</p>
            <p className="text-xs text-[#64748b] mb-4">Normalized 0-100 across the peer group</p>
            <ResponsiveContainer width="100%" height={420}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#2a3a4e" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {sorted.map(p => (
                  <Radar
                    key={p.symbol}
                    name={p.symbol}
                    dataKey={p.symbol}
                    stroke={colorMap[p.symbol]}
                    fill={colorMap[p.symbol]}
                    fillOpacity={p.symbol === targetSymbol ? 0.25 : 0.03}
                    strokeWidth={p.symbol === targetSymbol ? 2.5 : 1}
                    strokeOpacity={p.symbol === targetSymbol ? 1 : 0.45}
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
              {sorted.map(p => (
                <span key={p.symbol} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap[p.symbol] }} />
                  {p.symbol}{p.symbol === targetSymbol ? ' (Target)' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Margin Comparison Full Width */}
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

        {/* CTA */}
        <div className="text-center">
          <Button onClick={handleContinue} size="lg" className="px-10">
            Begin Strategic Prioritization
          </Button>
        </div>
      </div>
    </div>
  );
}
