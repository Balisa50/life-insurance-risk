"""
Life Insurance Risk Model - Full Pipeline Runner
Runs all analysis and exports to JSON for the Next.js dashboard.

By default the policyholder book is generated. Pass --data to run the same
pipeline over a real portfolio extract instead:

    python pipeline/run_pipeline.py --data pipeline/data/book.csv

See src/portfolio.py for the columns that file needs. Only the policyholders
come from the file: the deaths in stage 3 are still simulated from the life
table, so a loaded run gives you real exposure and real pricing, not real
mortality experience.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np
import pandas as pd

# Add pipeline to path
sys.path.insert(0, os.path.dirname(__file__))

from src.mortality import generate_life_table, generate_policyholders
from src.decrements import basis_summary, generate_select_table, persistency_curve
from src.portfolio import PortfolioError, age_band_edges, load_policyholders
from src.survival import simulate_policy_events, fit_kaplan_meier, fit_cox_ph
from src.pricing import price_portfolio, premium_summary_by_group
from src.monte_carlo import simulate_claims, scenario_analysis


def run(data_path: str | None = None, n: int = 10_000) -> None:
    start = time.time()
    print("=" * 60)
    print("  Life Insurance Risk Model Pipeline")
    print("=" * 60)

    # --- 1. Generate life table ---
    print("\n[1/6] Generating life table (Gompertz-Makeham)...")
    life_table = generate_life_table(max_age=100)
    print(f"  Life table: {len(life_table)} ages, e0 = {life_table.loc[0, 'ex']:.1f} years")
    select = basis_summary()
    print(f"  Select period: {select['select_period']} years, duration 0 mortality at {select['select_factors'][0]['factor']:.0%} of ultimate")

    # --- 2. Policyholder book, loaded or generated ---
    if data_path:
        print(f"\n[2/6] Loading policyholders from {data_path}...")
        policyholders = load_policyholders(data_path)
        data_source = os.path.basename(data_path)
        print(f"  Loaded {len(policyholders):,} policies")
    else:
        print(f"\n[2/6] Generating {n:,} synthetic policyholders...")
        policyholders = generate_policyholders(n=n)
        data_source = "synthetic"
    print(f"  Ages: {policyholders['age'].min()}-{policyholders['age'].max()}")
    print(f"  Smokers: {policyholders['smoker'].mean()*100:.1f}%")
    print(f"  Total sum assured: ${policyholders['sum_assured'].sum():,.0f}")

    # --- 3. Survival analysis ---
    print("\n[3/6] Running survival analysis...")
    if data_path:
        print("  NOTE: the policyholders are real but the deaths below are still")
        print("        simulated from the life table. This is not real experience.")
    events_df = simulate_policy_events(policyholders, life_table)
    death_rate = events_df["event"].mean()
    print(f"  Mortality rate over term: {death_rate*100:.2f}%")
    print(f"  Total deaths: {events_df['event'].sum()}")
    reasons = events_df["exit_reason"].value_counts()
    print(f"  Ended by lapse: {int(reasons.get('lapse', 0)):,} ({reasons.get('lapse', 0) / len(events_df) * 100:.1f}%)")
    print(f"  Reached maturity: {int(reasons.get('maturity', 0)):,}")

    # Kaplan-Meier curves
    print("  Fitting Kaplan-Meier curves...")
    km_overall = fit_kaplan_meier(events_df)
    km_gender = fit_kaplan_meier(events_df, group_col="gender")
    km_smoker = fit_kaplan_meier(events_df, group_col="smoker")
    km_health = fit_kaplan_meier(events_df, group_col="health_score")

    # Cox Proportional Hazards
    print("  Fitting Cox PH model...")
    cox_results = fit_cox_ph(events_df)
    if cox_results["concordance"] is not None:
        print(f"  Concordance (held out): {cox_results['concordance']:.4f}")
    elif cox_results["concordance_in_sample"] is not None:
        print(f"  Concordance (in sample): {cox_results['concordance_in_sample']:.4f}")
    if cox_results["warning"]:
        print(f"  WARNING: {cox_results['warning']}")

    # --- 4. Pricing ---
    print("\n[4/6] Pricing portfolio...")
    priced = price_portfolio(policyholders, life_table)
    print(f"  Avg net single premium: ${priced['net_single_premium'].mean():,.2f}")
    print(f"  Avg annual gross premium: ${priced['annual_premium_gross'].mean():,.2f}")
    print(f"  Total annual premium income: ${priced['annual_premium_gross'].sum():,.0f}")
    print(f"  Expected to reach end of term: {priced['in_force_end'].mean()*100:.1f}%")
    print(f"  Lapse credit in the price: {priced['lapse_credit'].mean()*100:.1f}% cheaper than pricing without lapses")

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
    # Same simulation count as the headline run above, so the 1.0x row
    # reproduces the baseline VaR rather than reporting a second, slightly
    # different one that a reader has to reconcile.
    scenarios = scenario_analysis(policyholders, life_table, n_simulations=5_000,
                                  horizon_years=5, baseline=mc_results)
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
    age_edges, age_labels = age_band_edges(policyholders["age"])
    age_bins = pd.cut(policyholders["age"], bins=age_edges, labels=age_labels)
    age_band_counts = age_bins.value_counts().sort_index().to_dict()

    demographics = {
        "data_source": data_source,
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
        "exit_reasons": {str(k): int(v) for k, v in events_df["exit_reason"].value_counts().to_dict().items()},
        "lapse_rate": round(float((events_df["exit_reason"] == "lapse").mean()), 4),
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
        "basis": basis_summary(),
        "select_table": generate_select_table(life_table),
        "persistency": persistency_curve(30),
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
                "avg_annual_gross_no_lapse": round(float(priced["annual_premium_no_lapse"].mean()), 2),
                "avg_lapse_credit": round(float(priced["lapse_credit"].mean()), 4),
                "avg_in_force_end": round(float(priced["in_force_end"].mean()), 4),
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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the life insurance risk pipeline and export dashboard JSON.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Required CSV columns: age, gender, smoker, bmi, health_score,\n"
            "sum_assured, term_years. policy_id is optional.\n"
            "See pipeline/example_book.csv for a working file."
        ),
    )
    parser.add_argument(
        "--data",
        metavar="CSV",
        help="policyholder book to load. Omit to generate a synthetic one.",
    )
    parser.add_argument(
        "-n",
        type=int,
        default=10_000,
        help="how many policyholders to generate. Ignored with --data. Default 10000.",
    )
    args = parser.parse_args()

    try:
        run(data_path=args.data, n=args.n)
    except PortfolioError as exc:
        print(f"\nCould not load the portfolio.\n\n{exc}\n", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
