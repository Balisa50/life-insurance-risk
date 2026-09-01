"""
Actuarial pricing: net single premium (NSP) and annual premium calculation
for term life insurance policies.

Uses the life table mortality rates with individual risk adjustments.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .decrements import policy_year_rates
from .portfolio import age_band_edges


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


def policy_factors(
    entry_age: int,
    term: int,
    risk_multiplier: float,
    life_table: pd.DataFrame,
    interest_rate: float = 0.06,
    include_lapse: bool = True,
) -> dict:
    """
    Walk one policy year by year and return the two present values that price it.

    Both sides of the equivalence principle have to be weighted by the same
    in-force curve, because a policyholder who has lapsed neither claims nor
    pays. Running the two decrements together in one loop is the only way to
    keep them consistent.

    Returns:
        epv_benefit   present value of the death benefit, per 1 of sum assured
        annuity_due   present value of 1 paid at the start of each year the
                      policy is still in force
        in_force_end  share of policies expected to reach the end of the term
        expected_lapses / expected_deaths, as shares of the original policy
    """
    lt = life_table.set_index("age")
    max_age = int(life_table["age"].max())
    v = 1.0 / (1.0 + interest_rate)

    epv_benefit = 0.0
    annuity_due = 0.0
    in_force = 1.0
    total_deaths = 0.0
    total_lapses = 0.0

    for t in range(1, term + 1):
        duration = t - 1
        attained = min(entry_age + duration, max_age)
        base_q = float(lt.loc[attained, "qx"])
        aq_death, aq_lapse = policy_year_rates(
            base_q, duration, risk_multiplier, include_lapse
        )

        # Premium falls due at the start of the year, so it is discounted for
        # duration years and paid only if the policy is in force at that point.
        annuity_due += (v ** duration) * in_force

        # Death benefit is paid at the end of the year it occurs in.
        epv_benefit += (v ** t) * in_force * aq_death

        total_deaths += in_force * aq_death
        total_lapses += in_force * aq_lapse
        in_force = max(0.0, in_force * (1.0 - aq_death - aq_lapse))

    return {
        "epv_benefit": epv_benefit,
        "annuity_due": annuity_due,
        "in_force_end": in_force,
        "expected_deaths": total_deaths,
        "expected_lapses": total_lapses,
    }


def net_single_premium(
    entry_age: int,
    term: int,
    sum_assured: float,
    risk_multiplier: float,
    life_table: pd.DataFrame,
    interest_rate: float = 0.06,
    include_lapse: bool = True,
) -> float:
    """
    Net single premium for a term assurance: the discounted expected claim.

        NSP = sum over t of  v^t * (t-1)p_x * (aq)_death * SA

    where (t-1)p_x is now survival in force, meaning alive AND still paying,
    and (aq)_death is the dependent mortality rate after competition with
    lapses. Set include_lapse False to price on mortality alone.
    """
    f = policy_factors(
        entry_age, term, risk_multiplier, life_table, interest_rate, include_lapse
    )
    return f["epv_benefit"] * sum_assured


def annual_premium(nsp: float, annuity_due: float) -> float:
    """
    Spread a single premium over the term.

        P = NSP / annuity_due

    The annuity factor is the one from policy_factors, weighted by the in-force
    curve. This used to be an annuity-certain, (1 - v^n)/d, which assumes the
    policyholder keeps paying for the full term whether or not they are alive
    or still on the books. That factor is too large, so it produced a level
    premium that was too small. Weighting it properly raises the premium, and
    the gap widens with age and term.
    """
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
        f = policy_factors(
            entry_age=int(row["age"]),
            term=int(row["term_years"]),
            risk_multiplier=rm,
            life_table=life_table,
            interest_rate=interest_rate,
        )
        nsp = f["epv_benefit"] * float(row["sum_assured"])
        ap_net = annual_premium(nsp, f["annuity_due"])
        ap_gross = ap_net * (1 + expense_loading)

        # The same policy priced with no lapse assumption at all. Taking credit
        # for lapses makes a term policy cheaper, because the people who leave
        # forfeit everything and were never going to claim. That is a real
        # effect and also a real exposure: if persistency comes in better than
        # assumed, the book is underpriced. Pricing it both ways keeps the size
        # of that bet visible instead of buried in the basis.
        f_nl = policy_factors(
            entry_age=int(row["age"]),
            term=int(row["term_years"]),
            risk_multiplier=rm,
            life_table=life_table,
            interest_rate=interest_rate,
            include_lapse=False,
        )
        ap_gross_nl = annual_premium(
            f_nl["epv_benefit"] * float(row["sum_assured"]), f_nl["annuity_due"]
        ) * (1 + expense_loading)

        records.append({
            # Left as-is rather than coerced to int: real policy numbers are
            # alphanumeric (GNI-0001), and nothing downstream does arithmetic on it.
            "policy_id": row["policy_id"],
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
            "annual_premium_no_lapse": round(ap_gross_nl, 2),
            "lapse_credit": round(1 - ap_gross / ap_gross_nl, 4) if ap_gross_nl > 0 else 0.0,
            "annuity_due": round(f["annuity_due"], 4),
            "in_force_end": round(f["in_force_end"], 4),
            "expected_lapses": round(f["expected_lapses"], 4),
        })

    return pd.DataFrame(records)


def premium_summary_by_group(priced: pd.DataFrame) -> dict:
    """Generate premium statistics grouped by various factors."""
    summaries = {}

    # By age band
    priced = priced.copy()
    # Edges are derived from the data rather than hard-coded, so a loaded book
    # with ages outside 20-64 is not silently dropped from the summary.
    _edges, _labels = age_band_edges(priced["age"])
    priced["age_band"] = pd.cut(priced["age"], bins=_edges, labels=_labels)
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
