"""
Survival analysis: Kaplan-Meier curves and Cox Proportional Hazards model.
Uses the lifelines library for estimation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from lifelines import KaplanMeierFitter, CoxPHFitter

RNG = np.random.default_rng(42)


def simulate_policy_events(
    policyholders: pd.DataFrame,
    life_table: pd.DataFrame,
) -> pd.DataFrame:
    """
    Simulate death/survival events for each policyholder over their term.

    Uses the life table hazard rates with individual risk adjustments
    based on smoker status, BMI, health score, and gender.

    Returns DataFrame with columns:
        policy_id, age, gender, smoker, bmi, health_score,
        sum_assured, term_years, duration, event
    """
    lt_hazard = life_table.set_index("age")["hazard_rate"]

    durations = []
    events = []  # 1 = death during term, 0 = survived (censored)

    for _, row in policyholders.iterrows():
        entry_age = int(row["age"])
        term = int(row["term_years"])

        # Individual hazard multiplier
        multiplier = 1.0
        if row["smoker"] == 1:
            multiplier *= 1.7
        if row["gender"] == "M":
            multiplier *= 1.12
        # BMI risk
        bmi = row["bmi"]
        if bmi > 30:
            multiplier *= 1.0 + 0.02 * (bmi - 30)
        elif bmi < 18.5:
            multiplier *= 1.15
        # Health score
        multiplier *= 1.0 + 0.15 * (row["health_score"] - 3)

        # Simulate year by year
        died = False
        for t in range(1, term + 1):
            current_age = entry_age + t - 1
            if current_age > 100:
                current_age = 100
            base_hazard = lt_hazard.get(current_age, lt_hazard.iloc[-1])
            adj_hazard = base_hazard * multiplier
            prob_death = 1 - np.exp(-adj_hazard)

            if RNG.random() < prob_death:
                durations.append(t)
                events.append(1)
                died = True
                break

        if not died:
            durations.append(term)
            events.append(0)

    result = policyholders.copy()
    result["duration"] = durations
    result["event"] = events

    return result


def fit_kaplan_meier(
    events_df: pd.DataFrame,
    group_col: str | None = None,
) -> dict:
    """
    Fit Kaplan-Meier survival curves.

    If group_col is provided, fits separate curves per group.
    Returns dict with timeline and survival probabilities.
    """
    results = {}

    if group_col is None:
        kmf = KaplanMeierFitter()
        kmf.fit(events_df["duration"], event_observed=events_df["event"])
        results["overall"] = {
            "timeline": kmf.timeline.tolist(),
            "survival": kmf.survival_function_.values.flatten().tolist(),
            "median_survival": float(kmf.median_survival_time_)
            if not np.isinf(kmf.median_survival_time_)
            else None,
        }
    else:
        for group_val in sorted(events_df[group_col].unique()):
            mask = events_df[group_col] == group_val
            subset = events_df[mask]
            kmf = KaplanMeierFitter()
            kmf.fit(subset["duration"], event_observed=subset["event"])
            results[str(group_val)] = {
                "timeline": kmf.timeline.tolist(),
                "survival": kmf.survival_function_.values.flatten().tolist(),
                "median_survival": float(kmf.median_survival_time_)
                if not np.isinf(kmf.median_survival_time_)
                else None,
            }

    return results


def fit_cox_ph(events_df: pd.DataFrame) -> dict:
    """
    Fit a Cox Proportional Hazards model.

    Features: age, gender (binary), smoker, bmi, health_score.
    Returns coefficients, hazard ratios, confidence intervals, concordance.
    """
    df = events_df[["duration", "event", "age", "gender", "smoker", "bmi", "health_score"]].copy()
    df["gender_male"] = (df["gender"] == "M").astype(int)
    df = df.drop(columns=["gender"])

    cph = CoxPHFitter()
    cph.fit(df, duration_col="duration", event_col="event")

    summary = cph.summary

    coefficients = []
    for covar in summary.index:
        coefficients.append({
            "covariate": covar,
            "coef": round(float(summary.loc[covar, "coef"]), 4),
            "hazard_ratio": round(float(summary.loc[covar, "exp(coef)"]), 4),
            "se": round(float(summary.loc[covar, "se(coef)"]), 4),
            "p_value": round(float(summary.loc[covar, "p"]), 6),
            "ci_lower": round(float(summary.loc[covar, "exp(coef) lower 95%"]), 4),
            "ci_upper": round(float(summary.loc[covar, "exp(coef) upper 95%"]), 4),
        })

    return {
        "coefficients": coefficients,
        "concordance": round(float(cph.concordance_index_), 4),
        "log_likelihood": round(float(cph.log_likelihood_ratio_test().test_statistic), 2),
        "log_likelihood_p": float(cph.log_likelihood_ratio_test().p_value),
    }
