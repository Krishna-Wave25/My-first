import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/Chart";
import { Tabs, TabsList, TabsTrigger } from "../components/Tabs";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { ThemeModeSwitch } from "../components/ThemeModeSwitch";
import { useDashboard } from "../helpers/useDashboard";
import type { DealStage, LeadSource, LeadStatus } from "../helpers/schema";
import styles from "./_index.module.css";

type OpenStage = Extract<DealStage, "discovery" | "proposal" | "negotiation" | "contract">;

const STAGES: { key: OpenStage; label: string }[] = [
  { key: "discovery", label: "Discovery" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "contract", label: "Contract" },
];

const SOURCE_LABEL: Record<LeadSource, string> = {
  referral: "Referral",
  website: "Website",
  linkedin: "LinkedIn",
  event: "Event",
  outbound: "Outbound",
};

const STATUS_VARIANT: Record<LeadStatus, "primary" | "outline" | "success" | "secondary"> = {
  new: "primary",
  contacted: "outline",
  qualified: "success",
  unqualified: "secondary",
};

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-color-1)" },
  target: { label: "Target", color: "var(--chart-color-3)" },
} satisfies ChartConfig;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
// DB `date` columns arrive as UTC midnight — format in UTC so they don't shift a day.
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function relativeTime(date: Date) {
  const diffH = Math.round((Date.now() - date.getTime()) / 36e5);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const d = Math.round(diffH / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default function DashboardPage() {
  const { data, isFetching, error, refetch } = useDashboard();
  const [stageFilter, setStageFilter] = useState<"all" | OpenStage>("all");

  const stats = useMemo(() => {
    if (!data) return null;
    const months = data.revenue.map((m) => ({
      month: monthLabel.format(new Date(m.month)),
      revenue: m.revenue,
      target: m.target,
    }));
    const total = months.reduce((s, m) => s + m.revenue, 0);
    const current = months.at(-1);
    const lastFull = months.at(-2);
    const beforeThat = months.at(-3);
    const change =
      lastFull && beforeThat && beforeThat.revenue > 0
        ? ((lastFull.revenue - beforeThat.revenue) / beforeThat.revenue) * 100
        : null;
    const byStage = STAGES.map((st) => {
      const deals = data.deals.filter((d) => d.stage === st.key);
      return { ...st, count: deals.length, value: deals.reduce((s, d) => s + d.value, 0) };
    });
    return {
      months,
      total,
      current,
      lastFull,
      change,
      pipeline: data.deals.reduce((s, d) => s + d.value, 0),
      byStage,
      maxStage: Math.max(1, ...byStage.map((s) => s.value)),
      newLeads: data.leads.filter((l) => l.status === "new").length,
    };
  }, [data]);

  const visibleDeals = !data
    ? []
    : stageFilter === "all"
      ? data.deals
      : data.deals.filter((d) => d.stage === stageFilter);

  const targetProgress =
    stats?.current && stats.current.target > 0
      ? Math.min(100, (stats.current.revenue / stats.current.target) * 100)
      : 0;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Sales Dashboard · Krishna Agency</title>
      </Helmet>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Krishna Agency</p>
          <h1 className={styles.title}>Sales ledger</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.today}>
            {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
          </span>
          <Button
            variant="ghost"
            size="icon-md"
            aria-label="Refresh data"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? styles.spin : undefined} />
          </Button>
          <ThemeModeSwitch />
        </div>
      </header>

      {error && !data ? (
        <div className={styles.errorBox}>
          <p className={styles.cardTitle}>Couldn't load the dashboard</p>
          <p className={styles.sub}>{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section className={styles.kpis}>
            <div className={`${styles.kpi} ${styles.kpiLead}`}>
              <span className={styles.label}>Revenue, last 12 months</span>
              {stats ? (
                <>
                  <span className={styles.bigNumber}>{money.format(stats.total)}</span>
                  {stats.change !== null && stats.lastFull && (
                    <span className={styles.sub}>
                      {stats.change >= 0 ? (
                        <ArrowUpRight size={14} className={styles.up} />
                      ) : (
                        <ArrowDownRight size={14} className={styles.down} />
                      )}
                      <span className={stats.change >= 0 ? styles.up : styles.down}>
                        {Math.abs(stats.change).toFixed(1)}%
                      </span>
                      {stats.lastFull.month} vs prior month
                    </span>
                  )}
                </>
              ) : (
                <KpiSkeleton big />
              )}
            </div>
            <div className={styles.kpi}>
              <span className={styles.label}>{stats?.current ? `${stats.current.month} so far` : "This month"}</span>
              {stats ? (
                <>
                  <span className={styles.number}>{money.format(stats.current?.revenue ?? 0)}</span>
                  <div className={styles.progressTrack} aria-hidden>
                    <div className={styles.progressFill} style={{ width: `${targetProgress}%` }} />
                  </div>
                  <span className={styles.sub}>
                    {targetProgress.toFixed(0)}% of {compactMoney.format(stats.current?.target ?? 0)} target
                  </span>
                </>
              ) : (
                <KpiSkeleton />
              )}
            </div>
            <div className={styles.kpi}>
              <span className={styles.label}>Open pipeline</span>
              {stats && data ? (
                <>
                  <span className={styles.number}>{money.format(stats.pipeline)}</span>
                  <span className={styles.sub}>{data.deals.length} deals in progress</span>
                </>
              ) : (
                <KpiSkeleton />
              )}
            </div>
            <div className={styles.kpi}>
              <span className={styles.label}>Recent leads</span>
              {stats && data ? (
                <>
                  <span className={styles.number}>{data.leads.length}</span>
                  <span className={styles.sub}>{stats.newLeads} not yet contacted</span>
                </>
              ) : (
                <KpiSkeleton />
              )}
            </div>
          </section>

          <section className={styles.row}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>Monthly revenue</h2>
                <div className={styles.legend}>
                  <span><i className={styles.dotPrimary} /> Revenue</span>
                  <span><i className={styles.dotMuted} /> Target</span>
                </div>
              </div>
              {stats ? (
                <ChartContainer config={chartConfig} className={styles.chart}>
                  <AreaChart data={stats.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => compactMoney.format(v)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      fill="url(#revFill)"
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--color-target)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <Skeleton className={styles.chart} />
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>Pipeline by stage</h2>
              </div>
              <ol className={styles.stageList}>
                {stats
                  ? stats.byStage.map((s, i) => (
                      <li key={s.key} className={styles.stage}>
                        <div className={styles.stageTop}>
                          <span className={styles.stageName}>
                            <span className={styles.stageIndex}>{String(i + 1).padStart(2, "0")}</span>
                            {s.label}
                          </span>
                          <span className={styles.stageValue}>{money.format(s.value)}</span>
                        </div>
                        <div className={styles.stageTrack}>
                          <div
                            className={styles.stageFill}
                            style={{ width: `${(s.value / stats.maxStage) * 100}%`, opacity: 0.45 + i * 0.18 }}
                          />
                        </div>
                        <span className={styles.stageCount}>
                          {s.count} {s.count === 1 ? "deal" : "deals"}
                        </span>
                      </li>
                    ))
                  : STAGES.map((s) => (
                      <li key={s.key} className={styles.stage}>
                        <Skeleton className={styles.skelLine} />
                        <Skeleton className={styles.skelBar} />
                      </li>
                    ))}
              </ol>
            </div>
          </section>

          <section className={styles.row}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>Deals in progress</h2>
                <Tabs value={stageFilter} onValueChange={(v) => setStageFilter(v as "all" | OpenStage)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    {STAGES.map((s) => (
                      <TabsTrigger key={s.key} value={s.key}>
                        {s.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Stage</th>
                      <th>Owner</th>
                      <th>Close</th>
                      <th className={styles.num}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5}>
                            <Skeleton className={styles.skelRow} />
                          </td>
                        </tr>
                      ))}
                    {visibleDeals.map((d) => {
                      const stageIdx = STAGES.findIndex((s) => s.key === d.stage);
                      return (
                        <tr key={d.id}>
                          <td>
                            <div className={styles.dealName}>{d.name}</div>
                            <div className={styles.dealClient}>{d.client}</div>
                          </td>
                          <td>
                            <span className={styles.stagePips}>
                              {STAGES.map((s, i) => (
                                <i key={s.key} className={i <= stageIdx ? styles.pipOn : styles.pip} />
                              ))}
                              <span>{STAGES[stageIdx]?.label ?? d.stage}</span>
                            </span>
                          </td>
                          <td>{d.owner}</td>
                          <td className={styles.mono}>
                            {d.expectedClose ? shortDate.format(new Date(d.expectedClose)) : "—"}
                          </td>
                          <td className={`${styles.num} ${styles.dealValue}`}>{money.format(d.value)}</td>
                        </tr>
                      );
                    })}
                    {data && visibleDeals.length === 0 && (
                      <tr>
                        <td colSpan={5} className={styles.empty}>
                          No deals in this stage.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>Recent leads</h2>
              </div>
              <ul className={styles.leadList}>
                {!data &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className={styles.lead}>
                      <Skeleton className={styles.skelRow} />
                    </li>
                  ))}
                {data?.leads.map((l) => (
                  <li key={l.id} className={styles.lead}>
                    <div className={styles.leadMain}>
                      <span className={styles.leadName}>{l.name}</span>
                      <span className={styles.leadMeta}>
                        {l.company} · {SOURCE_LABEL[l.source]}
                      </span>
                    </div>
                    <div className={styles.leadSide}>
                      <Badge variant={STATUS_VARIANT[l.status]} className={styles.leadBadge}>
                        {l.status}
                      </Badge>
                      <span className={styles.leadTime}>
                        {compactMoney.format(l.estValue)} · {relativeTime(new Date(l.createdAt))}
                      </span>
                    </div>
                  </li>
                ))}
                {data && data.leads.length === 0 && <li className={styles.empty}>No leads yet.</li>}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KpiSkeleton({ big = false }: { big?: boolean }) {
  return (
    <>
      <Skeleton className={big ? styles.skelBig : styles.skelNumber} />
      <Skeleton className={styles.skelLine} />
    </>
  );
}
