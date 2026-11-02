# Model assumptions

Asset IQ is a pre-audit screen. Its numbers are for comparing options and choosing what to verify. They are not quotes or engineering results.

This page lists where each number comes from and how much to trust it. **Most savings factors are engineering judgement and haven't been calibrated against measured buildings.**

Quality grades:

- **A:** a public study or report that gives this figure directly.
- **B:** derived from a public source, with a judgement call about scope.
- **C:** contractor or vendor websites, which often disagree with each other.
- **D:** judgement, with no specific source.

## Costs

The code is in `src/engine/measures.ts`.

| Assumption | Value | Basis | Grade |
|---|---|---|---|
| LED fixture retrofit | $1.00–1.75 per sq ft | Between relamping ($0.08–0.12) and a full lighting redesign ($4–6) in the Seattle study [1] | B |
| Air sealing | $0.40 per sq ft of floor | Midpoint of envelope sealing, $0.22–0.54 [1] | B |
| Roof insulation | $2.00 per sq ft of roof | Middle of $0.19–3.86 [1] | B |
| Controls | $0.75–1.25 per sq ft | Within retro-commissioning, $0.50–2.00. A tune-up is $0.13–0.24 and full controls replacement is $3–10 [1] | B |
| Packaged HVAC | $2,400 per ton | Published figures mostly sit at $2,000–4,000 per ton installed [2] | C |
| Boiler / heat pump conversion | $2,800 / $3,000 per ton | Scaled up from the packaged figure | D |
| Heating-only replacement | $1,500 per ton | Scaled down from the packaged figure | D |
| Solar | $2.35 per watt | Non-residential medians of about $2.20–3.00 per watt, from 2017–2018 data [3]. Current prices may differ | B |
| Incentives | 15% of gross by default | Adjustable. Live programs aren't checked | D |

The Seattle figures are for one city in 2022, so they may not hold elsewhere. Costs are not adjusted by region.

## Savings

| Assumption | Value | Grade |
|---|---|---|
| LED lighting energy saved | 35–50% | D |
| Envelope heating savings | 7–26%, by vintage and climate | D |
| Envelope cooling savings | 6–9%, by climate | D |
| HVAC heating gain | 7–58%, by system and age | D |
| HVAC cooling gain | 11–32%, by system and age | D |
| Controls savings | 12% HVAC, 6% lighting, 3% plug loads | D |

## Interactions

The code is in `src/engine/interactions.ts`.

| Assumption | Value | Basis | Grade |
|---|---|---|---|
| Envelope reduces design load | 3–15%, half the annual savings rate | Peak load usually falls more slowly than annual use | D |
| LED reduces design load | 2% | | D |
| HVAC cost that scales with capacity | 70% | Labor, cranes and curbs don't shrink in step with tons | D |
| LED heat lost in winter | 35% cold, 20% mixed, 5% hot | The mechanism is well established [4]. The values are judgement | D |
| Controls and HVAC overlap | 20% | | D |
| Solar sized to | 35% of the demand left after the other upgrades | | D |
| Value of a solar kWh | 70% of the average electricity price | Demand charges are about 30–70% of a commercial bill [5]. Solar cut them by a median of 7–19%, depending on tariff [6]. With demand at a third of the bill, 0.67 + 0.33 × 0.1 ≈ 0.7 | B |

## Rules

| Rule | Value | Grade |
|---|---|---|
| HVAC not advised under | 10 years old, unless electric resistance | D |
| HVAC treated as due at | 20 years. It's then exempt from Balanced's payback limit | D |
| Balanced per-phase payback limit | 10 years | D |

## Not modeled

- Regional cost differences.
- Actual tariffs. Electricity uses one average price, and demand is only reflected through the solar value.
- Measure lifetimes beyond the analysis period, and replacement during it.
- Fuel switching from gas to heat pumps.
- Equipment that fails before its planned phase. Replacing failed equipment can't wait for the plan.
- The lower true cost of efficiency when equipment is due anyway. HVAC is carried at full replacement cost, which is conservative.

## Sources

1. City of Seattle, [Building Energy Efficiency and Electrification Costing Analysis](https://www.seattle.gov/documents/departments/ose/building%20energy/ose_decarbonization_cost%20study_june22.pdf), July 2022.
2. For example [PickHVAC](https://www.pickhvac.com/?p=46314) and [Oxmaint](https://oxmaint.com/industries/hvac/rtu-replacement-cost-2026-per-ton-pricing-install-labor-hidden-costs). These are commercial sites with no consistent method.
3. Berkeley Lab, [Tracking the Sun, 2018 edition](https://emp.lbl.gov/publications/tracking-sun-installed-price-trends) and [2019 edition](https://eta-publications.lbl.gov/bibcite/reference/31977).
4. Berkeley Lab, [Considering Lighting System Performance and HVAC Interactions in Lighting Retrofit Analysis](https://eta-publications.lbl.gov/bibcite/reference/23553).
5. NREL, [Identifying Potential Markets for Behind-the-Meter Battery Energy Storage](https://www.nrel.gov/docs/fy17osti/68963.pdf), 2017.
6. Berkeley Lab and NREL, [Exploring Demand Charge Savings from Commercial Solar](https://eta-publications.lbl.gov/sites/default/files/comdemandcharge-execsummary.pdf), 2017.
