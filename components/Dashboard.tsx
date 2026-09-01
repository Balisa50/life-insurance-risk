"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

import type {
  PipelineData,
  Basis,
  SelectTableRow,
  CoxCoefficient,
  HistogramBin,
  ScenarioResult,
  PremiumGroupRow,
} from "@/lib/types";

/* ─── helpers ─── */

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const pct = (n: number, d = 1) => (n * 100).toFixed(d) + "%";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6",
];

/* ─── reusable blocks ─── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // min-w-0 is load-bearing. A grid item defaults to min-width:auto, so without
  // this a Card refuses to shrink below its content and the Recharts
  // ResponsiveContainer inside it measures a parent wider than the viewport.
  // On a phone that pushed the whole page to ~1228px against a 375px screen.
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} className="scroll-mt-20 mb-6">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  // Drop the value font from text-2xl to text-xl on narrow screens so wide
  // numbers like "$493,700,000" never overflow the card on phone widths.
  // min-w-0 + break-words on the wrapper lets flex/grid parents actually
  // shrink the column, otherwise the number forces the card wider than
  // the viewport.
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-text mt-1 break-words leading-tight">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── nav ─── */

const NAV_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#mortality", label: "Mortality" },
  { href: "#survival", label: "Survival" },
  { href: "#cox", label: "Cox PH" },
  { href: "#persistency", label: "Persistency" },
  { href: "#pricing", label: "Pricing" },
  { href: "#montecarlo", label: "Monte Carlo" },
  { href: "#scenarios", label: "Scenarios" },
];

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-14">
        <span className="font-semibold text-text text-sm tracking-tight">
          Life Insurance Risk Model
        </span>
        <div className="hidden md:flex gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text hover:bg-surface-hover rounded-md transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ─── main dashboard ─── */

