"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PipelineData } from "@/lib/types";
import { Card, SectionTitle, Stat } from "../primitives";
import { pct } from "../format";

export function Persistency({ data }: { data: PipelineData }) {
  const { survival, pricing, basis, persistency } = data;

  return (
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
  );
}
