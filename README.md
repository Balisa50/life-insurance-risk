# Life Insurance Risk Model

[![CI](https://github.com/Balisa50/life-insurance-risk/actions/workflows/ci.yml/badge.svg)](https://github.com/Balisa50/life-insurance-risk/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Actuarial risk modelling for Sub-Saharan Africa. Built as part of learning actuarial science - wanted to implement proper mortality models from scratch rather than use a black-box package.

All data is synthetic. This demonstrates the method, it does not measure real mortality experience.

## Models

**Mortality**: Gompertz-Makeham, `mu(x) = A + B * c^x`, with `A = 0.0005`, `B = 0.00003`, `c = 1.098`. The parameters are chosen rather than fitted to data: `c = 1.098` puts the mortality doubling time at 7.4 years, which is close to what human populations actually show. Separate infant and child mortality terms are added on top, because Gompertz-Makeham describes adult mortality and misses the left side of the curve entirely, which is the part that matters most in this region. Life expectancy at birth comes out at 68.8 years.

**Select and ultimate**: mortality is written `q[x]+t`, the rate for a life underwritten at age `x` and now `t` years into the policy. Someone who has just passed underwriting is healthier than the general population of the same age, because the sick were declined or rated, and that advantage wears off. A 5-year select period is used, with mortality starting at 45% of ultimate and ramping back linearly. Ignoring selection overstates mortality in the early durations, which is where a term policy has most of its exposure.

**Lapses**: 14% in the first policy year, falling to 4% ultimate. Mortality and lapse compete as two decrements in the same year, converted from independent to dependent rates the usual way, `(aq)_d = q_d(1 - q_w/2)`. Only 34.8% of the book is expected to reach the end of its term. In the survival analysis a lapse is a censoring event and never a claim: the policyholder walks away alive, and counting them as a death would bias the mortality estimate badly.

**Portfolio**: 10,000 synthetic policyholders aged 20 to 64, total sum assured $493.7m. Each carries a hazard multiplier standing in for underwriting: smoking 1.7x, male 1.12x, BMI threshold effects above 30 and below 18.5, and a 1 to 5 health score centred on 3.

**Survival analysis**: Kaplan-Meier curves overall and split by sex, smoker status and health score. Cox proportional hazards for covariate effects, fitted on a stratified 70% and scored on the held-out 30%. Concordance 0.765 held out. The proportional hazards assumption is tested rather than assumed: 1 of 5 covariates breaches at p < 0.05, BMI at p = 0.034. That is the same covariate flagged in the limitations below, entered as a single linear term when it was generated as a threshold effect, so a misspecified functional form showing up as a time-varying effect is the expected consequence rather than a surprise. The other four hold. Of 10,000 policies, 688 end in death, 5,836 lapse and 3,476 reach maturity.

**Premium pricing**: Net single premium as the discounted expected claim, `sum over t of v^t * (t-1)p_x * (aq)_death * SA` at 6% interest, where `(t-1)p_x` is survival *in force* (alive and still paying). Converted to a level annual premium by dividing by a decrement-weighted annuity-due, then loaded 15% for expenses. Average annual gross premium $306, ranging from $61 in the 20-30 age band to $682 in the 51-65 band. Smokers average $431 against non-smokers at $262.

The annuity factor used to be an annuity-*certain*, `(1 - v^n)/d`, which assumes premiums keep arriving for the full term whether or not the policyholder is alive or still on the books. That factor is too large, so it produced a level premium that was too small. Both sides of the equivalence principle are now weighted by the same in-force curve.

**Lapse credit**: pricing with the lapse assumption makes the book 15.7% cheaper than pricing without it, because policyholders who leave a term assurance forfeit everything and were never going to claim. That is a real effect and a real exposure. If persistency comes in better than assumed, the book is underpriced. Both prices are computed and reported side by side so the size of that bet stays visible. A reserving basis would not take the same credit a pricing basis does.

**Stress testing**: Monte Carlo over a 5-year horizon, with both decrements running. 5,000 simulations for the baseline claim distribution and 5,000 for each mortality shock scenario (1.25x, 1.6x, 2.5x). The 1.0x row is the baseline run itself rather than a second sample of it, so the table and the headline report one number instead of two that differ by sampling noise. Reports VaR and TVaR at the 99.5th percentile, which is the Solvency II calibration. Baseline VaR is $8.19m against mean claims of $6.04m, but mean claims under the 1.6x shock are $9.59m, so capital held against a 1-in-200 normal year still does not cover an average severe-pandemic year.

## Known limitations

- All data is synthetic. There is no real portfolio behind any of it.
- The mortality table has a plausible regional shape but is not built from Gambian or any other observed experience. It is generated from the parametric form, not graduated from data.
- Deaths are simulated independently, so the tail is thinner than real catastrophe risk. The shock scenarios are a crude correction for that.
- Select factors and lapse rates are assumptions, not estimates. Nothing in the basis is fitted to experience data, because there is no experience data. Replacing them with a real investigation is the first thing anyone with actual data should do, and emerging-market lapse experience is typically worse than assumed here.
- No reinsurance, no commission, no mortality improvement, no surrender values.
- Lapse rates depend on duration alone. In practice they vary by premium size, distribution channel, age and payment method.
- Priced in USD at a flat 6%, neither of which is right for a Gambian book.
- BMI enters the Cox model as a single linear term but was generated as a threshold effect, so it comes out insignificant and is also the one covariate that breaches proportional hazards. Bands or a spline would fix both. Its hazard ratio should not be read as meaningful in the meantime.
- `required_reserve` is arithmetically identical to `var_995`, because risk margin is defined as VaR minus mean. A real reserve would be a best estimate plus a risk adjustment on a separate, more prudent basis.

## Stack

- Python - lifelines, NumPy, pandas, scipy, scikit-learn
- Next.js + Recharts - interactive dashboard

## Running

```bash
pip install -r pipeline/requirements.txt
python pipeline/run_pipeline.py    # writes public/data/pipeline_results.json

npm install
npm run dev
```

The synthetic run is seeded with `default_rng(42)` and reproduces exactly.

## Tests

```bash
pip install pytest
cd pipeline
pytest                      # 29 tests on the basis
python check_reproducible.py   # a fresh run must match the committed results
```

The tests check identities rather than today's numbers. A test asserting the
average premium is $306 would break every time an assumption is retuned and
would tell you nothing; these assert that the life table balances (`dx = lx qx`
and `lx[x+1] = lx[x] - dx[x]`), that adult hazard doubles on the 7.4-year
Gompertz schedule the parameters imply, that two competing decrements can never
remove more than everyone, that selection never makes a freshly underwritten
life look worse than ultimate, and that the annuity factor stays strictly below
the annuity-certain. That last one is a regression guard on the pricing bug
described above.

CI runs the tests, runs the full pipeline, and fails if a fresh seeded run does
not reproduce `public/data/pipeline_results.json`. The comparison is a 0.1%
relative tolerance rather than exact equality, and that is deliberate: the Cox
fit goes through an iterative optimiser and lifelines, scikit-learn and NumPy
all sit on whatever BLAS the platform ships, so the last digits differ between
Windows and Linux. Structure is still compared exactly. Retuning an assumption
moves figures by percent, so the check still catches the thing it exists for,
which is the dashboard and the model drifting apart silently.

## Running on a real book

`--data` swaps the generated policyholders for a CSV:

```bash
python pipeline/run_pipeline.py --data pipeline/example_book.csv
```

The file needs the columns below. Case and surrounding space in the headers are
ignored, and `policy_id` is optional: rows are numbered if it is absent. Policy
numbers can be alphanumeric.

| Column | Accepts |
| --- | --- |
| `age` | whole number, 0 to 100 |
| `gender` | `M`, `F`, `Male`, `Female`, any case |
| `smoker` | `1`/`0`, `Y`/`N`, `Yes`/`No`, `true`/`false` |
| `bmi` | number, 10 to 80 |
| `health_score` | whole number 1 to 5, where 3 is the neutral middle |
| `sum_assured` | number above 0 |
| `term_years` | whole number, at least 1 |

`pipeline/example_book.csv` is a working 500-policy file. Bad input is rejected
before any modelling runs, with every problem listed at once and the CSV row
number against each one. Put real extracts in `pipeline/data/`, which is
gitignored so nothing confidential is committed by accident.

**What loading a book does and does not give you.** Only the policyholders come
from the file. The deaths in stage 3 are still simulated from the life table, so
you get real exposure, real sums assured and real pricing, and you do not get
real mortality experience. Fitting to actual experience would mean reading real
duration and event columns rather than simulating them, which this pipeline does
not do yet.

Small books are handled out loud rather than silently. Below roughly ten deaths
per covariate the Cox fit is flagged as unreliable, and below six deaths no
coefficients are reported at all. A handful of deaths otherwise yields a
concordance of 1.0 through complete separation, which looks like a perfect model
and is not one.

## Live

[life-insurance-ab.vercel.app](https://life-insurance-ab.vercel.app)