export function Dashboard({ data }: { data: PipelineData }) {
  const { demographics: demo, life_table, survival, cox_ph, pricing, monte_carlo, scenarios,
          basis, select_table, persistency } = data;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-16">
        {/* ══════════ OVERVIEW ══════════ */}
        <section>
          <SectionTitle
            id="overview"
            title="Portfolio Overview"
            subtitle={
              !demo.data_source || demo.data_source === "synthetic"
                ? `${demo.total_policies.toLocaleString()} synthetic policyholders, calibrated to Sub-Saharan African mortality`
                : `${demo.total_policies.toLocaleString()} policyholders loaded from ${demo.data_source}`
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card><Stat label="Policies" value={demo.total_policies.toLocaleString()} /></Card>
            <Card><Stat label="Avg Age" value={demo.avg_age.toString()} sub="years" /></Card>
            <Card><Stat label="Smoker Rate" value={pct(demo.smoker_rate, 1)} /></Card>
            <Card><Stat label="Avg BMI" value={demo.avg_bmi.toString()} /></Card>
            <Card><Stat label="Avg Sum Assured" value={usd(demo.avg_sum_assured)} /></Card>
            <Card><Stat label="Total Exposure" value={usd(demo.total_sum_assured)} /></Card>
          </div>

          {/* Demographics charts */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Age Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(demo.age_band_counts).map(([band, count]) => ({ band, count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="band" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Health Score Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(demo.health_score_dist).map(([score, count]) => ({ score: `Score ${score}`, count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="score" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        {/* ══════════ MORTALITY ══════════ */}
        <section>
          <SectionTitle
            id="mortality"
            title="Mortality Model"
            subtitle="Gompertz-Makeham hazard model calibrated to Sub-Saharan African mortality patterns"
          />
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">
                Mortality Rate (q<sub>x</sub>) by Age
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={life_table.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="age" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                    formatter={(v) => pct(Number(v), 2)}
                  />
                  <Line type="monotone" dataKey="qx" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="q(x)" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">
                Life Expectancy (e<sub>x</sub>) by Age
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={life_table.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="age" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                    formatter={(v) => `${Number(v).toFixed(1)} years`}
                  />
                  <Area type="monotone" dataKey="ex" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="e(x)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Survivors curve */}
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              Survivors (l<sub>x</sub>) out of 100,000
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={life_table.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="age" tick={{ fill: "#737373", fontSize: 12 }} />
                <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                  labelStyle={{ color: "#fafafa" }}
                  formatter={(v) => Number(v).toLocaleString()}
                />
                <Area type="monotone" dataKey="lx" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2} name="Survivors" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-1">
              Select and Ultimate Mortality
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              q[x]+t, the rate for a life underwritten at age x and now t years into the
              policy. Reading a row left to right shows the effect of underwriting wearing
              off over the {basis.select_period}-year select period. The ultimate column is
              the rate the row converges to, which depends on attained age alone.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left py-3 px-3 font-medium">Entry age</th>
                    {Array.from({ length: basis.select_period }, (_, t) => (
                      <th key={t} className="text-right py-3 px-3 font-medium whitespace-nowrap">
                        q[x]+{t}
                      </th>
                    ))}
                    <th className="text-right py-3 px-3 font-medium whitespace-nowrap">Ultimate</th>
                  </tr>
                </thead>
                <tbody>
                  {select_table.map((r: SelectTableRow) => (
                    <tr key={r.entry_age} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 font-mono text-accent">{r.entry_age}</td>
                      {Array.from({ length: basis.select_period }, (_, t) => (
                        <td key={t} className="py-3 px-3 text-right font-mono tabular-nums">
                          {(r[`d${t}`] as number).toFixed(6)}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        {r.ultimate.toFixed(6)}
                        <span className="text-text-secondary font-normal"> @{r.ultimate_age}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* ══════════ SURVIVAL ANALYSIS ══════════ */}
        <section>
          <SectionTitle
            id="survival"
            title="Survival Analysis"
            subtitle={`Kaplan-Meier curves across ${survival.mortality_summary.total_deaths.toLocaleString()} observed deaths (${pct(survival.mortality_summary.death_rate)} mortality rate)`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card><Stat label="Total Deaths" value={survival.mortality_summary.total_deaths.toLocaleString()} /></Card>
            <Card><Stat label="Mortality Rate" value={pct(survival.mortality_summary.death_rate)} /></Card>
            <Card><Stat label="Avg Duration at Death" value={`${survival.mortality_summary.avg_duration_at_death} yrs`} /></Card>
            <Card><Stat label="Lapsed" value={pct(survival.mortality_summary.lapse_rate)} sub="censored, not claims" /></Card>
            <Card>
              <Stat
                label="Male / Female Deaths"
                value={`${survival.mortality_summary.deaths_by_gender["M"] ?? 0} / ${survival.mortality_summary.deaths_by_gender["F"] ?? 0}`}
              />
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall KM */}
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Overall Survival Curve</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={buildKMData(survival.km_overall["overall"])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="time" tick={{ fill: "#737373", fontSize: 12 }} label={{ value: "Years", position: "insideBottomRight", offset: -5, fill: "#737373", fontSize: 11 }} />
                  <YAxis domain={[0.7, 1]} tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => pct(Number(v), 2)}
                  />
                  <Line type="stepAfter" dataKey="survival" stroke="#3b82f6" strokeWidth={2} dot={false} name="S(t)" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* KM by gender */}
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Survival by Gender</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="time" type="number" tick={{ fill: "#737373", fontSize: 12 }} allowDuplicatedCategory={false} />
                  <YAxis domain={[0.6, 1]} tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }} formatter={(v) => pct(Number(v), 2)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {Object.entries(survival.km_by_gender).map(([group, curve], i) => (
                    <Line
                      key={group}
                      data={buildKMData(curve)}
                      type="stepAfter"
                      dataKey="survival"
                      stroke={CHART_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      name={group === "M" ? "Male" : "Female"}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* KM by smoker */}
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Survival by Smoker Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="time" type="number" tick={{ fill: "#737373", fontSize: 12 }} allowDuplicatedCategory={false} />
                  <YAxis domain={[0.6, 1]} tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }} formatter={(v) => pct(Number(v), 2)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {Object.entries(survival.km_by_smoker).map(([group, curve], i) => (
                    <Line
                      key={group}
                      data={buildKMData(curve)}
                      type="stepAfter"
                      dataKey="survival"
                      stroke={CHART_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      name={group === "1" ? "Smoker" : "Non-smoker"}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* KM by health score */}
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Survival by Health Score</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="time" type="number" tick={{ fill: "#737373", fontSize: 12 }} allowDuplicatedCategory={false} />
                  <YAxis domain={[0.5, 1]} tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }} formatter={(v) => pct(Number(v), 2)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {Object.entries(survival.km_by_health).map(([group, curve], i) => (
                    <Line
                      key={group}
                      data={buildKMData(curve)}
                      type="stepAfter"
                      dataKey="survival"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={`Score ${group}`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        {/* ══════════ COX PH ══════════ */}
        <section>
          <SectionTitle
            id="cox"
            title="Cox Proportional Hazards"
            subtitle={[
              cox_ph.concordance === null
                ? cox_ph.concordance_in_sample === null
                  ? `Not fitted, ${cox_ph.n_events} death(s)`
                  : `Concordance ${cox_ph.concordance_in_sample} in sample, none held out`
                : `Concordance ${cox_ph.concordance} held out, ${cox_ph.concordance_in_sample} in sample`,
              cox_ph.ph_violations === null
                ? null
                : `Proportional hazards: ${cox_ph.ph_violations} of ${cox_ph.coefficients.length} covariates breach at p < 0.05`,
              cox_ph.log_likelihood === null
                ? null
                : `Log-likelihood ratio: ${cox_ph.log_likelihood}`,
            ]
              .filter(Boolean)
              .join(" | ")}
          />

          {cox_ph.warning && (
            <p className="mb-6 border-l-2 border-warning pl-4 text-sm text-text-secondary">
              {cox_ph.warning}
            </p>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left py-3 px-3 font-medium">Covariate</th>
                    <th className="text-right py-3 px-3 font-medium">Coefficient</th>
                    <th className="text-right py-3 px-3 font-medium">Hazard Ratio</th>
                    <th className="text-right py-3 px-3 font-medium">95% CI</th>
                    <th className="text-right py-3 px-3 font-medium">p-value</th>
                    <th className="text-right py-3 px-3 font-medium">Significance</th>
                  </tr>
                </thead>
                <tbody>
                  {cox_ph.coefficients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 px-3 text-center text-text-secondary">
                        No coefficients. The book carried too few deaths to fit the model.
                      </td>
                    </tr>
                  )}
                  {cox_ph.coefficients.map((c: CoxCoefficient) => (
                    <tr key={c.covariate} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 font-mono text-accent">{c.covariate}</td>
                      <td className="py-3 px-3 text-right">{c.coef.toFixed(4)}</td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={c.hazard_ratio > 1 ? "text-negative" : "text-positive"}>
                          {c.hazard_ratio.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-text-secondary">
                        [{c.ci_lower.toFixed(3)}, {c.ci_upper.toFixed(3)}]
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{c.p_value < 0.001 ? "<0.001" : c.p_value.toFixed(4)}</td>
                      <td className="py-3 px-3 text-right">
                        {c.p_value < 0.001 ? (
                          <span className="text-xs bg-positive/20 text-positive px-2 py-0.5 rounded-full">***</span>
                        ) : c.p_value < 0.01 ? (
                          <span className="text-xs bg-positive/20 text-positive px-2 py-0.5 rounded-full">**</span>
                        ) : c.p_value < 0.05 ? (
                          <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">*</span>
                        ) : (
                          <span className="text-xs bg-border text-text-secondary px-2 py-0.5 rounded-full">ns</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Hazard Ratio forest plot */}
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Hazard Ratios</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cox_ph.coefficients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis type="number" tick={{ fill: "#737373", fontSize: 12 }} domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                <YAxis dataKey="covariate" type="category" tick={{ fill: "#737373", fontSize: 12 }} width={100} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                  labelStyle={{ color: "#fafafa" }}
                  formatter={(v) => Number(v).toFixed(4)}
                />
                <Bar dataKey="hazard_ratio" name="Hazard Ratio" radius={[0, 4, 4, 0]}>
                  {cox_ph.coefficients.map((c, i) => (
                    <Cell key={i} fill={c.hazard_ratio > 1 ? "#ef4444" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ══════════ PERSISTENCY ══════════ */}
        <section>
          <SectionTitle
            id="persistency"
            title="Persistency and Lapses"
            subtitle={`${pct(basis.lapse_rates[0].rate)} lapse in year one, falling to ${pct(basis.ultimate_lapse)} ultimate | ${pct(pricing.portfolio_totals.avg_in_force_end)} of policies expected to reach the end of their term`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card><Stat label="Year 1 Lapse" value={pct(basis.lapse_rates[0].rate)} /></Card>
            <Card><Stat label="Ultimate Lapse" value={pct(basis.ultimate_lapse)} sub={`from duration ${basis.lapse_rates.length - 1}`} /></Card>
            <Card><Stat label="In Force at 10 yrs" value={pct(persistency[10]?.in_force ?? 0)} sub="lapses only" /></Card>
            <Card><Stat label="In Force at 20 yrs" value={pct(persistency[20]?.in_force ?? 0)} sub="lapses only" /></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">
                Persistency Curve
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={persistency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="duration" tick={{ fill: "#737373", fontSize: 12 }} label={{ value: "Policy year", position: "insideBottom", offset: -4, fill: "#737373", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => pct(Number(v))}
                    labelFormatter={(l) => `Policy year ${l}`}
                  />
                  <Area type="monotone" dataKey="in_force" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.12} strokeWidth={2} name="In force" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">
                Lapse Rate by Duration
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={basis.lapse_rates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="duration" tick={{ fill: "#737373", fontSize: 12 }} label={{ value: "Policy year", position: "insideBottom", offset: -4, fill: "#737373", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => pct(v, 0)} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => pct(Number(v))}
                    labelFormatter={(l) => `Policy year ${l}`}
                  />
                  <Bar dataKey="rate" fill="#ec4899" radius={[4, 4, 0, 0]} name="Lapse rate" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Select Factors</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left py-3 px-3 font-medium">Policy year</th>
                    {basis.select_factors.map((f) => (
                      <th key={f.duration} className="text-right py-3 px-3 font-medium">{f.duration}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-3 text-text-secondary">Mortality vs ultimate</td>
                    {basis.select_factors.map((f) => (
                      <td key={f.duration} className="py-3 px-3 text-right font-mono tabular-nums">
                        {pct(f.factor, 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-text-secondary">Lapse rate</td>
                    {basis.select_factors.map((f) => {
                      const l = basis.lapse_rates.find((r) => r.duration === f.duration);
                      return (
                        <td key={f.duration} className="py-3 px-3 text-right font-mono tabular-nums">
                          {l ? pct(l.rate, 0) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <p className="mt-6 border-l-2 border-warning pl-4 text-sm text-text-secondary">
            {basis.note} Lapses are treated as censoring in the survival analysis, never as
            claims: a policyholder who stops paying walks away alive, and counting them as
            deaths would bias the mortality estimate badly.
          </p>
        </section>

        {/* ══════════ PRICING ══════════ */}
        <section>
          <SectionTitle
            id="pricing"
            title="Actuarial Pricing"
            subtitle="Net single premium with 6% discount rate and 15% expense loading"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card><Stat label="Avg Net Single Premium" value={usd(pricing.portfolio_totals.avg_nsp)} /></Card>
            <Card><Stat label="Avg Annual Premium" value={usd(pricing.portfolio_totals.avg_annual_gross)} sub="gross" /></Card>
            <Card><Stat label="Total Annual Income" value={usd(pricing.portfolio_totals.total_annual_gross)} /></Card>
            <Card><Stat label="Total NSP" value={usd(pricing.portfolio_totals.total_nsp)} /></Card>
            <Card>
              <Stat
                label="Priced Without Lapses"
                value={usd(pricing.portfolio_totals.avg_annual_gross_no_lapse)}
                sub={`${pct(pricing.portfolio_totals.avg_lapse_credit)} lapse credit`}
              />
            </Card>
            <Card>
              <Stat
                label="Reach End of Term"
                value={pct(pricing.portfolio_totals.avg_in_force_end)}
                sub="expected"
              />
            </Card>
          </div>

          <p className="mb-6 border-l-2 border-warning pl-4 text-sm text-text-secondary">
            Taking credit for lapses makes the book {pct(pricing.portfolio_totals.avg_lapse_credit)} cheaper,
            because policyholders who leave a term assurance forfeit everything and were
            never going to claim. That is a real effect and a real exposure: if persistency
            comes in better than assumed, the book is underpriced. A reserving basis would
            not take the same credit a pricing basis does.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Average Annual Premium by Age</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pricing.summaries.by_age}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="age_band" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => usd(Number(v))}
                  />
                  <Bar dataKey="avg_annual" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Annual Premium" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Average Annual Premium by Risk Factor</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pricing.summaries.by_smoker}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="smoker_label" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => usd(Number(v))}
                  />
                  <Bar dataKey="avg_annual" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Annual Premium" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Premium by Gender</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pricing.summaries.by_gender}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="gender" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => usd(Number(v))}
                  />
                  <Bar dataKey="avg_annual" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Avg Annual Premium" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Premium by Health Score</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pricing.summaries.by_health}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="health_score" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => usd(Number(v))}
                  />
                  <Bar dataKey="avg_annual" radius={[4, 4, 0, 0]} name="Avg Annual Premium">
                    {pricing.summaries.by_health.map((_: PremiumGroupRow, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        {/* ══════════ MONTE CARLO ══════════ */}
        <section>
          <SectionTitle
            id="montecarlo"
            title="Monte Carlo Simulation"
            subtitle={`${monte_carlo.n_simulations.toLocaleString()} simulations over a ${monte_carlo.horizon_years}-year horizon`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card><Stat label="Mean Aggregate Claims" value={usd(monte_carlo.mean_claims)} /></Card>
            <Card><Stat label="VaR 99.5%" value={usd(monte_carlo.var_995)} sub="Value at Risk" /></Card>
            <Card><Stat label="TVaR 99.5%" value={usd(monte_carlo.tvar_995)} sub="Tail Value at Risk" /></Card>
            <Card><Stat label="Required Reserve" value={usd(monte_carlo.required_reserve)} sub="Mean + risk margin" /></Card>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card><Stat label="Std Deviation" value={usd(monte_carlo.std_claims)} /></Card>
            <Card><Stat label="Mean Deaths" value={monte_carlo.mean_deaths.toFixed(0)} sub={`of ${monte_carlo.n_policies.toLocaleString()}`} /></Card>
            <Card><Stat label="Loss Ratio" value={pct(monte_carlo.loss_ratio_mean, 2)} sub="claims / exposure" /></Card>
            <Card><Stat label="Risk Margin" value={usd(monte_carlo.risk_margin)} /></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Aggregate Claims Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monte_carlo.histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="bin_start"
                    tick={{ fill: "#737373", fontSize: 10 }}
                    tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
                  />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    labelFormatter={(v) => `$${(Number(v) / 1e6).toFixed(2)}M`}
                    formatter={(v) => [`${v} simulations`, "Count"]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                    {monte_carlo.histogram.map((bin: HistogramBin, i: number) => (
                      <Cell
                        key={i}
                        fill={bin.bin_start >= monte_carlo.var_995 ? "#ef4444" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-text-secondary mt-2 text-center">
                <span className="inline-block w-3 h-3 rounded bg-negative mr-1 align-middle" />
                Tail beyond VaR 99.5%
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-text-secondary mb-4">Death Count Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monte_carlo.death_histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="bin_start" tick={{ fill: "#737373", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#737373", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                    formatter={(v) => [`${v} simulations`, "Count"]}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Percentile table */}
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Claim Percentiles</h3>
            {/*
              Mobile: 1 column with label/value on the same row, left/right
              aligned. This gives each percentile a full-width band so the
              dollar values can never collide, and reads cleanly on a phone.
              Tablet: 4 columns. Desktop: 7-across, traditional table look.
            */}
            <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
              {Object.entries(monte_carlo.percentiles).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between sm:block sm:text-center min-w-0 px-3 py-2 sm:p-0 rounded-lg sm:rounded-none bg-surface-elevated/40 sm:bg-transparent"
                >
                  <p className="text-xs text-text-secondary uppercase">{key}</p>
                  <p className="text-sm font-semibold text-text sm:mt-1 whitespace-nowrap tabular-nums">{usd(val)}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ══════════ SCENARIOS ══════════ */}
        <section>
          <SectionTitle
            id="scenarios"
            title="Stress Testing"
            subtitle="Monte Carlo under mortality shock scenarios"
          />

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left py-3 px-3 font-medium">Scenario</th>
                    <th className="text-right py-3 px-3 font-medium">Mortality Shock</th>
                    <th className="text-right py-3 px-3 font-medium">Mean Claims</th>
                    <th className="text-right py-3 px-3 font-medium">VaR 99.5%</th>
                    <th className="text-right py-3 px-3 font-medium">TVaR 99.5%</th>
                    <th className="text-right py-3 px-3 font-medium">Mean Deaths</th>
                    <th className="text-right py-3 px-3 font-medium">Required Reserve</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s: ScenarioResult, i: number) => (
                    <tr key={s.scenario} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 font-medium">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[i] }} />
                        {s.scenario}
                      </td>
                      <td className="py-3 px-3 text-right">{s.mortality_shock}x</td>
                      <td className="py-3 px-3 text-right">{usd(s.mean_claims)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-warning">{usd(s.var_995)}</td>
                      <td className="py-3 px-3 text-right text-negative">{usd(s.tvar_995)}</td>
                      <td className="py-3 px-3 text-right">{s.mean_deaths.toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-semibold">{usd(s.required_reserve)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Scenario comparison chart */}
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Scenario Comparison</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scenarios}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="scenario" tick={{ fill: "#737373", fontSize: 12 }} />
                <YAxis tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                  formatter={(v) => usd(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mean_claims" fill="#3b82f6" name="Mean Claims" radius={[4, 4, 0, 0]} />
                <Bar dataKey="var_995" fill="#f59e0b" name="VaR 99.5%" radius={[4, 4, 0, 0]} />
                <Bar dataKey="required_reserve" fill="#ef4444" name="Required Reserve" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer className="border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-text-secondary">
            Life Insurance Risk Model by Abdoulie Balisa
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Gompertz-Makeham mortality, Kaplan-Meier survival, Cox PH, actuarial pricing, Monte Carlo VaR
          </p>
        </footer>
      </main>
    </>
  );
}

/* ─── KM data transformer ─── */
function buildKMData(curve: { timeline: number[]; survival: number[] }) {
  return curve.timeline.map((t, i) => ({
    time: t,
    survival: curve.survival[i],
  }));
}
