"""Tests for the actuarial basis.

These check identities and shapes that must hold whatever the assumptions are
set to, rather than pinning today's numbers. A test that asserts the premium is
$306 breaks every time a rate is retuned and tells you nothing; a test that
asserts the life table balances catches a real error in any calibration.
"""

import math

import numpy as np
import pytest

from src.decrements import (
    LAPSE_RATES,
    SELECT_FACTORS,
    SELECT_PERIOD,
    ULTIMATE_LAPSE,
    dependent_rates,
    lapse_rate,
    policy_year_rates,
    select_factor,
)
from src.mortality import generate_life_table
from src.pricing import annual_premium, compute_risk_multiplier, net_single_premium, policy_factors


@pytest.fixture(scope="module")
def life_table():
    return generate_life_table()


# ------------------------------------------------------------ the life table

def test_qx_is_a_probability(life_table):
    assert (life_table["qx"] >= 0).all()
    assert (life_table["qx"] <= 1).all()


def test_survivors_decrease_monotonically(life_table):
    lx = life_table["lx"].to_numpy()
    assert np.all(np.diff(lx) <= 0)


def test_deaths_reconcile_with_survivors(life_table):
    """dx = lx * qx, and lx[x+1] = lx[x] - dx[x]. If the table does not
    balance, every downstream number is wrong.

    lx and dx are stored rounded to one decimal place on a radix of 100,000,
    so the identities hold to within half a unit in the last place rather than
    exactly. atol is set just above that, which still catches a real imbalance
    while tolerating the rounding the table deliberately does.
    """
    lx = life_table["lx"].to_numpy()
    dx = life_table["dx"].to_numpy()
    qx = life_table["qx"].to_numpy()
    assert np.allclose(dx, lx * qx, atol=0.15)
    assert np.allclose(lx[1:], (lx - dx)[:-1], atol=0.15)


def test_infant_mortality_exceeds_early_childhood(life_table):
    """Gompertz-Makeham alone misses the left of the curve entirely. The infant
    and child terms are what make this table usable in the region."""
    qx = life_table["qx"]
    assert qx[0] > qx[5]
    assert qx[5] < qx[60]


def test_adult_mortality_doubles_on_the_gompertz_schedule(life_table):
    """c = 1.098 puts the doubling time at ln(2)/ln(1.098), about 7.4 years.
    Checked across the adult ages where the Gompertz term dominates."""
    doubling = math.log(2) / math.log(1.098)
    hazard = life_table["hazard_rate"].to_numpy()
    for age in (45, 50, 55, 60):
        ratio = hazard[age + round(doubling)] / hazard[age]
        assert 1.7 < ratio < 2.3, f"age {age}: hazard ratio {ratio:.2f}"


# -------------------------------------------------------------- select table

def test_select_factors_ramp_up_to_ultimate():
    assert SELECT_FACTORS[0] == pytest.approx(0.45)
    assert list(SELECT_FACTORS) == sorted(SELECT_FACTORS)
    assert all(f < 1.0 for f in SELECT_FACTORS)


def test_mortality_is_ultimate_once_the_select_period_has_run():
    assert select_factor(SELECT_PERIOD) == pytest.approx(1.0)
    assert select_factor(SELECT_PERIOD + 20) == pytest.approx(1.0)


def test_selection_understates_nothing_at_duration_zero():
    """A freshly underwritten life must never be assumed worse than ultimate."""
    assert select_factor(0) < 1.0


# --------------------------------------------------------------------- lapse

def test_lapse_is_front_loaded_and_settles():
    assert LAPSE_RATES[0] > LAPSE_RATES[-1]
    assert lapse_rate(0) == pytest.approx(LAPSE_RATES[0])
    assert lapse_rate(50) == pytest.approx(ULTIMATE_LAPSE)


# ---------------------------------------------------------- competing risks

@pytest.mark.parametrize("q_d,q_l", [(0.01, 0.14), (0.05, 0.10), (0.2, 0.2), (0.0, 0.14)])
def test_dependent_rates_never_exceed_their_independent_rates(q_d, q_l):
    aq_d, aq_l = dependent_rates(q_d, q_l)
    assert aq_d <= q_d
    assert aq_l <= q_l


