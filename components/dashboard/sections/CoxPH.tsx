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
import type { PipelineData, CoxCoefficient } from "@/lib/types";
import { Card, SectionTitle } from "../primitives";

export function CoxPH({ data }: { data: PipelineData }) {
  const { cox_ph } = data;

  return (
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
  );
}
