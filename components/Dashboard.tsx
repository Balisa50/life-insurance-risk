"use client";

/* The dashboard is a composition of eight sections, one per stage of the
   pipeline. Each lives in components/dashboard/sections and takes the whole
   PipelineData, destructuring only what it needs. This file exists to order
   them and to own the page chrome. */

import type { PipelineData } from "@/lib/types";

import { Nav } from "./dashboard/primitives";
import { Overview } from "./dashboard/sections/Overview";
import { Mortality } from "./dashboard/sections/Mortality";
import { Survival } from "./dashboard/sections/Survival";
import { CoxPH } from "./dashboard/sections/CoxPH";
import { Persistency } from "./dashboard/sections/Persistency";
import { Pricing } from "./dashboard/sections/Pricing";
import { MonteCarlo } from "./dashboard/sections/MonteCarlo";
import { StressTesting } from "./dashboard/sections/StressTesting";

export function Dashboard({ data }: { data: PipelineData }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-16">
        <Overview data={data} />
        <Mortality data={data} />
        <Survival data={data} />
        <CoxPH data={data} />
        <Persistency data={data} />
        <Pricing data={data} />
        <MonteCarlo data={data} />
        <StressTesting data={data} />

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
