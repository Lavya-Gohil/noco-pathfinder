import { useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  BUILDING_TYPES,
  COOLING_SYSTEMS,
  HEATING_SYSTEMS,
  OBJECTIVES,
  type BuildingForm,
  type Objective,
} from '../types'
import { DEMO_FORM, EMPTY_FORM, US_STATES, groupDigits, validate, type FormErrors } from '../utils/building'
import { Button, PageHeader, cx } from '../components/ui'

const OBJECTIVE_HELP: Record<Objective, string> = {
  'Fastest Payback': 'Prioritize short payback periods',
  Balanced: 'Weigh savings, payback and sequencing',
  'Maximum Savings': 'Prioritize annual savings',
  'Deep Retrofit': 'Prioritize energy and carbon reduction',
}

type NumericKey = 'sqft' | 'elecCost' | 'heatCost' | 'kwh' | 'budget'

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
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-fg">
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

const control = (err?: string) =>
  cx(
    'h-10 w-full rounded-lg border bg-surface px-3 text-[14px] text-fg transition-[border-color,box-shadow] duration-150 placeholder:text-fg-3 focus:outline-none focus:ring-[3px]',
    err
      ? 'border-neg focus:ring-[color-mix(in_srgb,var(--neg)_20%,transparent)]'
      : 'border-line-strong hover:border-fg-3 focus:border-brand focus:ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]',
  )

function Affix({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px] text-fg-3">{prefix}</span>
      )}
      {children}
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-fg-3">{suffix}</span>
      )}
    </div>
  )
}

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-10 gap-y-4 border-t border-line px-5 py-6 first:border-t-0 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div>
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function IntakePage({
  form,
  setForm,
  onSubmit,
}: {
  form: BuildingForm
  setForm: (f: BuildingForm) => void
  onSubmit: () => void
}) {
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof BuildingForm>(k: K, v: BuildingForm[K]) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (submitted) setErrors(validate(next))
  }

  const loadDemo = () => {
    setForm(DEMO_FORM)
    setErrors({})
  }

  const clear = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitted(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onSubmit()
    else document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus()
  }

  const num = (k: NumericKey, placeholder: string, opts: { prefix?: string; suffix?: string } = {}) => (
    <Affix prefix={opts.prefix} suffix={opts.suffix}>
      <input
        id={`f-${k}`}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `f-${k}-err` : undefined}
        className={cx(control(errors[k]), 'tnum', opts.prefix && 'pl-7', opts.suffix && 'pr-16')}
        value={groupDigits(form[k])}
        placeholder={placeholder}
        onChange={(e) => set(k, groupDigits(e.target.value))}
      />
    </Affix>
  )

  const errCount = Object.keys(errors).length

  return (
    <div>
      <PageHeader
        title="Building assessment"
        description="Enter the information available for this property. Estimates improve as more building data is provided."
        actions={
          <>
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
            <Button variant="secondary" onClick={loadDemo}>
              Load demo building
            </Button>
          </>
        }
      />

      <form onSubmit={submit} noValidate className="rounded-[10px] border border-line bg-surface">
        <Group title="Property" description="Identifies the building and sets the baseline for size- and age-based estimates.">
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Building name" error={errors.name} htmlFor="f-name" className="sm:col-span-6">
              <input id="f-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'f-name-err' : undefined} className={control(errors.name)} value={form.name} placeholder="e.g. Riverside Commerce Center" onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="City" error={errors.city} htmlFor="f-city" className="sm:col-span-4">
              <input id="f-city" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'f-city-err' : undefined} className={control(errors.city)} value={form.city} placeholder="City" onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="State" error={errors.state} htmlFor="f-state" className="sm:col-span-2">
              <select id="f-state" aria-invalid={Boolean(errors.state)} className={control(errors.state)} value={form.state} onChange={(e) => set('state', e.target.value)}>
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Building type" error={errors.type} htmlFor="f-type" className="sm:col-span-2">
              <select id="f-type" aria-invalid={Boolean(errors.type)} className={control(errors.type)} value={form.type} onChange={(e) => set('type', e.target.value as BuildingForm['type'])}>
                <option value="">Select</option>
                {BUILDING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Square footage" error={errors.sqft} htmlFor="f-sqft" className="sm:col-span-2">
              {num('sqft', '85,000', { suffix: 'sq ft' })}
            </Field>
            <Field label="Year built" optional error={errors.yearBuilt} htmlFor="f-yearBuilt" className="sm:col-span-2">
              <input id="f-yearBuilt" inputMode="numeric" maxLength={4} aria-invalid={Boolean(errors.yearBuilt)} aria-describedby={errors.yearBuilt ? 'f-yearBuilt-err' : undefined} className={cx(control(errors.yearBuilt), 'tnum')} value={form.yearBuilt} placeholder="1988" onChange={(e) => set('yearBuilt', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
        </Group>

        <Group title="Building systems" description="Primary heating and cooling equipment. Choose “Not Sure” if unknown.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Heating" error={errors.heating} htmlFor="f-heating">
              <select id="f-heating" aria-invalid={Boolean(errors.heating)} className={control(errors.heating)} value={form.heating} onChange={(e) => set('heating', e.target.value as BuildingForm['heating'])}>
                <option value="">Select</option>
                {HEATING_SYSTEMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Cooling" error={errors.cooling} htmlFor="f-cooling">
              <select id="f-cooling" aria-invalid={Boolean(errors.cooling)} className={control(errors.cooling)} value={form.cooling} onChange={(e) => set('cooling', e.target.value as BuildingForm['cooling'])}>
                <option value="">Select</option>
                {COOLING_SYSTEMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
        </Group>

        <Group title="Energy" description="Annual utility spend from the last 12 months of bills. Usage in kWh improves accuracy.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Electricity cost" error={errors.elecCost} htmlFor="f-elecCost">
              {num('elecCost', '118,000', { prefix: '$', suffix: 'per year' })}
            </Field>
            <Field label="Heating / natural gas cost" error={errors.heatCost} htmlFor="f-heatCost">
              {num('heatCost', '54,000', { prefix: '$', suffix: 'per year' })}
            </Field>
            <Field label="Electricity usage" optional error={errors.kwh} hint="Improves data confidence" htmlFor="f-kwh" className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
              {num('kwh', '720,000', { suffix: 'kWh / yr' })}
            </Field>
          </div>
        </Group>

        <Group title="Planning" description="Available capital and what matters most. Both can be adjusted on the strategy screen.">
          <div className="grid gap-5">
            <Field label="Project budget" error={errors.budget} hint="$25,000 – $1,000,000" htmlFor="f-budget" className="sm:max-w-[calc(50%-0.5rem)]">
              {num('budget', '250,000', { prefix: '$' })}
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg">Primary objective</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {OBJECTIVES.map((o) => {
                  const on = form.objective === o
                  return (
                    <label
                      key={o}
                      className={cx(
                        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[color-mix(in_srgb,var(--brand)_25%,transparent)]',
                        on ? 'border-brand bg-brand-soft' : 'border-line-strong hover:border-fg-3',
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
                        <span className="block text-[14px] font-medium text-fg">{o}</span>
                        <span className="block text-[12px] text-fg-2">{OBJECTIVE_HELP[o]}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>
        </Group>

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface-2/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[13px] text-fg-2">
            {errCount > 0 ? (
              <span className="text-neg">
                {errCount} field{errCount > 1 ? 's need' : ' needs'} attention.
              </span>
            ) : (
              'Runs locally in your browser. No data leaves this device.'
            )}
          </p>
          <Button type="submit">
            Analyze building <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  )
}
