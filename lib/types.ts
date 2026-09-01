export interface LifeTableRow {
  age: number;
  qx: number;
  lx: number;
  dx: number;
  ex: number;
  hazard_rate: number;
}

export interface Demographics {
  /** "synthetic", or the filename the book was loaded from. */
  data_source: string;
  total_policies: number;
  avg_age: number;
  gender_split: Record<string, number>;
  smoker_rate: number;
  avg_bmi: number;
  avg_sum_assured: number;
  total_sum_assured: number;
  avg_term: number;
  age_band_counts: Record<string, number>;
  health_score_dist: Record<string, number>;
}

export interface KMCurve {
  timeline: number[];
  survival: number[];
  median_survival: number | null;
}

export interface MortalitySummary {
  total_deaths: number;
  death_rate: number;
  /** How each policy ended: death, lapse or maturity. */
  exit_reasons: Record<string, number>;
  /** Share of policies that lapsed. These are censored, never claims. */
  lapse_rate: number;
  avg_duration_at_death: number;
  deaths_by_gender: Record<string, number>;
  deaths_by_smoker: Record<string, number>;
}

export interface CoxCoefficient {
  covariate: string;
  coef: number;
  hazard_ratio: number;
  se: number;
  p_value: number;
  ci_lower: number;
  ci_upper: number;
}

export interface CoxPH {
  coefficients: CoxCoefficient[];
  /** Scored on the held-out 30%. Null when the book had too few deaths to split. */
  concordance: number | null;
  concordance_in_sample: number | null;
  /** Covariates breaching proportional hazards at p < 0.05. null if the test could not run. */
  ph_violations: number | null;
  log_likelihood: number | null;
  log_likelihood_p: number | null;
  /** Deaths the model was fitted on. Drives whether any of the above is trustworthy. */
  n_events: number;
  /** Set when the book is too small for the fit to mean anything. */
  warning: string | null;
}

export interface SelectFactor {
  duration: number;
  factor: number;
}

export interface LapseRate {
  duration: number;
  rate: number;
}

/** The pricing basis: assumptions, not estimates fitted to experience. */
export interface Basis {
  select_period: number;
  select_factors: SelectFactor[];
  lapse_rates: LapseRate[];
  ultimate_lapse: number;
  note: string;
}

/** One row of the select and ultimate display: q[x]+t across the select period. */
export interface SelectTableRow {
  entry_age: number;
  ultimate_age: number;
  ultimate: number;
  [key: string]: number;
}

export interface PersistencyPoint {
  duration: number;
  in_force: number;
}

export interface PremiumGroupRow {
  avg_nsp: number;
  avg_annual: number;
  count: number;
  [key: string]: string | number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface MonteCarloResults {
  n_simulations: number;
  horizon_years: number;
  n_policies: number;
  total_sum_assured: number;
  mean_claims: number;
  std_claims: number;
  mean_deaths: number;
  mean_lapses: number;
  percentiles: Record<string, number>;
  var_995: number;
  tvar_995: number;
  risk_margin: number;
  required_reserve: number;
  loss_ratio_mean: number;
  histogram: HistogramBin[];
  death_histogram: HistogramBin[];
}

export interface ScenarioResult {
  scenario: string;
  mortality_shock: number;
  mean_claims: number;
  var_995: number;
  tvar_995: number;
  mean_deaths: number;
  required_reserve: number;
}

export interface PipelineData {
  generated_at: string;
  life_table: {
    chart: LifeTableRow[];
    full: LifeTableRow[];
  };
  basis: Basis;
  select_table: SelectTableRow[];
  persistency: PersistencyPoint[];
  demographics: Demographics;
  survival: {
    mortality_summary: MortalitySummary;
    km_overall: Record<string, KMCurve>;
    km_by_gender: Record<string, KMCurve>;
    km_by_smoker: Record<string, KMCurve>;
    km_by_health: Record<string, KMCurve>;
  };
  cox_ph: CoxPH;
  pricing: {
    portfolio_totals: {
      total_nsp: number;
      total_annual_net: number;
      total_annual_gross: number;
      avg_nsp: number;
      avg_annual_gross: number;
      avg_annual_gross_no_lapse: number;
      avg_lapse_credit: number;
      avg_in_force_end: number;
    };
    summaries: {
      by_age: PremiumGroupRow[];
      by_gender: PremiumGroupRow[];
      by_smoker: PremiumGroupRow[];
      by_health: PremiumGroupRow[];
    };
  };
  monte_carlo: MonteCarloResults;
  scenarios: ScenarioResult[];
}
