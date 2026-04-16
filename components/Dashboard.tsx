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
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>
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
  return (
    <div>
      <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-text mt-1">{value}</p>
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
  const { demographics: demo, life_table, survival, cox_ph, pricing, monte_carlo, scenarios } = data;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-16">
        {/* ══════════ OVERVIEW ══════════ */}
        <section>
          <SectionTitle
            id="overview"
            title="Portfolio Overview"
            subtitle={`${demo.total_policies.toLocaleString()} synthetic policyholders, calibrated to Sub-Saharan African mortality`}
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
            subtitle={`Concordance index: ${cox_ph.concordance} | Log-likelihood ratio: ${cox_ph.log_likelihood}`}
          />

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
          </div>

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
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(monte_carlo.percentiles).map(([key, val]) => (
                <div key={key} className="text-center">
                  <p className="text-xs text-text-secondary uppercase">{key}</p>
                  <p className="text-sm font-semibold text-text mt-1">{usd(val)}</p>
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
