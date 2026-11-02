const pptxgen = require('pptxgenjs')
const { applyTheme } = require('C:/Users/vamsh/.claude/skills/synced/e71f1c34-6d9b-4865-bd34-6d8819b1701b_bf92e45b-3e82-4160-b880-0235d5ec0bb9/pptx/scripts/apply_theme.js')

const THEME = {
  name: 'Asset IQ',
  headFontFace: 'Calibri',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '08262A', lt1: 'FFFFFF', dk2: '123A3F', lt2: 'A9C7C7',
    accent1: 'F4B942', // LED
    accent2: '3CC6B4', // Envelope, and good news
    accent3: 'E6EFEF', // HVAC
    accent4: 'FF8A75', // over budget
    accent5: '2B5A5E', accent6: '7FA6A6',
    hlink: '3CC6B4', folHlink: 'A9C7C7',
  },
}

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = 'NOCO Asset IQ: every upgrade, in the right order'
pres.author = 'Axion Dynamics'
pres.company = 'Axion Dynamics'
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
const C = pres.SchemeColor

const FOOT = 'Illustrative pre-audit estimates on a sample building. Site verification required.'
pres.defineSlideMaster({
  title: 'COVER',
  background: { color: C.text1 },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 1.15, w: 12.1, h: 2.6, fontSize: 66, bold: true, color: C.background1, align: 'left', valign: 'top', margin: 0 }, text: '' } }],
})
pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.45, w: 12.1, h: 1.4, fontSize: 36, bold: true, color: C.background1, align: 'left', valign: 'top', margin: 0 }, text: '' } },
    { text: { text: FOOT, options: { x: 0.6, y: 6.9, w: 12.1, h: 0.3, fontSize: 11, color: C.accent6, margin: 0 } } },
  ],
})

// Same scale on every slide: bars stay truthful as they morph.
const X0 = 0.6
const PER_INCH = 650000 / 12.1
const W = (v) => v / PER_INCH
const LED = W(108375), ENV = W(77067), HVAC_OLD = W(430807), HVAC_NEW = W(393893), EXTRA = W(148527)
const BUDGET_X = X0 + W(600000)

const STYLE = {
  led: { fill: C.accent1 },
  env: { fill: C.accent2 },
  hvac: { fill: C.accent3 },
  ctl: { fill: C.accent5, color: C.background1 },
  sol: { fill: C.accent5, color: C.background1 },
}

function block(s, key, x, y, w, h, title, sub, size = 18) {
  const st = STYLE[key]
  const color = st.color || C.text1
  const runs = title
    ? [
        { text: title, options: { bold: true, fontSize: size, color, breakLine: Boolean(sub) } },
        ...(sub ? [{ text: sub, options: { fontSize: Math.max(14, size - 2), color } }] : []),
      ]
    : [{ text: ' ', options: { fontSize: 8, color } }]
  s.addText(runs, {
    objectName: `!!${key}`,
    shape: pres.ShapeType.roundRect,
    rectRadius: 0.08,
    x, y, w, h,
    fill: { color: st.fill },
    line: { color: C.text1, width: 1.5 },
    align: 'left',
    valign: 'middle',
    margin: [12, 6, 0, 0],
  })
}

function stat(s, i, x, y, w, num, label, color = C.background1, size = 54) {
  s.addText(num, { objectName: `!!stat${i}`, isTextBox: true, x, y, w, h: size / 54, fontSize: size, bold: true, color, margin: 0, valign: 'bottom' })
  s.addText(label, { objectName: `!!stat${i}label`, isTextBox: true, x, y: y + size / 54 + 0.05, w, h: 0.75, fontSize: 18, color: C.background2, margin: 0, valign: 'top' })
}

function budget(s, y = 2.1, h = 2.3) {
  s.addShape(pres.ShapeType.line, { objectName: '!!budgetline', x: BUDGET_X, y, w: 0, h, line: { color: C.background1, width: 2.25, dashType: 'dash' } })
  s.addText('$600,000 budget', { objectName: '!!budgetlabel', isTextBox: true, x: BUDGET_X - 2.6, y: y - 0.32, w: 2.6 + 0.93, h: 0.3, fontSize: 14, color: C.background1, align: 'right', margin: 0 })
}

const BAR_Y = 2.45, BAR_H = 1.5
const COL = [0.6, 4.75, 8.9], COL_W = 3.8, STAT_Y = 4.35

pres.addSection({ title: 'Talk' })
const sec = 'Talk'

