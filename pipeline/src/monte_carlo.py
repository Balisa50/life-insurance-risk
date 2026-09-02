"""
Monte Carlo simulation for portfolio-level life insurance risk.
Simulates claim distributions, reserve estimation, and Value-at-Risk.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .decrements import policy_year_rates

RNG = np.random.default_rng(42)


def simulate_claims(
    policyholders: pd.DataFrame,
    life_table: pd.DataFrame,
    n_simulations: int = 5_000,
    horizon_years: int = 5,
) -> dict:
    """
    Run Monte Carlo simulation of aggregate claims over a given horizon.

    For each simulation:
      - For each policyholder, simulate death/survival over horizon_years
      - Sum all death benefit payouts
      - Track total claims, number of deaths

    Returns dict with:
      - claim_distribution: list of total claims per simulation
      - death_counts: list of death counts per simulation
      - summary statistics (mean, std, percentiles, VaR, TVaR)
    """
    lt_hazard = life_table.set_index("age")["hazard_rate"]

    # Pre-compute risk multipliers
    multipliers = []
    for _, row in policyholders.iterrows():
        m = 1.0
        if row["smoker"] == 1:
            m *= 1.7
        if row["gender"] == "M":
            m *= 1.12
        bmi = row["bmi"]
        if bmi > 30:
            m *= 1.0 + 0.02 * (bmi - 30)
        elif bmi < 18.5:
            m *= 1.15
        m *= 1.0 + 0.15 * (row["health_score"] - 3)
        multipliers.append(m)

    multipliers = np.array(multipliers)
    ages = policyholders["age"].values
    sums = policyholders["sum_assured"].values
    terms = policyholders["term_years"].values
    n_policies = len(policyholders)

    # Pre-compute both decrements for each policyholder for each year of the
    # horizon. Shape: (n_policies, horizon_years).
    #
    # The projection runs from policy inception, so the year index is also the
    # policy duration, which is what the select factor and the lapse rate are
    # both keyed on.
    adj_qx = np.zeros((n_policies, horizon_years))
    lapse_qx = np.zeros((n_policies, horizon_years))
    for t in range(horizon_years):
        for i in range(n_policies):
            if t >= terms[i]:
                continue  # policy has already matured, no decrement applies
            current_age = min(int(ages[i]) + t, 100)
            base_q = 1 - np.exp(-lt_hazard.get(current_age, lt_hazard.iloc[-1]))
            q_death, q_lapse = policy_year_rates(base_q, t, multipliers[i])
            adj_qx[i, t] = q_death
            lapse_qx[i, t] = q_lapse

    claim_totals = np.zeros(n_simulations)
    death_counts = np.zeros(n_simulations, dtype=int)
    lapse_counts = np.zeros(n_simulations, dtype=int)

    for sim in range(n_simulations):
        total_claims = 0.0
        deaths = 0
        lapses = 0
        # In force means alive and still paying. A lapsed policy is off risk
        # just as completely as a dead one, and considerably cheaper.
        in_force = np.ones(n_policies, dtype=bool)

        for t in range(horizon_years):
            rands = RNG.random(n_policies)
            active = in_force & (t < terms)
            dying = active & (rands < adj_qx[:, t])
            lapsing = active & ~dying & (rands < adj_qx[:, t] + lapse_qx[:, t])

            total_claims += sums[dying].sum()
            deaths += dying.sum()
            lapses += lapsing.sum()
            in_force[dying] = False
            in_force[lapsing] = False

        claim_totals[sim] = total_claims
        death_counts[sim] = deaths
        lapse_counts[sim] = lapses

    # Summary statistics
    mean_claims = float(np.mean(claim_totals))
    std_claims = float(np.std(claim_totals))
    percentiles = {
        "p5": float(np.percentile(claim_totals, 5)),
        "p25": float(np.percentile(claim_totals, 25)),
        "p50": float(np.percentile(claim_totals, 50)),
        "p75": float(np.percentile(claim_totals, 75)),
        "p95": float(np.percentile(claim_totals, 95)),
        "p99": float(np.percentile(claim_totals, 99)),
        "p995": float(np.percentile(claim_totals, 99.5)),
    }

    # Value at Risk (99.5th percentile)
    var_995 = percentiles["p995"]

    # Tail Value at Risk (expected shortfall beyond VaR)
    tail = claim_totals[claim_totals >= var_995]
    tvar_995 = float(np.mean(tail)) if len(tail) > 0 else var_995

    # Required reserve (mean + risk margin at 99.5%)
    risk_margin = var_995 - mean_claims

    # Distribution histogram for frontend
    hist_counts, hist_edges = np.histogram(claim_totals, bins=50)
    histogram = []
    for i in range(len(hist_counts)):
        histogram.append({
            "bin_start": round(float(hist_edges[i]), 0),
            "bin_end": round(float(hist_edges[i + 1]), 0),
            "count": int(hist_counts[i]),
        })

    # Death count distribution
    death_hist_counts, death_hist_edges = np.histogram(death_counts, bins=30)
    death_histogram = []
    for i in range(len(death_hist_counts)):
        death_histogram.append({
            "bin_start": int(death_hist_edges[i]),
            "bin_end": int(death_hist_edges[i + 1]),
            "count": int(death_hist_counts[i]),
        })

    return {
        "n_simulations": n_simulations,
        "horizon_years": horizon_years,
        "n_policies": n_policies,
        "total_sum_assured": float(sums.sum()),
        "mean_claims": round(mean_claims, 2),
        "std_claims": round(std_claims, 2),
        "mean_deaths": round(float(np.mean(death_counts)), 1),
        "mean_lapses": round(float(np.mean(lapse_counts)), 1),
        "percentiles": {k: round(v, 2) for k, v in percentiles.items()},
        "var_995": round(var_995, 2),
        "tvar_995": round(tvar_995, 2),
        "risk_margin": round(risk_margin, 2),
        "required_reserve": round(mean_claims + risk_margin, 2),
        "loss_ratio_mean": round(mean_claims / sums.sum(), 6),
        "histogram": histogram,
        "death_histogram": death_histogram,
    }


def scenario_analysis(
    policyholders: pd.DataFrame,
    life_table: pd.DataFrame,
    n_simulations: int = 2_000,
    horizon_years: int = 5,
    baseline: dict | None = None,
) -> list[dict]:
    """
    Run Monte Carlo under different stress scenarios.
    Applies mortality shock multipliers to the base mortality.

    `baseline` is the already-computed unshocked run. When supplied it is
    reused for the 1.0x row instead of re-simulating. Two independent samples
    of the same distribution differ by sampling noise, and publishing two
    slightly different baseline VaRs invites a reader to ask which one is
    the answer. There is only one baseline, so it is computed once.
    """
    scenarios = [
        {"name": "Baseline", "mortality_shock": 1.0},
        {"name": "Mild pandemic", "mortality_shock": 1.25},
        {"name": "Severe pandemic", "mortality_shock": 1.6},
        {"name": "Catastrophic event", "mortality_shock": 2.5},
    ]

    results = []
    for scenario in scenarios:
        if scenario["mortality_shock"] == 1.0 and baseline is not None:
            mc = baseline
            sims_used = baseline.get("n_simulations", n_simulations)
        else:
            # Apply mortality shock to life table
            shocked_lt = life_table.copy()
            shocked_lt["hazard_rate"] = shocked_lt["hazard_rate"] * scenario["mortality_shock"]
            shocked_lt["qx"] = 1 - np.exp(-shocked_lt["hazard_rate"])
            shocked_lt["qx"] = shocked_lt["qx"].clip(0, 1)

            mc = simulate_claims(
                policyholders,
                shocked_lt,
                n_simulations=n_simulations,
                horizon_years=horizon_years,
            )
            sims_used = n_simulations

        results.append({
            "scenario": scenario["name"],
            "mortality_shock": scenario["mortality_shock"],
            "mean_claims": mc["mean_claims"],
            "var_995": mc["var_995"],
            "tvar_995": mc["tvar_995"],
            "mean_deaths": mc["mean_deaths"],
            "required_reserve": mc["required_reserve"],
            # Carried so the baseline row can be compared with the headline
            # run rather than quietly differing from it at a different
            # simulation count.
            "n_simulations": sims_used,
        })

    return results
