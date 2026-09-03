"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PipelineData } from "@/lib/types";
import { Card, SectionTitle, Stat } from "../primitives";
import { pct, CHART_COLORS, buildKMData } from "../format";

export function Survival({ data }: { data: PipelineData }) {
  const { survival } = data;

  return (
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
  );
}