// 1. Cover
{
  const s = pres.addSlide({ masterName: 'COVER', sectionTitle: sec })
  s.addText('NOCO Asset IQ', { objectName: '!!wordmark', isTextBox: true, x: 0.6, y: 0.55, w: 8, h: 0.45, fontSize: 22, bold: true, color: C.accent2, margin: 0 })
  s.addText([{ text: 'Every upgrade,', options: { breakLine: true } }, { text: 'in the right order' }], { placeholder: 'title' })
  block(s, 'hvac', X0, 4.5, HVAC_OLD, 0.95, 'HVAC', null, 20)
  block(s, 'env', X0 + HVAC_OLD, 4.5, ENV, 0.95, 'Envelope', null, 16)
  block(s, 'led', X0 + HVAC_OLD + ENV, 4.5, LED, 0.95, 'LED', null, 20)
  s.addText('A concept by Axion Dynamics, prepared for NOCO', { objectName: '!!byline', isTextBox: true, x: 0.6, y: 5.8, w: 10, h: 0.4, fontSize: 18, color: C.background2, margin: 0 })
  s.addNotes('0:00 (10 sec). Introduce yourselves. "This is NOCO Asset IQ. It answers one question for a building owner: which upgrades, and in what order?"')
}

// 2. The building
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('A 32-year-old rooftop system in Buffalo needs replacing', { placeholder: 'title' })
  block(s, 'hvac', X0, BAR_Y, HVAC_OLD, BAR_H, 'High-efficiency HVAC', '$430,807 net')
  budget(s)
  stat(s, 1, COL[0], STAT_Y, COL_W, '$172,000', 'a year on energy, in a sample 85,000 sq ft office')
  stat(s, 2, COL[1], STAT_Y, COL_W, '$19,113', 'saved each year by replacing the HVAC alone')
  stat(s, 3, COL[2], STAT_Y, COL_W, '22.5 years', 'payback on the HVAC alone')
  s.addNotes('0:10 (20 sec). "Here\'s a sample office in Buffalo. It spends $172,000 a year on energy, and its rooftop system is 32 years old. Replacing that system alone costs $430,807 and saves $19,113 a year. The owner has $600,000 to spend. So what should they do?"')
}

// 3. HVAC first
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('Replace it first, and the full plan breaks the budget', { placeholder: 'title' })
  block(s, 'hvac', X0, BAR_Y, HVAC_OLD, BAR_H, 'High-efficiency HVAC', '$430,807')
  block(s, 'env', X0 + HVAC_OLD, BAR_Y, ENV, BAR_H, 'Envelope', '$77,067', 16)
  block(s, 'led', X0 + HVAC_OLD + ENV, BAR_Y, LED, BAR_H, 'LED lighting', '$108,375', 16)
  budget(s)
  stat(s, 1, COL[0], STAT_Y, COL_W, '$616,249', 'net cost with HVAC first')
  stat(s, 2, COL[1], STAT_Y, COL_W, '$16,249', 'over the $600,000 budget', C.accent4)
  stat(s, 3, COL[2], STAT_Y, COL_W, '#6 of 6', 'the worst possible order for these three upgrades')
  s.addNotes('0:30 (20 sec). "Add lighting and envelope work to that. If the HVAC goes in first, it\'s sized for the building as it is today, and the plan costs $616,249. That\'s $16,249 over budget. Of the six possible orders for these upgrades, this one ranks last."')
}

// 4. Load first
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('Fix the load first, and the same upgrades fit', { placeholder: 'title' })
  block(s, 'hvac', X0 + LED + ENV, BAR_Y, HVAC_NEW, BAR_H, 'High-efficiency HVAC', '$393,893')
  block(s, 'env', X0 + LED, BAR_Y, ENV, BAR_H, 'Envelope', '$77,067', 16)
  block(s, 'led', X0, BAR_Y, LED, BAR_H, 'LED lighting', '$108,375', 16)
  budget(s)
  stat(s, 1, COL[0], STAT_Y, COL_W, '$579,335', 'net cost with the load fixed first', C.accent2)
  stat(s, 2, COL[1], STAT_Y, COL_W, '$36,915', 'off the HVAC, sized to the smaller load', C.accent2)
  stat(s, 3, COL[2], STAT_Y, COL_W, '$69,476', 'more 15-year value than the worst order', C.accent2)
  s.addNotes('0:50 (25 sec). Pause as the blocks move. "Same three upgrades. Do the lighting and envelope first and the building needs less heating and cooling, so the HVAC gets smaller. That takes $36,915 off the equipment. The plan now fits, at $579,335, and over 15 years it\'s worth $69,476 more than the worst order."')
}

