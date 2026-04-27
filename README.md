# Life Insurance Risk Model

Actuarial risk modelling for Sub-Saharan Africa. Built as part of learning actuarial science — wanted to implement proper mortality models from scratch rather than use a black-box package.

## Models

**Mortality**: Gompertz-Makeham. Fits the exponential mortality increase with age plus a constant background hazard rate. Parameters estimated on 5,000 synthetic Sub-Saharan Africa profiles calibrated to regional age distributions.

**Survival analysis**: Kaplan-Meier curves with log-rank tests across risk groups. Cox Proportional Hazards for covariate effects — C-index of 0.77 on holdout.

**Premium pricing**: Actuarial present value framework. Premiums back-calculated from mortality tables with loading factors.

**Stress testing**: Monte Carlo simulation across 5,000 scenarios including pandemic shock (mortality multiplier 1.8x–3.5x, calibrated loosely to COVID mortality data). VaR at 95th and 99th percentile.

## Stack

- Python — lifelines, NumPy, pandas, scipy
- Next.js + Recharts — interactive dashboard

## Running

```bash
# Modelling
pip install -r requirements.txt
jupyter notebook notebooks/

# Dashboard
cd dashboard
npm install && npm run dev
```

## Live

[life-insurance-ab.vercel.app](https://life-insurance-ab.vercel.app)

