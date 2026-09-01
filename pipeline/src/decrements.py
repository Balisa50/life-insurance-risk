"""
Select and ultimate mortality, and lapse assumptions.

Two things the model previously ignored, both of which move the answer more
than most of the refinements that were already in it.

SELECTION. Someone who has just passed medical underwriting is healthier than
the general population of the same age, because the sick were declined or rated.
That advantage wears off over a few years. Actuaries write the resulting rate as
q[x]+t: the mortality of a life selected at age x, now t years into the policy.
Once t reaches the select period the rate is said to be ultimate and depends
only on attained age. Ignoring selection overstates mortality in the early
durations, which is exactly where a term policy has most of its exposure.

LAPSES. Policyholders stop paying. In a book with irregular incomes a large
share of policies never reach the end of their term. Lapses cut both sides of
the pricing equation: fewer people are around to die, and fewer are around to
pay premiums. Ignoring them is not conservative, it is just wrong in an
unpredictable direction.

Every number in this file is an assumption, not an estimate. None of it is
fitted to experience data because there is no experience data. A real pricing
basis would come from the insurer's own investigation, and replacing these
tables is the first thing anyone with real data should do.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------- selection

# Years over which the effect of underwriting wears off. Real tables vary a
# lot: UK AM92 uses 2 years, the US 2015 VBT uses 25. Five is a middle choice
# for a medically underwritten term book.
SELECT_PERIOD = 5

# Mortality at duration t as a fraction of the ultimate rate for the same
# attained age. A straight ramp from 45% back to 100% over the select period:
# simple to state, simple to defend, and easy to replace with a fitted set.
SELECT_FACTORS = (0.45, 0.56, 0.67, 0.78, 0.89)

# ------------------------------------------------------------------- lapses

# Probability a policy in force at the start of the year is cancelled during
# it. Front-loaded, which is the universal shape: the first year is always the
# worst, and the survivors of the early durations are much stickier.
LAPSE_RATES = (0.14, 0.10, 0.08, 0.06, 0.05)
ULTIMATE_LAPSE = 0.04


def select_factor(duration: int) -> float:
    """
    Mortality multiplier at `duration` years since underwriting.

    duration 0 is the first policy year. Returns 1.0 once the select period
    has run out, which is what makes the rate ultimate.
    """
    if duration < 0:
        raise ValueError(f"duration must be non-negative, got {duration}")
    if duration < SELECT_PERIOD:
        return SELECT_FACTORS[duration]
    return 1.0


def lapse_rate(duration: int) -> float:
    """Independent probability of lapsing during policy year `duration` + 1."""
    if duration < 0:
        raise ValueError(f"duration must be non-negative, got {duration}")
    if duration < len(LAPSE_RATES):
        return LAPSE_RATES[duration]
    return ULTIMATE_LAPSE


def dependent_rates(q_death: float, q_lapse: float) -> tuple[float, float]:
    """
    Convert two independent decrement rates into dependent ones.

    Both events cannot happen to the same policy in the same year, so the raw
    rates cannot simply be added: each one is competing for lives the other
    might take first. Under the usual assumption that both decrements are
    spread uniformly across the year,

        (aq)_death = q_death · (1 - q_lapse/2)
        (aq)_lapse = q_lapse · (1 - q_death/2)

    Each rate is reduced by roughly half the other's exposure. With a 14% lapse
    rate this pulls the effective mortality down by about 7%, which is not
    nothing when it is applied to every policy in the first year.
    """
    aq_death = q_death * (1.0 - q_lapse / 2.0)
    aq_lapse = q_lapse * (1.0 - q_death / 2.0)
    return aq_death, aq_lapse


def policy_year_rates(
    base_qx: float,
    duration: int,
    risk_multiplier: float = 1.0,
    include_lapse: bool = True,
) -> tuple[float, float]:
    """
    The two rates that apply to one policy in one year, all adjustments made.

    Composition order matters and is worth stating: the base table rate for the
    attained age is scaled by the select factor for the duration, then by the
    individual's underwriting multiplier. Selection is a property of how long
    ago the policy was written; the multiplier is a property of the person.

    Returns (probability of dying, probability of lapsing) as dependent rates.
    """
    q_death = min(base_qx * select_factor(duration) * risk_multiplier, 1.0)
    if not include_lapse:
        return q_death, 0.0
    return dependent_rates(q_death, lapse_rate(duration))


def basis_summary() -> dict:
    """The assumptions, in a form that can be shipped to the dashboard."""
    return {
        "select_period": SELECT_PERIOD,
        "select_factors": [
            {"duration": t, "factor": select_factor(t)}
            for t in range(SELECT_PERIOD + 1)
        ],
        "lapse_rates": [
            {"duration": t, "rate": round(lapse_rate(t), 4)}
            for t in range(len(LAPSE_RATES) + 1)
        ],
        "ultimate_lapse": ULTIMATE_LAPSE,
        "note": (
            "Assumptions, not estimates. Nothing here is fitted to experience "
            "data. A real basis would come from the insurer's own investigation."
        ),
    }


def generate_select_table(
    life_table: pd.DataFrame,
    entry_ages: tuple[int, ...] = (20, 30, 40, 50, 60),
) -> list[dict]:
    """
    Build the classic select and ultimate display.

    One row per entry age. The select columns hold q[x]+t for each duration in
    the select period, and the final column holds the ultimate rate the row
    converges to, which is q at attained age x + SELECT_PERIOD.

    Reading a row left to right shows selection wearing off. Reading the
    ultimate column down shows plain age-related mortality underneath it.
    """
    qx = life_table.set_index("age")["qx"]
    max_age = int(life_table["age"].max())

    rows = []
    for x in entry_ages:
        row = {"entry_age": x}
        for t in range(SELECT_PERIOD):
            attained = min(x + t, max_age)
            row[f"d{t}"] = round(float(qx.loc[attained] * select_factor(t)), 6)
        ultimate_age = min(x + SELECT_PERIOD, max_age)
        row["ultimate_age"] = ultimate_age
        row["ultimate"] = round(float(qx.loc[ultimate_age]), 6)
        rows.append(row)
    return rows


def persistency_curve(max_duration: int = 30) -> list[dict]:
    """
    Share of policies still in force at each duration, lapses only.

    Mortality is left out deliberately: this isolates the lapse assumption so
    it can be read on its own. Combined in-force survival is lower again.
    """
    out = []
    in_force = 1.0
    for t in range(max_duration + 1):
        out.append({"duration": t, "in_force": round(in_force, 5)})
        in_force *= 1.0 - lapse_rate(t)
    return out
