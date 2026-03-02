import { useMemo } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import type { PeerFinancials } from '../types/index.ts';

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

const PEER_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
const TARGET_COLOR = '#f97316';

function getBestWorst(peers: PeerFinancials[], key: keyof PeerFinancials, higherIsBetter = true) {
  const vals = peers.map(p => p[key]).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (vals.length === 0) return { best: undefined, worst: undefined };
  const best = higherIsBetter ? Math.max(...vals) : Math.min(...vals);
  const worst = higherIsBetter ? Math.min(...vals) : Math.max(...vals);
  return { best, worst };
}

function metricCell(val: number | undefined, best: number | undefined, worst: number | undefined, format: (v: number) => string) {
  if (val == null) return <span className="text-dimmed">—</span>;
  const isBest = best != null && val === best;
  const isWorst = worst != null && val === worst;
  return (
    <span className={`font-mono ${isBest ? 'text-positive bg-positive/10 px-1 rounded' : isWorst ? 'text-negative bg-negative/10 px-1 rounded' : val < 0 ? 'text-negative' : 'text-body'}`}>
      {format(val)}
    </span>
  );
}

export function PeerBenchmarkPage() {
  const { state, dispatch } = useGameState();
  const targetSymbol = state.companyProfile?.symbol;

  const handleContinue = () => {
    dispatch({ type: 'SET_PHASE', phase: 'voting_step1' });
  };

  // Sort: target first, then peers by revenue
  const sorted = useMemo(() => [...state.peerFinancials].sort((a, b) => {
    if (a.symbol === targetSymbol) return -1;
    if (b.symbol === targetSymbol) return 1;
    return b.revenue - a.revenue;
  }), [state.peerFinancials, targetSymbol]);

  // Best/worst for highlighting
  const bw = useMemo(() => ({
    grossMargin: getBestWorst(sorted, 'grossMarginPct'),
    netMargin: getBestWorst(sorted, 'netMarginPct'),
    opMargin: getBestWorst(sorted, 'operatingMarginPct'),
    evEbitda: getBestWorst(sorted, 'evToEbitda', false), // lower is "cheaper"
    roe: getBestWorst(sorted, 'returnOnEquity'),
  }), [sorted]);

  // Revenue bar chart data (sorted by revenue)
  const revenueData = useMemo(() =>
    [...sorted].sort((a, b) => a.revenue - b.revenue).map(p => ({
      name: p.symbol,
      revenue: p.revenue,
      fill: p.symbol === targetSymbol ? TARGET_COLOR : '#3b82f6',
    })),
  [sorted, targetSymbol]);

  // Margin comparison grouped bar chart
  const marginData = useMemo(() =>
    sorted.map(p => ({
      name: p.symbol,
      'Gross Margin': +(p.grossMarginPct ?? 0).toFixed(1),
      'Operating Margin': +(p.operatingMarginPct ?? 0).toFixed(1),
      'Net Margin': +(p.netMarginPct ?? 0).toFixed(1),
    })),
  [sorted]);

  // Radar chart data — normalize metrics to 0-100 scale
  const radarData = useMemo(() => {
    const metrics: { key: keyof PeerFinancials; label: string; invert?: boolean }[] = [
      { key: 'grossMarginPct', label: 'Gross Margin' },
      { key: 'netMarginPct', label: 'Net Margin' },
      { key: 'returnOnEquity', label: 'ROE' },
      { key: 'currentRatio', label: 'Liquidity' },
      { key: 'debtToEquity', label: 'Low Debt', invert: true },
    ];

    // Compute min/max for normalization
    const ranges = metrics.map(m => {
      const vals = sorted.map(p => p[m.key]).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (vals.length === 0) return { min: 0, max: 1 };
      return { min: Math.min(...vals), max: Math.max(...vals) };
    });

    const labels = metrics.map(m => m.label);
    return labels.map((label, mi) => {
      const row: Record<string, string | number> = { metric: label };
      sorted.forEach(p => {
        const raw = p[metrics[mi].key];
        if (typeof raw !== 'number' || isNaN(raw)) {
          row[p.symbol] = 0;
          return;
        }
        const { min, max } = ranges[mi];
        const range = max - min || 1;
        let normalized = ((raw - min) / range) * 100;
        if (metrics[mi].invert) normalized = 100 - normalized;
        row[p.symbol] = +normalized.toFixed(0);
      });
      return row;
    });
  }, [sorted]);

  // Assign colors per company for radar
  const companyColors = useMemo(() => {
    const colors: Record<string, string> = {};
    let peerIdx = 0;
    sorted.forEach(p => {
      if (p.symbol === targetSymbol) {
        colors[p.symbol] = TARGET_COLOR;
      } else {
        colors[p.symbol] = PEER_COLORS[peerIdx % PEER_COLORS.length];
        peerIdx++;
      }
    });
    return colors;
  }, [sorted, targetSymbol]);

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1a1f2e', border: '1px solid #2d3548', borderRadius: '8px' },
    labelStyle: { color: '#f1f5f9' },
    itemStyle: { color: '#cbd5e1' },
  };

  return (
    <div className="min-h-screen bg-surface-base py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-heading">Peer Benchmarking</h1>
          <p className="text-sm text-muted mt-2">
            Financial comparison with selected competitors (most recent annual data)
          </p>
        </div>

        {/* Enhanced Metrics Table */}
        <div className="bg-surface-card rounded-xl border border-edge shadow-sm overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-surface-elevated">
                <th className="text-left py-3 px-4 font-medium text-muted">Company</th>
                <th className="text-right py-3 px-4 font-medium text-muted">Revenue</th>
                <th className="text-right py-3 px-4 font-medium text-muted">Gross Margin</th>
                <th className="text-right py-3 px-4 font-medium text-muted">Op. Margin</th>
                <th className="text-right py-3 px-4 font-medium text-muted">Net Margin</th>
                <th className="text-right py-3 px-4 font-medium text-muted">EV/EBITDA</th>
                <th className="text-right py-3 px-4 font-medium text-muted">ROE</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((peer) => {
                const isTarget = peer.symbol === targetSymbol;
                return (
                  <tr
                    key={peer.symbol}
                    className={`border-b border-edge ${isTarget ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-surface-hover'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {peer.logo && (
                          <img
                            src={peer.logo}
                            alt=""
                            className="w-6 h-6 rounded object-contain bg-white p-0.5 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <span className="text-heading font-medium">
                            {peer.name}
                          </span>
                          {isTarget && (
                            <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">
                              TARGET
                            </span>
                          )}
                          <p className="text-xs text-dimmed">{peer.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-body">
                      {formatCurrency(peer.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {metricCell(peer.grossMarginPct, bw.grossMargin.best, bw.grossMargin.worst, v => `${v.toFixed(1)}%`)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {metricCell(peer.operatingMarginPct, bw.opMargin.best, bw.opMargin.worst, v => `${v.toFixed(1)}%`)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {metricCell(peer.netMarginPct, bw.netMargin.best, bw.netMargin.worst, v => `${v.toFixed(1)}%`)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {metricCell(peer.evToEbitda, bw.evEbitda.best, bw.evEbitda.worst, v => `${v.toFixed(1)}x`)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {metricCell(peer.returnOnEquity, bw.roe.best, bw.roe.worst, v => `${v.toFixed(1)}%`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Bar Chart */}
          <div className="bg-surface-card rounded-xl border border-edge shadow-sm p-6">
            <h3 className="text-lg font-semibold text-heading mb-1">Revenue Comparison</h3>
            <p className="text-sm text-muted mb-4">Annual revenue by company</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#2d3548' }}
                  tickLine={{ stroke: '#2d3548' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  axisLine={{ stroke: '#2d3548' }}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatCurrency(value) : '—'}
                  {...tooltipStyle}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {revenueData.map((entry) => (
                    <rect key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin Comparison Grouped Bar Chart */}
          <div className="bg-surface-card rounded-xl border border-edge shadow-sm p-6">
            <h3 className="text-lg font-semibold text-heading mb-1">Margin Comparison</h3>
            <p className="text-sm text-muted mb-4">Gross, operating, and net margin by company</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={marginData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  axisLine={{ stroke: '#2d3548' }}
                  tickLine={{ stroke: '#2d3548' }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#2d3548' }}
                  tickLine={{ stroke: '#2d3548' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? `${value}%` : '—'}
                  {...tooltipStyle}
                />
                <Legend
                  wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }}
                />
                <Bar dataKey="Gross Margin" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Operating Margin" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Net Margin" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="bg-surface-card rounded-xl border border-edge shadow-sm p-6 md:col-span-2">
              <h3 className="text-lg font-semibold text-heading mb-1">Financial Profile</h3>
              <p className="text-sm text-muted mb-4">Normalized comparison across key financial dimensions</p>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#2d3548" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickCount={5}
                    domain={[0, 100]}
                    axisLine={false}
                  />
                  {sorted.map((p) => (
                    <Radar
                      key={p.symbol}
                      name={p.symbol}
                      dataKey={p.symbol}
                      stroke={companyColors[p.symbol]}
                      fill={companyColors[p.symbol]}
                      fillOpacity={p.symbol === targetSymbol ? 0.25 : 0.08}
                      strokeWidth={p.symbol === targetSymbol ? 2.5 : 1.5}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }}
                  />
                  <Tooltip {...tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="text-center">
          <Button onClick={handleContinue} size="lg" className="px-10">
            Begin Strategic Prioritization
          </Button>
        </div>
      </div>
    </div>
  );
}
