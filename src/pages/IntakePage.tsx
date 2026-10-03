import { useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Compass } from 'lucide-react'
import {
  BUILDING_TYPES,
  COOLING_SYSTEMS,
  HEATING_SYSTEMS,
  OBJECTIVES,
  type BuildingForm,
  type Objective,
} from '../types'
import { EMPTY_FORM, MONTHS, US_STATES, groupDigits, parseNum, validate, type FormErrors } from '../utils/building'
import { Button, PageHeader, cx } from '../components/ui'
import { StageNav } from '../components/Stages'
import { money } from '../utils/format'

const OBJECTIVE_HELP: Record<Objective, string> = {
  'Fastest Payback': 'Prioritize short payback periods',
  Balanced: 'Weigh savings, payback and sequencing',
  'Maximum Savings': 'Prioritize annual savings',
  'Deep Retrofit': 'Prioritize energy and carbon reduction',
}

type NumericKey = 'sqft' | 'elecCost' | 'heatCost' | 'kwh' | 'budget'

export const INTAKE_SECTIONS: { title: string; description: string; fields: (keyof BuildingForm)[] }[] = [
  {
    title: 'Property',
    description: 'Identifies the building and sets the baseline for size- and age-based estimates.',
    fields: ['name', 'city', 'state', 'type', 'sqft', 'yearBuilt'],
  },
  {
    title: 'Building systems',
    description: 'Primary heating and cooling equipment. Choose “Not Sure” if unknown — it only lowers confidence.',
    fields: ['heating', 'cooling', 'hvacYear'],
  },
  {
    title: 'Energy',
    description: 'Utility spend from the last 12 months of bills. Monthly usage gives the most accurate results.',
    fields: ['elecCost', 'heatCost', 'kwh', 'monthly'],
  },
  {
    title: 'Planning',
    description: 'Available capital and what matters most. Both can be adjusted later on the strategy screen.',
    fields: ['budget', 'objective'],
  },
]

const sectionErrors = (errs: FormErrors, i: number): FormErrors =>
  Object.fromEntries(Object.entries(errs).filter(([k]) => INTAKE_SECTIONS[i].fields.includes(k as keyof BuildingForm)))

function summary(f: BuildingForm, i: number): string {
  const n = (v: string) => (v ? groupDigits(v) : '')
  switch (i) {
    case 0:
      return [f.type, f.sqft && `${n(f.sqft)} sq ft`, f.city && f.state && `${f.city}, ${f.state}`].filter(Boolean).join(' · ')
    case 1:
      return [f.heating, f.cooling].filter(Boolean).join(' / ')
    case 2:
      return f.elecCost
        ? `${money(Number(f.elecCost.replace(/\D/g, '')))} electric${f.monthly.every((m) => m.trim()) ? ' · 12 months' : ''}`
        : ''
    default:
      return f.budget ? `${money(Number(f.budget.replace(/\D/g, '')))} · ${f.objective}` : ''
  }
}