// 5. The engine
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('Asset IQ tests every order of every combination', { placeholder: 'title' })
  const cw = 2.22, gap = 0.25, y = 1.75, h = 1.0
  const cx = (i) => X0 + i * (cw + gap)
  block(s, 'hvac', cx(2), y, cw, h, 'HVAC', null)
  block(s, 'env', cx(1), y, cw, h, 'Envelope', null)
  block(s, 'led', cx(0), y, cw, h, 'LED lighting', null)
  block(s, 'ctl', cx(3), y, cw, h, 'Controls', null)
  block(s, 'sol', cx(4), y, cw, h, 'Rooftop solar', null)
  stat(s, 1, COL[0], 3.05, COL_W, '31', 'combinations of five upgrades')
  stat(s, 2, COL[1], 3.05, COL_W, '325', 'orderings simulated against the budget')
  stat(s, 3, COL[2], 3.05, COL_W, '4', 'best plans, one for each goal')
  s.addText('Each phase saves only from the load the last one left. A simple sum claims $50,014 a year; with the overlap removed, it\'s $47,627.', { objectName: 'engine-note', isTextBox: true, x: 0.6, y: 5.3, w: 12.1, h: 0.9, fontSize: 20, color: C.background1, margin: 0, valign: 'top' })
  s.addNotes('1:15 (20 sec). "Nobody has to guess the order. Asset IQ simulates all 325 orderings of these five upgrades against the owner\'s budget, and each phase only saves from the load the last one left, so nothing gets counted twice. Then it offers the best plan for each of four goals."')
}

// 6. Payback
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('12.2 years looks bad, but the HVAC was due anyway', { placeholder: 'title' })
  block(s, 'hvac', X0, BAR_Y, HVAC_OLD, BAR_H, 'Replacing the HVAC alone', '$430,807, saving $19,113 a year')
  block(s, 'env', X0 + HVAC_OLD, BAR_Y, EXTRA, BAR_H, 'The plan adds $148,527', 'saving $28,514 more a year', 16)
  stat(s, 1, COL[0], STAT_Y - 0.1, 6.6, '5.2 years', 'payback on the spend beyond replacing the HVAC', C.accent2, 72)
  stat(s, 2, COL[2] - 1.1, STAT_Y + 0.33, COL_W + 1.1, '12.2 years', 'plain payback on the whole plan', C.background2)
  s.addNotes('1:35 (25 sec). Say this before they do: "12.2 years is the plain payback on the whole plan, and on its own that wouldn\'t sell. But this HVAC is 32 years old. That money gets spent either way. The real decision is the extra $148,527, which saves $28,514 more a year. That pays back in 5.2 years."')
}

// 7. Live
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('Now pick any order and watch what it\'s worth', { placeholder: 'title' })
  const rx = 0.6, rw = 6.2, rh = 0.85
  block(s, 'hvac', rx, 3.85, rw, rh, '03   High-efficiency HVAC', null, 20)
  block(s, 'env', rx, 2.85, rw, rh, '02   Envelope', null, 20)
  block(s, 'led', rx, 1.85, rw, rh, '01   LED lighting', null, 20)
  s.addText('Open the live demo', { objectName: 'demo-button', shape: pres.ShapeType.roundRect, rectRadius: 0.08, x: rx, y: 5.25, w: rw, h: 0.85, fill: { color: C.accent5 }, line: { color: C.accent2, width: 1.5 }, fontSize: 20, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0 })
  stat(s, 1, 7.4, 1.8, 5.3, '#1 of 6', 'this order, the best that fits the budget', C.accent2)
  stat(s, 2, 7.4, 3.75, 5.3, '\u2212$69,476', 'the 15-year cost of the worst order, which also goes $16,249 over budget', C.accent4)
  s.addNotes('2:00 (60 sec, hard limit). Before the talk, open the live app in a browser, go to Strategy > Why this order and scroll to the Order Lab, so you can Alt+Tab straight to it. The button on this slide also opens the demo link, but that starts on Choose a path. Click Worst order and say nothing for a moment. Then: "Same three upgrades, $69,476 worse, and now over budget." Offer the controls: "Pick any order." Alt+Tab back to carry on.\n\nIf the internet fails: type 11 and press Enter to jump to the hidden backup screenshot, then type 8 and press Enter to come back.')
}

// 8. For NOCO
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('One assessment can become a staged series of jobs', { placeholder: 'title' })
  const h = 1.05
  block(s, 'hvac', X0 + LED + ENV, 4.4, HVAC_NEW, h, 'Year 3', 'High-efficiency HVAC, sized to the smaller load', 16)
  block(s, 'env', X0 + LED, 3.15, ENV, h, 'Year 2', 'Envelope', 16)
  block(s, 'led', X0, 1.9, LED, h, 'Year 1', 'LED lighting', 16)
  s.addText(
    [
      { text: 'A small first phase gives the customer a reason to start', options: { bullet: true, breakLine: true } },
      { text: 'The roadmap gives them a reason to come back', options: { bullet: true, breakLine: true } },
      { text: 'It reaches the owner before a single-equipment quote does', options: { bullet: true } },
    ],
    { objectName: 'noco-points', isTextBox: true, x: 4.6, y: 1.9, w: 8.1, h: 2.0, fontSize: 22, color: C.background1, margin: 0, valign: 'top', paraSpaceAfter: 8 },
  )
  stat(s, 1, 0.6, 4.35, 3.2, 'Three', 'phases, not one quote', C.accent2)
  s.addNotes('3:00 (25 sec). "For NOCO, this could change the sales conversation. One building\'s data becomes a staged series of jobs instead of a single quote: a reason to start small, a reason to come back, and it reaches the owner before a competitor\'s equipment quote does."\n\nDon\'t claim NOCO delivers every phase unless you\'ve confirmed its service list. One year between phases is a model assumption.')
}

