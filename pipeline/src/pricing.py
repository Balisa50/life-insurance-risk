"""
Actuarial pricing: net single premium (NSP) and annual premium calculation
for term life insurance policies.

Uses the life table mortality rates with individual risk adjustments.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_risk_multiplier(row: pd.Series) -> float:
    """Compute individual hazard multiplier based on risk factors."""
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
    return m


def net_single_premium(
    entry_age: int,
    term: int,
    sum_assured: float,
    risk_multiplier: float,
    life_table: pd.DataFrame,
    interest_rate: float = 0.06,
) -> float:
    """
    Calculate the net single premium (NSP) for a term life policy.

    NSP = sum over t=1..term of:
        v^t * t-1_p_x * q_{x+t-1} * SA

    where v = 1/(1+i) is the discount factor.
    """
    lt = life_table.set_index("age")
    v = 1.0 / (1.0 + interest_rate)

    nsp = 0.0
    survival_prob = 1.0  # t-1_p_x

    for t in range(1, term + 1):
        current_age = min(entry_age + t - 1, 100)
        qx = lt.loc[current_age, "qx"]
        # Adjust mortality by risk multiplier
        adj_qx = min(qx * risk_multiplier, 1.0)

        # Present value of death benefit at time t
        nsp += (v ** t) * survival_prob * adj_qx * sum_assured

        # Update survival probability
        survival_prob *= (1 - adj_qx)

    return nsp


def annual_premium(nsp: float, term: int, interest_rate: float = 0.06) -> float:
    """
    Convert NSP to level annual premium using annuity-due factor.

    P = NSP / annuity_due(term, i)
    annuity_due = (1 - v^term) / d, where d = i/(1+i)
    """
    v = 1.0 / (1.0 + interest_rate)
    d = interest_rate / (1.0 + interest_rate)
    annuity_due = (1 - v ** term) / d
    return nsp / annuity_due if annuity_due > 0 else 0.0


def price_portfolio(
    policyholders: pd.DataFrame,
    life_table: pd.DataFrame,
    interest_rate: float = 0.06,
    expense_loading: float = 0.15,
) -> pd.DataFrame:
    """
    Price all policies in the portfolio.

    Returns DataFrame with columns:
        policy_id, age, gender, smoker, bmi, health_score,
        sum_assured, term_years, risk_multiplier,
        net_single_premium, annual_premium_net, annual_premium_gross
    """
    records = []

    for _, row in policyholders.iterrows():
        rm = compute_risk_multiplier(row)
        nsp = net_single_premium(
            entry_age=int(row["age"]),
            term=int(row["term_years"]),
            sum_assured=float(row["sum_assured"]),
            risk_multiplier=rm,
            life_table=life_table,
            interest_rate=interest_rate,
        )
        ap_net = annual_premium(nsp, int(row["term_years"]), interest_rate)
        ap_gross = ap_net * (1 + expense_loading)

        records.append({
            "policy_id": int(row["policy_id"]),
            "age": int(row["age"]),
            "gender": row["gender"],
            "smoker": int(row["smoker"]),
            "bmi": float(row["bmi"]),
            "health_score": int(row["health_score"]),
            "sum_assured": float(row["sum_assured"]),
            "term_years": int(row["term_years"]),
            "risk_multiplier": round(rm, 4),
            "net_single_premium": round(nsp, 2),
            "annual_premium_net": round(ap_net, 2),
            "annual_premium_gross": round(ap_gross, 2),
        })

    return pd.DataFrame(records)


def premium_summary_by_group(priced: pd.DataFrame) -> dict:
    """Generate premium statistics grouped by various factors."""
    summaries = {}

    # By age band
    priced = priced.copy()
    priced["age_band"] = pd.cut(
        priced["age"],
        bins=[19, 30, 40, 50, 65],
        labels=["20-30", "31-40", "41-50", "51-65"],
    )
    age_stats = (
        priced.groupby("age_band", observed=True)
        .agg(
            avg_nsp=("net_single_premium", "mean"),
            avg_annual=("annual_premium_gross", "mean"),
            count=("policy_id", "count"),
        )
        .reset_index()
    )
    summaries["by_age"] = age_stats.to_dict(orient="records")

    # By gender
    gender_stats = (
        priced.groupby("gender")
        .agg(
            avg_nsp=("net_single_premium", "mean"),
            avg_annual=("annual_premium_gross", "mean"),
            count=("policy_id", "count"),
        )
        .reset_index()
    )
    summaries["by_gender"] = gender_stats.to_dict(orient="records")

    # By smoker status
    priced["smoker_label"] = priced["smoker"].map({0: "Non-smoker", 1: "Smoker"})
    smoker_stats = (
        priced.groupby("smoker_label")
        .agg(
            avg_nsp=("net_single_premium", "mean"),
            avg_annual=("annual_premium_gross", "mean"),
            count=("policy_id", "count"),
        )
        .reset_index()
    )
    summaries["by_smoker"] = smoker_stats.to_dict(orient="records")

    # By health score
    health_stats = (
        priced.groupby("health_score")
        .agg(
            avg_nsp=("net_single_premium", "mean"),
            avg_annual=("annual_premium_gross", "mean"),
            count=("policy_id", "count"),
        )
        .reset_index()
    )
    summaries["by_health"] = health_stats.to_dict(orient="records")

    return summaries
