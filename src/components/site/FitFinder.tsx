import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lightbulb, MessageCircle, RotateCcw } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import {
  BUDGETS,
  GOALS,
  TIMELINES,
  recommend,
  whatsappLink,
  type BudgetId,
  type FitAnswers,
  type FitRecommendation,
  type GoalId,
  type TimelineId,
} from "@/lib/fit-finder";

type Step = 0 | 1 | 2;

const STEP_TITLES = ["What do you want to get done?", "What budget do you have in mind?", "When do you need it?"] as const;

type Props = { whatsapp: string };

export function FitFinder({ whatsapp }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [budget, setBudget] = useState<BudgetId | null>(null);
  const [timeline, setTimeline] = useState<TimelineId | null>(null);
  const headingId = useId();
  // Readiness flag: the wizard is interactive only once React has attached its handlers.
  const hydrated = useHydrated();

  const complete = goal && budget && timeline;
  const answers: FitAnswers | null = complete ? { goal, budget, timeline } : null;
  const result = answers ? recommend(answers) : null;

  function reset() {
    setGoal(null);
    setBudget(null);
    setTimeline(null);
    setStep(0);
  }

  return (
    <section className="border-b border-border" aria-labelledby={headingId} data-ready={hydrated ? "true" : undefined}>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.35fr] md:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Find your fit</p>
          <h2 id={headingId} className="mt-3 font-display text-2xl font-semibold text-foreground md:text-3xl">
            Not sure where to start? Answer three questions.
          </h2>
          <p className="mt-4 text-muted-foreground">
            You get one honest recommendation with a real price and timeline — the same answer we would
            give you on a call. If a ₹999 template solves it, we will say so before you spend ₹55,000 on an
            app.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["No email needed, nothing is saved", "Prices include the one-time setup charge", "You can still talk to a human after"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {item}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
          {result && answers ? (
            <Result result={result} answers={answers} whatsapp={whatsapp} onReset={reset} />
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                  Step {step + 1} of 3
                </p>
                <ol className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className={
                        i <= step ? "h-1.5 w-8 rounded-full bg-primary" : "h-1.5 w-8 rounded-full bg-border"
                      }
                    />
                  ))}
                </ol>
              </div>

              {step === 0 ? (
                <ChoiceGroup
                  title={STEP_TITLES[0]}
                  name="fit-goal"
                  options={GOALS.map((g) => ({ id: g.id, label: g.label, hint: g.hint }))}
                  value={goal}
                  onChange={(id) => {
                    setGoal(id as GoalId);
                    setStep(1);
                  }}
                />
              ) : step === 1 ? (
                <ChoiceGroup
                  title={STEP_TITLES[1]}
                  name="fit-budget"
                  options={BUDGETS.map((b) => ({ id: b.id, label: b.label }))}
                  value={budget}
                  onChange={(id) => {
                    setBudget(id as BudgetId);
                    setStep(2);
                  }}
                />
              ) : (
                <ChoiceGroup
                  title={STEP_TITLES[2]}
                  name="fit-timeline"
                  options={TIMELINES.map((t) => ({ id: t.id, label: t.label }))}
                  value={timeline}
                  onChange={(id) => setTimeline(id as TimelineId)}
                />
              )}

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Takes about 20 seconds</span>
                )}
                <p className="text-xs text-muted-foreground">
                  {step === 0 && goal ? "Pick again to change" : step < 2 ? "Choose one to continue" : "Choose one to see your fit"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type Option = { id: string; label: string; hint?: string };

function ChoiceGroup({
  title,
  name,
  options,
  value,
  onChange,
}: {
  title: string;
  name: string;
  options: Option[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="font-display text-lg font-semibold text-foreground">{title}</legend>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <label
              key={option.id}
              className={
                active
                  ? "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-primary bg-accent/40 px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
                  : "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-secondary/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
              }
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={active}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={
                  active
                    ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary"
                    : "h-4 w-4 shrink-0 rounded-full border-2 border-border"
                }
              >
                {active ? <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                {option.hint ? <span className="block text-xs text-muted-foreground">{option.hint}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Result({
  result,
  answers,
  whatsapp,
  onReset,
}: {
  result: FitRecommendation;
  answers: FitAnswers;
  whatsapp: string;
  onReset: () => void;
}) {
  const summary = [
    GOALS.find((g) => g.id === answers.goal)!.label,
    BUDGETS.find((b) => b.id === answers.budget)!.label,
    TIMELINES.find((t) => t.id === answers.timeline)!.label,
  ];

  return (
    <div role="status" aria-live="polite">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Our honest recommendation</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-foreground md:text-2xl">{result.headline}</h3>
      <p className="mt-3 text-sm text-muted-foreground md:text-base">{result.why}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {result.facts.map((fact) => (
          <div key={fact.label} className="rounded-xl border border-border bg-secondary/50 p-3">
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{fact.label}</dt>
            <dd className="mt-1 font-display text-sm font-semibold text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {result.caveat ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-chart-4" aria-hidden="true" />
          <span>{result.caveat}</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <PrimaryLink result={result}>
          {result.primary.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryLink>
        <a
          href={whatsappLink(whatsapp, result.message)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Talk it through on WhatsApp
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Based on: <span className="text-foreground">{summary.join(" · ")}</span>
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Start over
        </button>
      </div>
    </div>
  );
}

function PrimaryLink({ result, children }: { result: FitRecommendation; children: ReactNode }) {
  const className =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
  const search = result.primary.search ?? {};
  if (result.primary.to === "/book") {
    return (
      <Link to="/book" search={{ service: search["service"], pkg: search["pkg"] }} className={className}>
        {children}
      </Link>
    );
  }
  if (result.primary.to === "/store") {
    return (
      <Link to="/store" search={{ type: search["type"] }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/contact" className={className}>
      {children}
    </Link>
  );
}