// 9. Honest close
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec })
  s.addText('It\'s a screen, not an audit. Your data makes it real', { placeholder: 'title' })
  const y = 1.5, h = 3.6, w = 5.9
  for (const [i, head, items, numbered] of [
    [0, 'Where it stands', ['Most costs come from public studies, and each is graded', 'HVAC pricing per ton is the weakest cost', 'Savings factors are engineering judgement, not yet calibrated'], false],
    [1, 'What makes it real', ['Calibrate on NOCO\'s completed projects', 'Add real tariffs and incentive programs', 'Model fuel switching and failure risk', 'Pilot with the sales team'], true],
  ]) {
    const x = 0.6 + i * (w + 0.3)
    s.addShape(pres.ShapeType.roundRect, { objectName: `card${i}`, x, y, w, h, rectRadius: 0.1, fill: { color: C.text2 } })
    s.addText(head, { objectName: `card${i}-head`, isTextBox: true, x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 0.5, fontSize: 24, bold: true, color: i ? C.accent2 : C.accent1, margin: 0 })
    s.addText(
      items.map((t, n) => ({ text: t, options: { bullet: numbered ? { type: 'number' } : true, breakLine: n < items.length - 1 } })),
      { objectName: `card${i}-list`, isTextBox: true, x: x + 0.3, y: y + 0.85, w: w - 0.6, h: h - 1.05, fontSize: 20, color: C.background1, margin: 0, valign: 'top', paraSpaceAfter: 8 },
    )
  }
  const by = 5.5, bh = 0.5
  block(s, 'hvac', X0 + LED + ENV, by, HVAC_NEW, bh, null)
  block(s, 'env', X0 + LED, by, ENV, bh, null)
  block(s, 'led', X0, by, LED, bh, null)
  s.addNotes('3:25 (25 sec). Name the weakness before they do. "This is a pre-audit screen, not an audit. The costs have sources, but our savings factors are judgement, and they haven\'t been calibrated against measured buildings. Your completed projects are exactly what would fix that, and that\'s what we\'d like to do next."')
}

// 10. Close
{
  const s = pres.addSlide({ masterName: 'COVER', sectionTitle: sec })
  s.addText('NOCO Asset IQ', { objectName: '!!wordmark', isTextBox: true, x: 0.6, y: 0.55, w: 8, h: 0.45, fontSize: 22, bold: true, color: C.accent2, margin: 0 })
  s.addText([{ text: 'Every upgrade,', options: { breakLine: true } }, { text: 'in the right order' }], { placeholder: 'title' })
  block(s, 'hvac', X0 + LED + ENV, 4.5, HVAC_NEW, 0.95, 'HVAC', null, 20)
  block(s, 'env', X0 + LED, 4.5, ENV, 0.95, 'Envelope', null, 16)
  block(s, 'led', X0, 4.5, LED, 0.95, 'LED', null, 20)
  s.addText('lavya-gohil.github.io/noco-pathfinder', { objectName: '!!byline', isTextBox: true, x: 0.6, y: 5.8, w: 10, h: 0.4, fontSize: 18, color: C.background2, margin: 0 })
  s.addNotes('3:50 (10 sec). "Every upgrade, in the right order. We\'d love to calibrate it on your projects. Thank you." Stay on this slide for questions.')
}

// 11. Backup (hidden)
pres.addSection({ title: 'Backup' })
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Backup' })
  s.addText('Backup: the Order Lab on the worst order', { placeholder: 'title' })
  s.addImage({ path: 'order-lab-worst.png', objectName: 'order-lab-screenshot', altText: 'Order Lab in the app showing HVAC, Envelope, LED ranked 6 of 6, 15-year value minus $181,195, net cost $616,249, and $16,249 over budget', x: 0.6, y: 1.45, w: 12.1, h: 12.1 * (380 / 1240) })
  s.hidden = true
  s.addNotes('Hidden slide, for when the internet fails during the live demo. Type 8 and press Enter to go back to the talk.')
}

;(async () => {
  await pres.writeFile({ fileName: 'raw.pptx' })
  await applyTheme('raw.pptx', THEME)
  console.log('built raw.pptx')
})()
