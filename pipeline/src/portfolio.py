"""
Load a real policyholder book from CSV instead of generating a synthetic one.

Nothing downstream cares where the dataframe came from, so this module is the
only thing that needs to exist for the pipeline to run on a real portfolio
extract. Validation is deliberately strict and reports every problem at once
rather than dying on the first: a silently coerced column would flow all the
way through to a premium without anyone noticing.

What this does NOT do: read real death and censoring records. Stage 3 still
simulates who dies from the life table. Loading a real book gives you real
exposure, real sums assured and real pricing. It does not give you real
mortality experience.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

# Columns the modelling code actually reads. policy_id is filled in if absent,
# because real extracts carry an id under a hundred different names.
REQUIRED_COLUMNS = [
    "age",
    "gender",
    "smoker",
    "bmi",
    "health_score",
    "sum_assured",
    "term_years",
]

_GENDER = {"m": "M", "male": "M", "man": "M", "f": "F", "female": "F", "woman": "F"}
_SMOKER_YES = {"1", "y", "yes", "true", "t", "smoker"}
_SMOKER_NO = {"0", "n", "no", "false", "f", "non-smoker", "nonsmoker", "never"}

# The life table runs 0 to 100, so an age outside that cannot be priced.
AGE_RANGE = (0, 100)
BMI_RANGE = (10.0, 80.0)
HEALTH_RANGE = (1, 5)


class PortfolioError(ValueError):
    """Raised with every problem found in the file, not just the first one."""


def _scalar(v):
    """numpy scalars repr as np.int64(9), which is noise in a user-facing error."""
    return v.item() if hasattr(v, "item") else v


def _examples(mask: pd.Series, values: pd.Series, limit: int = 3) -> str:
    """Point at real rows. CSV row numbers, so 1-indexed past the header."""
    rows = np.flatnonzero(mask.to_numpy())[:limit]
    if len(rows) == 0:
        return ""
    shown = ", ".join(f"row {int(r) + 2}: {_scalar(values.iloc[int(r)])!r}" for r in rows)
    return f" ({shown})"


def _numeric(df, col, problems, lo=None, hi=None, integer=False):
    """Coerce one column to numbers, recording anything that will not convert."""
    raw = df[col]
    out = pd.to_numeric(raw, errors="coerce")

    bad = out.isna() & raw.notna()
    if bad.any():
        problems.append(f"{col}: {int(bad.sum())} value(s) are not numeric{_examples(bad, raw)}")

    blank = raw.isna()
    if blank.any():
        problems.append(f"{col}: {int(blank.sum())} value(s) are blank")

    ok = out.notna()
    if lo is not None:
        low = ok & (out < lo)
        if low.any():
            problems.append(f"{col}: {int(low.sum())} value(s) below {lo}{_examples(low, raw)}")
    if hi is not None:
        high = ok & (out > hi)
        if high.any():
            problems.append(f"{col}: {int(high.sum())} value(s) above {hi}{_examples(high, raw)}")

    if integer:
        frac = ok & (out != out.round())
        if frac.any():
            problems.append(f"{col}: {int(frac.sum())} value(s) are not whole numbers{_examples(frac, raw)}")
        out = out.round()

    return out


def load_policyholders(path: str) -> pd.DataFrame:
    """
    Read a policyholder book from CSV and return it in the shape the pipeline
    expects. Raises PortfolioError listing everything wrong with the file.

    Required columns (case and surrounding space are ignored):
        age           whole number, 0 to 100
        gender        M or F. Male/Female/m/f all accepted
        smoker        1 or 0. Y/N, Yes/No, true/false all accepted
        bmi           number, 10 to 80
        health_score  whole number 1 to 5, where 3 is the neutral middle
        sum_assured   number greater than 0, the death benefit
        term_years    whole number of years, at least 1

    Optional:
        policy_id     any unique value. Numbered 1..n if the column is absent.
    """
    if not os.path.exists(path):
        raise PortfolioError(f"No such file: {path}")

    try:
        df = pd.read_csv(path)
    except Exception as exc:
        raise PortfolioError(f"Could not read {path} as CSV: {exc}") from exc

    df.columns = [str(c).strip().lower() for c in df.columns]

    if len(df) == 0:
        raise PortfolioError(f"{path} has a header but no rows")

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise PortfolioError(
            f"{path} is missing required column(s): {', '.join(missing)}\n"
            f"Found: {', '.join(df.columns)}\n"
            f"Required: {', '.join(REQUIRED_COLUMNS)}"
        )

    problems: list[str] = []
    out = pd.DataFrame(index=df.index)

    out["age"] = _numeric(df, "age", problems, lo=AGE_RANGE[0], hi=AGE_RANGE[1], integer=True)
    out["bmi"] = _numeric(df, "bmi", problems, lo=BMI_RANGE[0], hi=BMI_RANGE[1])
    out["health_score"] = _numeric(
        df, "health_score", problems, lo=HEALTH_RANGE[0], hi=HEALTH_RANGE[1], integer=True
    )
    out["sum_assured"] = _numeric(df, "sum_assured", problems, lo=0.01)
    out["term_years"] = _numeric(df, "term_years", problems, lo=1, integer=True)

    # gender
    g_raw = df["gender"]
    g = g_raw.astype(str).str.strip().str.lower().map(_GENDER)
    g_bad = g.isna()
    if g_bad.any():
        problems.append(
            f"gender: {int(g_bad.sum())} value(s) are not recognisable as M or F"
            f"{_examples(g_bad, g_raw)}"
        )
    out["gender"] = g

    # smoker
    s_raw = df["smoker"]
    s_norm = s_raw.astype(str).str.strip().str.lower()
    s = pd.Series(np.nan, index=df.index, dtype="float64")
    s[s_norm.isin(_SMOKER_YES)] = 1.0
    s[s_norm.isin(_SMOKER_NO)] = 0.0
    s_bad = s.isna()
    if s_bad.any():
        problems.append(
            f"smoker: {int(s_bad.sum())} value(s) are not recognisable as yes or no"
            f"{_examples(s_bad, s_raw)}"
        )
    out["smoker"] = s

    # policy_id, invented if the extract does not carry one
    if "policy_id" in df.columns:
        pid = df["policy_id"]
        dupes = pid.duplicated(keep=False) & pid.notna()
        if dupes.any():
            problems.append(f"policy_id: {int(dupes.sum())} row(s) share a duplicated id{_examples(dupes, pid)}")
        if pid.isna().any():
            problems.append(f"policy_id: {int(pid.isna().sum())} value(s) are blank")
        out["policy_id"] = pid
    else:
        out["policy_id"] = np.arange(1, len(df) + 1)

    if problems:
        raise PortfolioError(
            f"{path} has {len(problems)} problem(s):\n  - " + "\n  - ".join(problems)
        )

    out["age"] = out["age"].astype(int)
    out["health_score"] = out["health_score"].astype(int)
    out["term_years"] = out["term_years"].astype(int)
    out["smoker"] = out["smoker"].astype(int)
    out["sum_assured"] = out["sum_assured"].astype(float)
    out["bmi"] = out["bmi"].astype(float)

    return out[
        [
            "policy_id",
            "age",
            "gender",
            "smoker",
            "bmi",
            "health_score",
            "sum_assured",
            "term_years",
        ]
    ]


# Bands the synthetic generator was built around. Kept exactly so a run with no
# --data produces the same output it always did.
DEFAULT_AGE_EDGES = [19, 30, 40, 50, 65]


def age_band_edges(ages: pd.Series) -> tuple[list[int], list[str]]:
    """
    Ten year age bands that actually cover the data.

    The edges used to be hard-coded at [19, 30, 40, 50, 65], which was fine
    while the generator was the only source (it only makes ages 20 to 64) and
    silently dropped anyone outside that range once real data could be loaded.
    A dropped policyholder does not appear in age_band_counts or in the premium
    summary, so the omission would be invisible on the dashboard.

    The default edges are returned untouched when the data fits inside them.
    """
    lo, hi = int(ages.min()), int(ages.max())
    edges = list(DEFAULT_AGE_EDGES)
    if lo <= edges[0]:
        edges[0] = lo - 1
    if hi > edges[-1]:
        edges[-1] = hi
    labels = [f"{edges[i] + 1}-{edges[i + 1]}" for i in range(len(edges) - 1)]
    return edges, labels
