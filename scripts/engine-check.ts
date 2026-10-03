import { DEMO_FORM, toBuilding } from '../src/utils/building'
import { buildBaseline } from '../src/engine/baseline'
import { optimize } from '../src/engine/optimizer'

const b = toBuilding(DEMO_FORM)
for (const [budget, price, inc] of [[250000,0,0.15],[25000,0,0.15],[100000,0,0.15],[150000,0,0.15],[400000,0,0.15],[600000,0,0.15],[1000000,0,0.15],[250000,0.5,0.3],[250000,-0.2,0]]) {
  const base = buildBaseline(b, price)
  const r = optimize(base, { budget, elecPriceChange: price, incentiveRate: inc })
  console.log(`\n=== budget ${budget} price ${price} inc ${inc} | spend ${base.totalSpend.toFixed(0)} tons ${base.designTons.toFixed(0)} roofKw ${base.roofKw.toFixed(0)}`)
  for (const s of r.strategies) {
    const p = s.plan
    console.log(s.id.padEnd(9), p ? `${p.order.join('>').padEnd(36)} net ${p.net.toFixed(0).padStart(7)} sav ${p.annualSavings.toFixed(0).padStart(6)} pb ${p.payback?.toFixed(1)} co2 ${p.co2.toFixed(0)} seq ${p.sequencingSavings.toFixed(0)} overlap ${p.overlapRemoved.toFixed(0)} unseqNet ${p.unsequencedNet.toFixed(0)}` : 'none', s.sameAs ?? '')
  }
  if (budget===250000 && price===0) {
    console.log(base.endUses.map(e=>`${e.name} ${(e.share*100).toFixed(0)}%`).join(', '))
    for (const p of r.plans.filter(p=>p.order.length===1)) console.log('  single', p.order[0], 'gross', p.gross.toFixed(0), 'net', p.net.toFixed(0), 'sav', p.annualSavings.toFixed(0), 'pb', p.payback?.toFixed(1))
    const top = r.affordable.map(p=>({o:p.order.join('>'), net:p.net, sav:p.annualSavings, pb:p.payback})).sort((a,b)=>b.sav-a.sav).slice(0,8)
    console.table(top)
  }
}
