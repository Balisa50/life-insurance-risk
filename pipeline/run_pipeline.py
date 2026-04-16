"""
Life Insurance Risk Model - Full Pipeline Runner
Generates all analysis and exports to JSON for the Next.js dashboard.
"""

from __future__ import annotations

import json
import os
import sys
import time

import numpy as np
import pandas as pd

# Add pipeline to path
sys.path.insert(0, os.path.dirname(__file__))

from src.mortality import generate_life_table, generate_policyholders
from src.survival import simulate_policy_events, fit_kaplan_meier, fit_cox_ph
from src.pricing import price_portfolio, premium_summary_by_group
from src.monte_carlo import simulate_claims, scenario_analysis


def run() -> None:
    start = time.time()
    print("=" * 60)
    print("  Life Insurance Risk Model Pipeline")
    print("=" * 60)

    # --- 1. Generate life table ---
    print("\n[1/6] Generating life table (Gompertz-Makeham)...")
    life_table = generate_life_table(max_age=100)
    print(f"  Life table: {len(life_table)} ages, e0 = {life_table.loc[0, 'ex']:.1f} years")

    # --- 2. Generate policyholders ---
    print("\n[2/6] Generating 10,000 synthetic policyholders...")
    policyholders = generate_policyholders(n=10_000)
    print(f"  Ages: {policyholders['age'].min()}-{policyholders['age'].max()}")
    print(f"  Smokers: {policyholders['smoker'].mean()*100:.1f}%")
    print(f"  Total sum assured: ${policyholders['sum_assured'].sum():,.0f}")

    # --- 3. Survival analysis ---
    print("\n[3/6] Running survival analysis...")
    events_df = simulate_policy_events(policyholders, life_table)
    death_rate = events_df["event"].mean()
    print(f"  Mortality rate over term: {death_rate*100:.2f}%")
    print(f"  Total deaths: {events_df['event'].sum()}")

    # Kaplan-Meier curves
    print("  Fitting Kaplan-Meier curves...")
    km_overall = fit_kaplan_meier(events_df)
    km_gender = fit_kaplan_meier(events_df, group_col="gender")
    km_smoker = fit_kaplan_meier(events_df, group_col="smoker")
    km_health = fit_kaplan_meier(events_df, group_col="health_score")

    # Cox Proportional Hazards
    print("  Fitting Cox PH model...")
    cox_results = fit_cox_ph(events_df)
    print(f"  Concordance index: {cox_results['concordance']:.4f}")

    # --- 4. Pricing ---
    print("\n[4/6] Pricing portfolio...")
    priced = price_portfolio(policyholders, life_table)
    print(f"  Avg net single premium: ${priced['net_single_premium'].mean():,.2f}")
    print(f"  Avg annual gross premium: ${priced['annual_premium_gross'].mean():,.2f}")
    print(f"  Total annual premium income: ${priced['annual_premium_gross'].sum():,.0f}")

    premium_summaries = premium_summary_by_group(priced)

    # --- 5. Monte Carlo ---
    print("\n[5/6] Running Monte Carlo simulation (5,000 scenarios, 5-year horizon)...")
    mc_results = simulate_claims(policyholders, life_table, n_simulations=5_000, horizon_years=5)
    print(f"  Mean aggregate claims: ${mc_results['mean_claims']:,.0f}")
    print(f"  VaR 99.5%: ${mc_results['var_995']:,.0f}")
    print(f"  TVaR 99.5%: ${mc_results['tvar_995']:,.0f}")
    print(f"  Required reserve: ${mc_results['required_reserve']:,.0f}")

    # --- 6. Stress scenarios ---
    print("\n[6/6] Running scenario analysis...")
    scenarios = scenario_analysis(policyholders, life_table, n_simulations=2_000, horizon_years=5)
    for s in scenarios:
        print(f"  {s['scenario']}: mean claims ${s['mean_claims']:,.0f}, VaR ${s['var_995']:,.0f}")

    # --- Build output JSON ---
    print("\n" + "-" * 60)
    print("Assembling results...")

    # Life table data (sample every 5 years for chart)
    lt_chart = life_table[life_table["age"] % 5 == 0].to_dict(orient="records")
    lt_full = life_table.to_dict(orient="records")

    # Portfolio demographics
    age_dist = policyholders["age"].value_counts().sort_index()
    age_bins = pd.cut(policyholders["age"], bins=[19, 30, 40, 50, 65], labels=["20-30", "31-40", "41-50", "51-65"])
    age_band_counts = age_bins.value_counts().sort_index().to_dict()

    demographics = {
        "total_policies": len(policyholders),
        "avg_age": round(float(policyholders["age"].mean()), 1),
        "gender_split": policyholders["gender"].value_counts().to_dict(),
        "smoker_rate": round(float(policyholders["smoker"].mean()), 4),
        "avg_bmi": round(float(policyholders["bmi"].mean()), 1),
        "avg_sum_assured": round(float(policyholders["sum_assured"].mean()), 0),
        "total_sum_assured": float(policyholders["sum_assured"].sum()),
        "avg_term": round(float(policyholders["term_years"].mean()), 1),
        "age_band_counts": {str(k): int(v) for k, v in age_band_counts.items()},
        "health_score_dist": policyholders["health_score"].value_counts().sort_index().to_dict(),
    }

    # Premium distribution data
    premium_dist_data = []
    for _, row in priced.iterrows():
        premium_dist_data.append({
            "age": int(row["age"]),
            "annual_premium": round(float(row["annual_premium_gross"]), 2),
            "sum_assured": float(row["sum_assured"]),
            "risk_multiplier": round(float(row["risk_multiplier"]), 3),
        })

    # Mortality event summary
    mortality_summary = {
        "total_deaths": int(events_df["event"].sum()),
        "death_rate": round(death_rate, 4),
        "avg_duration_at_death": round(
            float(events_df[events_df["event"] == 1]["duration"].mean()), 1
        ) if events_df["event"].sum() > 0 else 0,
        "deaths_by_gender": events_df[events_df["event"] == 1]["gender"].value_counts().to_dict(),
        "deaths_by_smoker": {
            ("Smoker" if k == 1 else "Non-smoker"): int(v)
            for k, v in events_df[events_df["event"] == 1]["smoker"].value_counts().to_dict().items()
        },
    }

    output = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "life_table": {
            "chart": lt_chart,
            "full": lt_full,
        },
        "demographics": demographics,
        "survival": {
            "mortality_summary": mortality_summary,
            "km_overall": km_overall,
            "km_by_gender": km_gender,
            "km_by_smoker": km_smoker,
            "km_by_health": km_health,
        },
        "cox_ph": cox_results,
        "pricing": {
            "portfolio_totals": {
                "total_nsp": round(float(priced["net_single_premium"].sum()), 2),
                "total_annual_net": round(float(priced["annual_premium_net"].sum()), 2),
                "total_annual_gross": round(float(priced["annual_premium_gross"].sum()), 2),
                "avg_nsp": round(float(priced["net_single_premium"].mean()), 2),
                "avg_annual_gross": round(float(priced["annual_premium_gross"].mean()), 2),
            },
            "summaries": premium_summaries,
        },
        "monte_carlo": mc_results,
        "scenarios": scenarios,
    }

    # --- Export ---
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "pipeline_results.json")

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    elapsed = time.time() - start
    print(f"\nPipeline complete in {elapsed:.1f}s")
    print(f"Results exported to: {out_path}")
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Output size: {size_mb:.1f} MB")
    print("=" * 60)


if __name__ == "__main__":
    run()
