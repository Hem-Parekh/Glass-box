# ILLUSTRATIVE plant inputs for the uploaded CMA. Replace with figures from the company's DPR.
DEMO = dict(
    company="Sample FMCG Co. (from uploaded CMA)", industry="manufacturing",
    purpose="New Home Care manufacturing plant (base product)",
    project_cost=1200.0, wc_margin=150.0,          # Rs crore; capex = 1,050
    existing_capacity=1_000_000, current_util=0.85, # tonnes / yr
    new_capacity=60_000, ramp=[0.0, 0.50, 0.70, 0.85],  # yr1 = construction
    efficiency_gain=0.06,                           # new plant variable cost 6% lower
    plant_fixed_cost=60.0,                          # Rs crore / yr, excl. depreciation
    rate=0.085, tenor=7, moratorium=1, dscr_target=1.50, min_equity=0.25,
    cash_buffer=2000.0, cost_of_equity=0.12, treasury_yield=0.07, sga_variable_share=0.7, unit_name="tonnes",
)
