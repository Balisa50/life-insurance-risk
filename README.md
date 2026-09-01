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

The pipeline is seeded with `default_rng(42)` and reproduces exactly.

## Live

[life-insurance-ab.vercel.app](https://life-insurance-ab.vercel.app)
