"use client";

import {
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
import { usd, pct } from "../format";

export function Overview({ data }: { data: PipelineData }) {
  const { demographics: demo } = data;

  return (
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
  );
}
