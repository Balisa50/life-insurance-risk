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
import type { PipelineData, HistogramBin } from "@/lib/types";
import { Card, SectionTitle, Stat } from "../primitives";
import { usd, pct } from "../format";

export function MonteCarlo({ data }: { data: PipelineData }) {
  const { monte_carlo } = data;

  return (
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
  );
}
