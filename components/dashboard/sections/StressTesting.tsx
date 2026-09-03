"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PipelineData, ScenarioResult } from "@/lib/types";
import { Card, SectionTitle } from "../primitives";
import { usd, CHART_COLORS } from "../format";

export function StressTesting({ data }: { data: PipelineData }) {
  const { scenarios } = data;

  return (
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
  );
}
