# NOCO Pathfinder

*Don't just retrofit. Retrofit in the right order.*

Local, offline React + TypeScript app that recommends commercial-building energy retrofits **and the order to do them in**.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npx tsx scripts/engine-check.ts   # print optimizer output for the demo building at several budgets
npm run deploy     # build and publish to GitHub Pages (gh-pages branch)
```

Live: https://lavya-gohil.github.io/noco-pathfinder/

## Calculation engine (`src/engine/`)

| File | Role |
|---|---|
| `baseline.ts` | Intake → end-use breakdown, prices, design tons, roof kW, emissions |
| `measures.ts` | The 5 measures: metadata + stand-alone cost/savings coefficients |
| `interactions.ts` | Sequential simulation + interaction rules A–D, sequencing rules, sanity caps |
| `optimizer.ts` | Enumerates all 31 combinations → Quick Wins / Balanced / Deep Retrofit |
| `explanations.ts` | Diagnosis signals, phase reasons, "Why this order" narrative |
| `confidence.ts` | Data-confidence score and most valuable next data point |

All figures are illustrative pre-audit estimates.
