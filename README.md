# NOCO | Asset IQ

*Every upgrade, in the right order.* · A concept by Axion Dynamics, prepared for NOCO

Asset IQ tells a commercial building owner which energy upgrades to make, what order to make them in, and what that order is worth. It works from a few minutes of building data, before any contractor visit. It's a pre-audit screen, not an energy audit, engineering design or quote.

**[Open the live app](https://lavya-gohil.github.io/noco-pathfinder/)** · **[Go straight to the sample results](https://lavya-gohil.github.io/noco-pathfinder/#/demo)** · **[Presentation materials](Presentation%20docs/)**

## Why the order matters

Upgrades change each other. Fixing the lighting and envelope first shrinks the HVAC system a building needs, and overlapping upgrades can't each claim the same savings.

On the sample building, a fictional 85,000 sq ft Buffalo office with a $600,000 budget, the same three upgrades give very different results depending on their order:

| | HVAC → Envelope → LED | LED → Envelope → HVAC |
|---|---|---|
| Rank among the 6 possible orders | Last | First |
| Net cost | $616,249 | $579,335 |
| Against the budget | $16,249 over | Within budget |
| 15-year value | −$181,195 | −$111,720 |

The 15-year value is negative because it charges the plan for an HVAC replacement that's due anyway. All figures are illustrative pre-audit estimates and need site verification.

## What's in the app

The app runs in four steps:

1. **Building:** property, systems, energy bills, budget and objective.
2. **Diagnosis:** energy profile, data completeness and signals to check on site.
3. **Strategy:** four plans side by side, a roadmap, the Order Lab for trying any order, scenarios, and a comparison of each upgrade.
4. **Report:** a printable executive roadmap.

A guided tour walks through all of this, with an arrow pointing at each control to use.

## How the engine works

The engine simulates every order of every combination of five upgrades: 31 combinations and 325 orderings. Each phase saves only from the load left by earlier phases, so savings aren't counted twice. Each order is valued over 15 years at a 6% discount rate, and the most valuable order that fits the budget wins. The engine then picks the best plan for each goal: Quick Wins, Balanced, Maximum Savings and Deep Retrofit.

It's deterministic arithmetic with no AI model, so the same inputs always give the same answer.

| File in `src/engine/` | Role |
|---|---|
| `baseline.ts` | Intake → end-use breakdown, prices, design tons, roof kW, emissions |
| `measures.ts` | The 5 measures: metadata + stand-alone cost/savings coefficients |
| `interactions.ts` | Sequential simulation + interaction rules A–D, order search by 15-year value, sanity caps |
| `optimizer.ts` | Enumerates all 31 combinations and 325 orders → Quick Wins / Balanced / Maximum Savings / Deep Retrofit |
| `explanations.ts` | Diagnosis signals, phase reasons, "Why this order" narrative |
| `confidence.ts` | Data-confidence score and most valuable next data point |

## Assumptions and limits

[docs/assumptions.md](docs/assumptions.md) lists where each number comes from and how far to trust it. The main limits:

- **Savings factors** are mostly engineering judgement and haven't been calibrated against measured buildings.
- **Costs** come mainly from one 2022 city study, with no regional adjustment. HVAC per-ton pricing is the weakest figure.
- **Incentives** are a flat 15% placeholder. No live programs are checked.
- **Not modeled:** real utility tariffs, equipment failing before its planned phase, and fuel switching from gas to heat pumps.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Type-check and production build |
| `npm test` | Run the engine, input and app tests |
| `npm run lint` | Run oxlint |
| `npm run preview` | Serve the production build locally |
| `npm run deploy` | Build and publish to GitHub Pages (`gh-pages` branch) |
| `npx tsx scripts/engine-check.ts` | Print optimizer output for the demo building at several budgets |

Built with React 19, TypeScript, Vite and Tailwind 4, with Recharts for charts. CI runs lint, tests and the build on every pull request.

## Deployment

Merging to `main` does not update the live site. Publish with `npm run deploy`, or run the **Deploy to GitHub Pages** workflow from the Actions tab.

## Project layout

| Path | Contents |
|---|---|
| `src/engine/` | The calculation engine |
| `src/pages/`, `src/components/` | The interface |
| `src/tour/` | Guided tour steps and arrow placement |
| `src/utils/` | Input validation, session storage and chart helpers |
| `scripts/` | Engine checks and the deploy script |
| `docs/assumptions.md` | Sources and quality grades for the model's numbers |
| `Presentation docs/` | The deck, briefing, sample report, screenshots and offline demo |

## Privacy

The app runs entirely in the browser, with no server, accounts, cookies or analytics. An assessment lives in that tab's session storage and is deleted when the tab closes. The theme choice is saved in local storage.

## License

Proprietary, all rights reserved. See [LICENSE](LICENSE). Open-source dependencies keep their own licenses.
