"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PipelineData, SelectTableRow } from "@/lib/types";
import { Card, SectionTitle } from "../primitives";
import { pct } from "../format";

export function Mortality({ data }: { data: PipelineData }) {
  const { life_table, basis, select_table } = data;

  return (
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
  );
}
