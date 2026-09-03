"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PipelineData, PremiumGroupRow } from "@/lib/types";
import { Card, SectionTitle, Stat } from "../primitives";
import { usd, pct, CHART_COLORS } from "../format";

export function Pricing({ data }: { data: PipelineData }) {
  const { pricing, basis, persistency } = data;

  return (
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
  );
}