@pytest.mark.parametrize("q_d,q_l", [(0.01, 0.14), (0.05, 0.10), (0.2, 0.2)])
def test_the_two_decrements_cannot_take_more_than_everyone(q_d, q_l):
    aq_d, aq_l = dependent_rates(q_d, q_l)
    assert aq_d + aq_l <= 1.0


def test_no_lapse_leaves_mortality_untouched():
    assert dependent_rates(0.03, 0.0) == (pytest.approx(0.03), pytest.approx(0.0))


def test_policy_year_rates_compose_selection_then_underwriting():
    """Selection is a property of the policy's age; the multiplier is a
    property of the person. Both apply, in that order."""
    base = 0.004
    q_death, _ = policy_year_rates(base, duration=0, risk_multiplier=2.0, include_lapse=False)
    assert q_death == pytest.approx(base * SELECT_FACTORS[0] * 2.0)


def test_mortality_is_capped_at_certainty():
    q_death, _ = policy_year_rates(0.9, duration=10, risk_multiplier=50.0, include_lapse=False)
    assert q_death == pytest.approx(1.0)


# ------------------------------------------------------------------- pricing

def _row(**kw):
    import pandas as pd
    base = {"smoker": 0, "gender": "F", "bmi": 22.0, "health_score": 3}
    base.update(kw)
    return pd.Series(base)


def test_risk_multiplier_is_neutral_for_the_reference_life():
    assert compute_risk_multiplier(_row()) == pytest.approx(1.0)


def test_smoking_and_male_sex_load_the_multiplier():
    assert compute_risk_multiplier(_row(smoker=1)) > compute_risk_multiplier(_row())
    assert compute_risk_multiplier(_row(gender="M")) > compute_risk_multiplier(_row())


def test_bmi_loads_at_both_tails():
    assert compute_risk_multiplier(_row(bmi=35.0)) > compute_risk_multiplier(_row())
    assert compute_risk_multiplier(_row(bmi=17.0)) > compute_risk_multiplier(_row())


def test_premium_rises_with_entry_age(life_table):
    younger = net_single_premium(25, 20, 100_000, 1.0, life_table)
    older = net_single_premium(55, 20, 100_000, 1.0, life_table)
    assert older > younger


def test_premium_rises_with_the_risk_multiplier(life_table):
    standard = net_single_premium(40, 20, 100_000, 1.0, life_table)
    rated = net_single_premium(40, 20, 100_000, 1.7, life_table)
    assert rated > standard


def test_premium_scales_linearly_with_the_sum_assured(life_table):
    one = net_single_premium(40, 20, 100_000, 1.0, life_table)
    two = net_single_premium(40, 20, 200_000, 1.0, life_table)
    assert two == pytest.approx(2 * one)


def test_pricing_with_lapses_is_cheaper(life_table):
    """A term policyholder who lapses forfeits everything and was never going
    to claim, so taking credit for lapses lowers the price. This is the bet the
    README says is worth keeping visible."""
    with_lapse = net_single_premium(40, 20, 100_000, 1.0, life_table, include_lapse=True)
    without = net_single_premium(40, 20, 100_000, 1.0, life_table, include_lapse=False)
    assert with_lapse < without


def test_the_annuity_factor_is_in_force_weighted_not_certain(life_table):
    """The annuity-certain (1 - v^n)/d assumes premiums keep arriving whether
    or not the policyholder is alive or still on the books. It is therefore
    always larger than the in-force weighted factor. This test is the guard on
    the bug the README documents."""
    term, rate = 20, 0.06
    f = policy_factors(40, term, 1.0, life_table, interest_rate=rate)
    v = 1.0 / (1.0 + rate)
    d = rate / (1.0 + rate)
    annuity_certain = (1.0 - v**term) / d
    assert f["annuity_due"] < annuity_certain


def test_annual_premium_is_the_single_premium_spread_over_the_annuity():
    assert annual_premium(1000.0, 12.5) == pytest.approx(80.0)


def test_annual_premium_degrades_safely_on_a_zero_annuity():
    assert annual_premium(1000.0, 0.0) == 0.0
