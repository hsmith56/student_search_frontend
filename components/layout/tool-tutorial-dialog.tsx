"use client"

import { useMemo, useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { TOOL_TUTORIAL_STEPS, type ToolTutorialStep } from "@/components/layout/tool-tutorial-content"

const FALLBACK_STEP: ToolTutorialStep = {
  title: "Welcome",
  description: "Add tutorial snippets in components/layout/tool-tutorial-content.ts.",
}

type ToolTutorialDialogProps = {
  triggerLabel?: string
  triggerClassName?: string
  showTriggerIcon?: boolean
}

export function ToolTutorialDialog({
  triggerLabel = "How to use this tool",
  triggerClassName,
  showTriggerIcon = true,
}: ToolTutorialDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const steps = useMemo(
    () => (TOOL_TUTORIAL_STEPS.length > 0 ? TOOL_TUTORIAL_STEPS : [FALLBACK_STEP]),
    []
  )

  const currentStep = steps[Math.min(activeStep, steps.length - 1)]
  const isFirstStep = activeStep === 0
  const isLastStep = activeStep >= steps.length - 1

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setActiveStep(0)
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-2 py-1 text-xs font-semibold text-[var(--brand-body)] shadow-sm transition-colors hover:bg-[var(--brand-surface)]",
            triggerClassName
          )}
        >
          {showTriggerIcon ? <BookOpen className="h-3.5 w-3.5" /> : null}
          <span>{triggerLabel}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="z-[90] mx-auto w-[92vw] max-w-[560px] rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.96)] p-0 backdrop-blur-xl shadow-[0_20px_42px_-28px_rgba(0,53,84,0.8)]">
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
              Quick Overview
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
              Step {Math.min(activeStep + 1, steps.length)} of {steps.length}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-[var(--brand-border-soft)] bg-white/70 p-4">
            <h3 className="text-base font-bold text-[var(--brand-ink)]">{currentStep.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--brand-body)]">
              {currentStep.description}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {steps.map((step, index) => (
              <span
                key={`${step.title}-${index}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeStep
                    ? "w-8 bg-[var(--brand-primary)]"
                    : "w-3 bg-[var(--brand-border-soft)]"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--brand-border-soft)] p-4">
          <button
            type="button"
            onClick={() => setActiveStep((previous) => Math.max(0, previous - 1))}
            disabled={isFirstStep}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--brand-border)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--brand-body)] transition-colors hover:bg-[rgba(0,53,84,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-primary-deep)]"
            >
              Finish
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setActiveStep((previous) => Math.min(steps.length - 1, previous + 1))
              }
              className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--brand-primary-deep)]"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
