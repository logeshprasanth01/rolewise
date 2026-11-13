'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

export interface ProcessingStep {
  label: string;
}

interface ProcessingDialogProps {
  open: boolean;
  title: string;
  /** Optional one-line reassurance under the title, e.g. the file name. */
  subtitle?: string;
  steps: ProcessingStep[];
  /** Index of the step currently running. Steps before it render as done. */
  activeStep: number;
  /** When true, the bar fills to 100% and every step is marked done. */
  complete?: boolean;
  /** Show a close control. Only pass when closing is safe (nothing to lose). */
  onClose?: () => void;
}

/**
 * Stepped progress dialog for work the user has to wait on (resume reading,
 * role analysis). Progress is tied to real stages: each step owns a slice of
 * the bar, and inside the active slice the bar eases toward — but never
 * reaches — the slice end, so it can't promise more than has really happened.
 */
export function ProcessingDialog(props: ProcessingDialogProps) {
  // Mount the panel only while open so progress state starts fresh each time.
  if (!props.open) return null;
  return <ProcessingPanel {...props} />;
}

function ProcessingPanel({
  title,
  subtitle,
  steps,
  activeStep,
  complete = false,
  onClose,
}: ProcessingDialogProps) {
  const progress = useStagedProgress(steps.length, activeStep, complete);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pct = Math.round(progress);
  const currentLabel = complete ? 'Done' : steps[Math.min(activeStep, steps.length - 1)]?.label;

  return (
    <div className="rw-processing-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rw-processing-title"
        tabIndex={-1}
        className="rw-processing-panel relative w-full max-w-[440px] rounded-[28px] bg-[#FFFFFF] px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12 shadow-[0_30px_80px_-20px_rgba(37,37,37,0.35)] outline-none"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="absolute right-4 top-4 touch-target rounded-full text-[#73757A] hover:text-[#252525] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon tile — warm brand gradient with grain, list glyph that "fills in" as steps complete */}
        <div className="rw-processing-tile mx-auto mb-7 h-[104px] w-[104px] rounded-[26px] flex items-center justify-center">
          <div className="flex flex-col gap-[7px]" aria-hidden="true">
            {[0, 1, 2, 3].map((row) => {
              const lit = complete || row < activeStep || row === activeStep;
              return (
                <div key={row} className="flex items-center gap-[7px]">
                  <span
                    className={`h-[8px] w-[8px] rounded-full transition-all duration-500 ${
                      lit ? 'bg-white' : 'bg-white/45'
                    }`}
                  />
                  <span
                    className={`h-[8px] rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      lit ? 'bg-white' : 'bg-white/45'
                    }`}
                    style={{ width: row === 3 ? 34 : 46 }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <h2
          id="rw-processing-title"
          className="text-center text-[22px] sm:text-[24px] font-semibold tracking-[-0.01em] text-[#252525]"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-center text-xs text-[#73757A] truncate" title={subtitle}>
            {subtitle}
          </p>
        )}

        {/* Progress */}
        <div className="mt-6">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${pct}% — ${currentLabel}`}
            className="relative h-2 w-full overflow-hidden rounded-full bg-[#F1EEE2]"
          >
            <div
              className="rw-processing-fill absolute inset-y-0 left-0 rounded-full bg-[#252525]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-center text-[15px] font-semibold text-[#252525] tabular-nums">
            {pct}% completed
          </p>
        </div>

        {/* Steps */}
        <ol className="mt-6 space-y-3.5 mx-auto w-fit" aria-live="polite">
          {steps.map((step, i) => {
            const state = complete || i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo';
            return (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {state === 'done' && (
                    <span className="rw-step-done flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#252525]">
                      <Check className="h-3 w-3 text-[#FFD84D]" strokeWidth={3} />
                    </span>
                  )}
                  {state === 'active' && (
                    <>
                      <span className="rw-step-ring absolute inset-[-3px] rounded-full bg-[#FFD84D]/60" />
                      <span className="relative h-3 w-3 rounded-full bg-[#252525] ring-[3px] ring-[#FFD84D]" />
                    </>
                  )}
                  {state === 'todo' && <span className="h-2 w-2 rounded-full bg-[#DCD9CC]" />}
                </span>
                <span
                  className={`transition-colors duration-300 ${
                    state === 'todo' ? 'text-[#9A9B9E]' : state === 'active' ? 'text-[#252525] font-medium' : 'text-[#55565A]'
                  }`}
                >
                  {step.label}
                </span>
                {state === 'active' && <span className="sr-only">(in progress)</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * Each step owns an equal slice of 0–96%. Inside the active slice the bar
 * eases toward 92% of that slice so slow AI calls still feel alive without
 * over-promising. `complete` jumps to 100.
 */
function useStagedProgress(stepCount: number, activeStep: number, complete: boolean) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const slice = 96 / Math.max(stepCount, 1);

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const target = complete
        ? 100
        : Math.min(slice * activeStep + slice * 0.92, 96);
      const floor = complete ? 0 : slice * activeStep;
      let v = Math.max(valueRef.current, floor * 0.98);
      // Faster catch-up when we're far behind (a step just finished), slow crawl near target.
      const rate = complete ? 0.012 : target - v > slice * 0.5 ? 0.006 : 0.0016;
      v = v + (target - v) * (1 - Math.exp(-rate * dt));
      if (complete && 100 - v < 0.4) v = 100;
      valueRef.current = v;
      setValue(v);
      if (!(complete && v >= 100)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepCount, activeStep, complete]);

  return value;
}
