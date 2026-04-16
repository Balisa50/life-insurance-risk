"""
Mortality tables and hazard rate computation.
Uses a simplified life table calibrated to Sub-Saharan African mortality
(WHO estimates). Not official actuarial tables, but realistic shapes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)


def generate_life_table(max_age: int = 100) -> pd.DataFrame:
    """
    Generate a period life table with qx (probability of death at age x).
    Calibrated loosely to Sub-Saharan African mortality patterns:
      - Higher infant/child mortality
      - Relatively high young-adult mortality (accidents, maternal)
      - Gompertz-Makeham for middle/old age
    """
    ages = np.arange(0, max_age + 1)

    # Gompertz-Makeham: mu(x) = A + B * c^x
    A = 0.0005   # accident/external causes baseline
    B = 0.00003  # aging component
    c = 1.098    # rate of mortality acceleration

    # Base hazard
    mu = A + B * (c ** ages)

    # Infant/child mortality bump
    infant_bump = 0.045 * np.exp(-0.5 * ages)  # peaks at birth
    child_bump = 0.005 * np.exp(-0.2 * (ages - 1) ** 2)

    mu = mu + infant_bump + child_bump

    # Convert hazard to qx (probability of dying in year x)
    qx = 1 - np.exp(-mu)
    qx = np.clip(qx, 0, 1)
    qx[-1] = 1.0  # everyone dies by max_age

    # Build life table
    lx = np.zeros(len(ages))
    lx[0] = 100_000  # radix

    for i in range(1, len(ages)):
        lx[i] = lx[i - 1] * (1 - qx[i - 1])

    dx = np.zeros(len(ages))
    dx[:-1] = lx[:-1] - lx[1:]
    dx[-1] = lx[-1]

    # Life expectancy (curtate)
    ex = np.zeros(len(ages))
    for i in range(len(ages)):
        ex[i] = sum(lx[i + 1:]) / lx[i] if lx[i] > 0 else 0

    table = pd.DataFrame({
        "age": ages,
        "qx": np.round(qx, 6),
        "lx": np.round(lx, 1),
        "dx": np.round(dx, 1),
        "ex": np.round(ex, 2),
        "hazard_rate": np.round(mu, 6),
    })

    return table


def generate_policyholders(n: int = 10_000) -> pd.DataFrame:
    """
    Generate synthetic policyholder data for Monte Carlo simulation.
    """
    age = RNG.integers(20, 65, size=n)
    gender = RNG.choice(["M", "F"], size=n, p=[0.55, 0.45])
    smoker = RNG.choice([0, 1], size=n, p=[0.75, 0.25])
    bmi = np.clip(RNG.normal(26, 5, size=n), 16, 50).round(1)

    # Health score (1=excellent, 5=poor)
    health_score = RNG.choice([1, 2, 3, 4, 5], size=n, p=[0.15, 0.30, 0.30, 0.15, 0.10])

    # Sum assured (policy face value in USD)
    sum_assured = (
        RNG.choice([10_000, 25_000, 50_000, 100_000, 250_000], size=n,
                    p=[0.25, 0.30, 0.25, 0.15, 0.05])
    )

    # Policy term (years)
    term = RNG.choice([5, 10, 15, 20, 25, 30], size=n, p=[0.05, 0.20, 0.25, 0.30, 0.15, 0.05])

    df = pd.DataFrame({
        "policy_id": np.arange(1, n + 1),
        "age": age,
        "gender": gender,
        "smoker": smoker,
        "bmi": bmi,
        "health_score": health_score,
        "sum_assured": sum_assured,
        "term_years": term,
    })

    return df
