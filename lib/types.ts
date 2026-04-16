export interface LifeTableRow {
  age: number;
  qx: number;
  lx: number;
  dx: number;
  ex: number;
  hazard_rate: number;
}

export interface Demographics {
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
  concordance: number;
  log_likelihood: number;
  log_likelihood_p: number;
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