function Field({
  label,
  optional,
  error,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string
  optional?: boolean
  error?: string
  hint?: string
  children: ReactNode
  htmlFor: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-1.5 text-[13px] font-medium text-fg">
        {label}
        {optional && <span className="font-normal text-fg-3">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-err`} className="mt-1.5 text-[12px] text-neg" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[12px] text-fg-3">{hint}</p>
      )}
    </div>
  )
}

const control = 'neu-field h-11 w-full rounded-xl px-3.5 text-[14px] text-fg placeholder:text-fg-3'

function Affix({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[14px] text-fg-3">{prefix}</span>
      )}
      {children}
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[12px] text-fg-3">{suffix}</span>
      )}
    </div>
  )
}

export function IntakePage({
  form,
  setForm,
  onSubmit,
  sub,
  setSub,
  onStartTour,
}: {
  form: BuildingForm
  setForm: (f: BuildingForm) => void
  onSubmit: () => void
  sub: number
  setSub: (i: number) => void
  onStartTour: () => void
}) {
  /** Sections where the user has tried to continue — errors show live there. */
  const [attempted, setAttempted] = useState<Set<number>>(new Set())
  const all = validate(form)
  const valid = (i: number) => Object.keys(sectionErrors(all, i)).length === 0
  const errors: FormErrors = attempted.has(sub) ? sectionErrors(all, sub) : {}
  const last = INTAKE_SECTIONS.length - 1
  const section = INTAKE_SECTIONS[sub]

  const set = <K extends keyof BuildingForm>(k: K, v: BuildingForm[K]) => setForm({ ...form, [k]: v })

  const go = (i: number) => {
    setSub(i)
    window.scrollTo({ top: 0 })
  }

  const next = () => {
    if (!valid(sub)) {
      setAttempted(new Set(attempted).add(sub))
      const first = Object.keys(sectionErrors(all, sub))[0]
      requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus())
      return
    }
    if (sub < last) return go(sub + 1)
    const bad = INTAKE_SECTIONS.findIndex((_, i) => !valid(i))
    if (bad >= 0) {
      setAttempted(new Set(attempted).add(bad))
      return go(bad)
    }
    onSubmit()
  }

  const canSelect = (i: number) => INTAKE_SECTIONS.slice(0, i).every((_, j) => valid(j))

  const num = (k: NumericKey, placeholder: string, opts: { prefix?: string; suffix?: string } = {}) => (
    <Affix prefix={opts.prefix} suffix={opts.suffix}>
      <input
        id={`f-${k}`}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `f-${k}-err` : undefined}
        className={cx(control, 'tnum', opts.prefix && 'pl-7', opts.suffix && 'pr-16')}
        value={groupDigits(form[k])}
        placeholder={placeholder}
        onChange={(e) => set(k, groupDigits(e.target.value))}
      />
    </Affix>
  )

  const text = (k: 'name' | 'city', placeholder: string) => (
    <input
      id={`f-${k}`}
      aria-invalid={Boolean(errors[k])}
      aria-describedby={errors[k] ? `f-${k}-err` : undefined}
      className={control}
      value={form[k]}
      placeholder={placeholder}
      onChange={(e) => set(k, e.target.value)}
    />
  )

  const select = <K extends 'state' | 'type' | 'heating' | 'cooling'>(k: K, options: readonly string[]) => (
    <select
      id={`f-${k}`}
      aria-invalid={Boolean(errors[k])}
      aria-describedby={errors[k] ? `f-${k}-err` : undefined}
      className={cx(control, 'pr-8')}
      value={form[k]}
      onChange={(e) => set(k, e.target.value as BuildingForm[K])}
    >
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )

  return (
    <div>
      <PageHeader
        title="Building assessment"
        description="Enter the information available for this property. Estimates improve as more building data is provided."
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setForm(EMPTY_FORM)
                setAttempted(new Set())
                go(0)
              }}
            >
              Clear form
            </Button>
            <Button variant="secondary" onClick={onStartTour} tour="intake-demo">
              <Compass className="h-4 w-4" aria-hidden /> Load demo building
            </Button>
          </>
        }
      />

      <div className="lg:hidden">
        <StageNav
          tour="intake-steps-mobile"
          label="Assessment sections"
          stages={INTAKE_SECTIONS}
          current={sub}
          onSelect={go}
          canSelect={canSelect}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Vertical step list (desktop) */}
        <nav aria-label="Assessment sections" data-tour="intake-steps" className="neu-raised hidden self-start rounded-2xl p-3 lg:block">
          <ol>
            {INTAKE_SECTIONS.map((s, i) => {
              const active = i === sub
              const done = i < sub && valid(i)
              const enabled = active || canSelect(i)
              const sum = summary(form, i)
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    disabled={!enabled}
                    aria-current={active ? 'step' : undefined}
                    className={cx(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-[box-shadow] duration-150',
                      active && 'neu-inset',
                      !enabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span
                      className={cx(
                        'tnum mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold',
                        active ? 'neu-btn-primary !shadow-none' : done ? 'bg-brand-soft text-brand-text' : 'neu-raised-sm text-fg-3',
                      )}
                      aria-hidden
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cx('block text-[14px]', active ? 'font-semibold text-fg' : 'font-medium text-fg')}>{s.title}</span>
                      <span className="block truncate text-[12px] text-fg-2">{sum || (active ? 'In progress' : 'Not started')}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mx-3 mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-fg-3">
            Runs locally in your browser. No data leaves this device.
          </div>
        </nav>

        {/* Current section */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
          data-tour="intake-section"
          className="neu-raised rounded-2xl"
        >
          <header className="border-b border-line/70 px-6 py-5">
            <div className="text-[12px] font-medium text-brand-text">
              Step {sub + 1} of {INTAKE_SECTIONS.length}
            </div>
            <h2 className="mt-0.5 text-[18px] font-semibold text-fg">{section.title}</h2>
            <p className="mt-1 text-[13px] text-fg-2">{section.description}</p>
          </header>

          <div key={sub} className="stage-in px-6 py-6">
            {sub === 0 && (
              <div className="grid gap-5 sm:grid-cols-6">
                <Field label="Building name" error={errors.name} htmlFor="f-name" className="sm:col-span-6">
                  {text('name', 'e.g. Riverside Commerce Center')}
                </Field>
                <Field label="City" error={errors.city} htmlFor="f-city" className="sm:col-span-4">
                  {text('city', 'City')}
                </Field>
                <Field label="State" error={errors.state} htmlFor="f-state" className="sm:col-span-2">
                  {select('state', US_STATES)}
                </Field>
                <Field label="Building type" error={errors.type} htmlFor="f-type" className="sm:col-span-2">
                  {select('type', BUILDING_TYPES)}
                </Field>
                <Field label="Square footage" error={errors.sqft} htmlFor="f-sqft" className="sm:col-span-2">
                  {num('sqft', '85,000', { suffix: 'sq ft' })}
                </Field>
                <Field label="Year built" optional error={errors.yearBuilt} htmlFor="f-yearBuilt" className="sm:col-span-2">
                  <input
                    id="f-yearBuilt"
                    inputMode="numeric"
                    maxLength={4}
                    aria-invalid={Boolean(errors.yearBuilt)}
                    aria-describedby={errors.yearBuilt ? 'f-yearBuilt-err' : undefined}
                    className={cx(control, 'tnum')}
                    value={form.yearBuilt}
                    placeholder="1988"
                    onChange={(e) => set('yearBuilt', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>
            )}

            {sub === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Heating" error={errors.heating} htmlFor="f-heating">
                  {select('heating', HEATING_SYSTEMS)}
                </Field>
                <Field label="Cooling" error={errors.cooling} htmlFor="f-cooling">
                  {select('cooling', COOLING_SYSTEMS)}
                </Field>
                <Field
                  label="HVAC equipment installed"
                  optional
                  error={errors.hvacYear}
                  hint="Year the main heating and cooling units were installed. Adds 6 confidence points."
                  htmlFor="f-hvacYear"
                >
                  <input
                    id="f-hvacYear"
                    inputMode="numeric"
                    maxLength={4}
                    aria-invalid={Boolean(errors.hvacYear)}
                    aria-describedby={errors.hvacYear ? 'f-hvacYear-err' : undefined}
                    className={cx(control, 'tnum')}
                    value={form.hvacYear}
                    placeholder="1994"
                    onChange={(e) => set('hvacYear', e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>
            )}

            {sub === 2 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Electricity cost" error={errors.elecCost} htmlFor="f-elecCost">
                  {num('elecCost', '118,000', { prefix: '$', suffix: 'per year' })}
                </Field>
                <Field label="Heating / natural gas cost" error={errors.heatCost} htmlFor="f-heatCost">
                  {num('heatCost', '54,000', { prefix: '$', suffix: 'per year' })}
                </Field>
                <Field label="Electricity usage" optional error={errors.kwh} hint="Improves data confidence" htmlFor="f-kwh">
                  {num('kwh', '720,000', { suffix: 'kWh / yr' })}
                </Field>
                <fieldset className="sm:col-span-2" aria-describedby={errors.monthly ? 'f-monthly-err' : 'f-monthly-hint'}>
                  <legend className="mb-2 flex flex-wrap items-baseline gap-x-1.5 text-[13px] font-medium text-fg">
                    Monthly electricity usage <span className="font-normal text-fg-3">Optional · kWh per month</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                    {MONTHS.map((mo, i) => (
                      <label key={mo} className="block">
                        <span className="mb-1 block text-[11px] font-medium text-fg-2">{mo}</span>
                        <input
                          id={i === 0 ? 'f-monthly' : `f-monthly-${i}`}
                          inputMode="numeric"
                          autoComplete="off"
                          aria-invalid={Boolean(errors.monthly)}
                          className={cx(control, 'tnum h-10 px-2.5 text-[13px]')}
                          value={groupDigits(form.monthly[i] ?? '')}
                          onChange={(e) => {
                            const next = [...form.monthly]
                            next[i] = groupDigits(e.target.value)
                            set('monthly', next)
                          }}
                          onPaste={(e) => {
                            // Paste a column or row of 12 values (e.g. from a spreadsheet) to fill every month.
                            const vals = e.clipboardData.getData('text').split(/[\s,;\t]+/).map((v) => v.replace(/[^\d.]/g, '')).filter(Boolean)
                            if (vals.length >= 12 && vals.slice(0, 12).every((v) => Number.isFinite(parseNum(v)))) {
                              e.preventDefault()
                              set('monthly', vals.slice(0, 12).map((v) => groupDigits(String(Math.round(parseNum(v))))))
                            }
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {errors.monthly ? (
                    <p id="f-monthly-err" className="mt-1.5 text-[12px] text-neg" role="alert">
                      {errors.monthly}
                    </p>
                  ) : (
                    <p id="f-monthly-hint" className="mt-1.5 text-[12px] text-fg-3">
                      From your last 12 bills. Paste 12 values from a spreadsheet into any box. Adds 17 confidence points and measures your real cooling load.
                    </p>
                  )}
                </fieldset>
              </div>
            )}

            {sub === 3 && (
              <div className="grid gap-6">
                <Field label="Project budget" error={errors.budget} hint="$25,000 – $1,000,000" htmlFor="f-budget" className="sm:max-w-[calc(50%-0.625rem)]">
                  {num('budget', '250,000', { prefix: '$' })}
                </Field>
                <fieldset>
                  <legend className="mb-2 text-[13px] font-medium text-fg">Primary objective</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {OBJECTIVES.map((o) => {
                      const on = form.objective === o
                      return (
                        <label
                          key={o}
                          className={cx(
                            'flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 transition-[box-shadow] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--brand-text)]',
                            on ? 'neu-inset' : 'neu-raised-sm',
                          )}
                        >
                          <input
                            type="radio"
                            name="objective"
                            value={o}
                            checked={on}
                            onChange={() => set('objective', o)}
                            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                          />
                          <span>
                            <span className={cx('block text-[14px] font-medium', on ? 'text-brand-text' : 'text-fg')}>{o}</span>
                            <span className="block text-[12px] text-fg-2">{OBJECTIVE_HELP[o]}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-line/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {sub > 0 ? (
              <Button variant="secondary" onClick={() => go(sub - 1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
            ) : (
              <span className="text-[12px] text-fg-3">All fields can be changed later.</span>
            )}
            <Button type="submit" tour={sub === last ? 'intake-analyze' : 'intake-continue'}>
              {sub === last ? 'Analyze building' : `Continue to ${INTAKE_SECTIONS[sub + 1].title.toLowerCase()}`}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
