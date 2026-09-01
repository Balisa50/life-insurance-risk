# Life Insurance Risk Model

Actuarial risk modelling for Sub-Saharan Africa. Built as part of learning actuarial science - wanted to implement proper mortality models from scratch rather than use a black-box package.

All data is synthetic. This demonstrates the method, it does not measure real mortality experience.

## Models

**Mortality**: Gompertz-Makeham, `mu(x) = A + B * c^x`, with `A = 0.0005`, `B = 0.00003`, `c = 1.098`. The parameters are chosen rather than fitted to data: `c = 1.098` puts the mortality doubling time at 7.4 years, which is close to what human populations actually show. Separate infant and child mortality terms are added on top, because Gompertz-Makeham describes adult mortality and misses the left side of the curve entirely, which is the part that matters most in this region. Life expectancy at birth comes out at 68.8 years.

**Portfolio**: 10,000 synthetic policyholders aged 20 to 64, total sum assured $493.7m. Each carries a hazard multiplier standing in for underwriting: smoking 1.7x, male 1.12x, BMI threshold effects above 30 and below 18.5, and a 1 to 5 health score centred on 3.

**Survival analysis**: Kaplan-Meier curves overall and split by sex, smoker status and health score. Cox proportional hazards for covariate effects, fitted on a stratified 70% and scored on the held-out 30%. Concordance 0.784 held out, 0.767 in sample. The proportional hazards assumption is tested rather than assumed: 0 of 5 covariates breach at p < 0.05.

**Premium pricing**: Net single premium as the discounted expected claim, `sum over t of v^t * (t-1)p_x * q_(x+t-1) * SA` at 6% interest. Converted to a level annual premium through an annuity-due factor, then loaded 15% for expenses. Average annual gross premium $373, ranging from $79 in the 20-30 age band to $809 in the 51-65 band.

**Stress testing**: Monte Carlo over a 5-year horizon. 5,000 simulations for the baseline claim distribution, then 2,000 simulations for each of four mortality shock scenarios (1.0x, 1.25x, 1.6x, 2.5x). Reports VaR and TVaR at the 99.5th percentile, which is the Solvency II calibration. Baseline VaR is $14.7m against mean claims of $11.8m, but mean claims under the 1.6x shock are $18.7m, so capital held against a 1-in-200 normal year does not cover an average severe-pandemic year.

## Known limitations

- All data is synthetic. There is no real portfolio behind any of it.
- The mortality table has a plausible regional shape but is not built from Gambian or any other observed experience. It is generated from the parametric form, not graduated from data.
- Deaths are simulated independently, so the tail is thinner than real catastrophe risk. The shock scenarios are a crude correction for that.
- No lapses, no reinsurance, no commission, no select and ultimate mortality, no mortality improvement.
- Priced in USD at a flat 6%, neither of which is right for a Gambian book.
- BMI enters the Cox model as a single linear term but was generated as a threshold effect, so it comes out insignificant. Bands or a spline would fix it.
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
