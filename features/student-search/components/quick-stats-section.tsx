import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolTutorialDialog } from "@/components/layout/tool-tutorial-dialog";
import type { QuickStatsCard } from "@/features/student-search/types";

type QuickStatsSectionProps = {
  cards: QuickStatsCard[];
  searchTips: string[];
  onOpenFeedback: () => void;
};

export function QuickStatsSection({
  cards,
  searchTips,
  onOpenFeedback,
}: QuickStatsSectionProps) {
  const threeCardMobileStarts = ["col-start-1", "col-start-5", "col-start-9"];

  return (
    <section className="mb-4">
      <div className="grid grid-cols-12 gap-2 sm:gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {cards.map((card, index) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className={`group col-span-3 ${
              cards.length === 3 ? threeCardMobileStarts[index] ?? "" : ""
            } sm:col-span-1 sm:col-start-auto flex min-h-[40px] flex-col items-center justify-center rounded-lg border p-1 text-center shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-20px_rgba(0,53,84,0.86)] sm:min-h-[148px] sm:items-stretch sm:justify-start sm:rounded-xl sm:p-4 sm:text-left ${card.cardClass}`}
          >
            <div className="flex items-center gap-1 sm:hidden">
              <card.icon className={`h-3 w-3 ${card.iconClass}`} />
              <p className="text-s font-bold leading-none text-[var(--brand-ink)]">
                {card.value}
              </p>
            </div>
            <p className="sr-only">{card.label}</p>

            <div className="hidden sm:flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
                {card.label}
              </p>
              <card.icon className={`h-[18px] w-[18px] ${card.iconClass}`} />
            </div>
            <p className="hidden sm:block sm:mt-7 sm:text-[2rem] font-semibold leading-none text-[var(--brand-ink)]">
              {card.value}
            </p>
            <p className="hidden sm:block sm:mt-5 sm:text-[11px] font-medium text-[var(--brand-muted)] group-hover:text-[var(--brand-body)]">
              View list
            </p>
          </button>
        ))}

        <div className="col-span-12 flex min-h-[148px] flex-col rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] p-4 shadow-[0_5px_14px_-12px_rgba(0,53,84,0.72)] sm:col-span-1">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)]">
            <Star className="h-4 w-4 text-[var(--brand-primary)]" />
            Tips & Feedback
          </h3>

          <div className="mt-auto space-y-2">
            <ToolTutorialDialog
              triggerLabel="How to use this tool"
              showTriggerIcon={false}
              triggerClassName="h-9 w-full rounded-md border border-[rgba(0,94,184,0.35)] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-deep)] text-sm font-semibold text-white shadow-[0_8px_16px_rgba(0,94,184,0.24)] hover:from-[var(--brand-primary-deep)] hover:to-[var(--brand-primary)]"
            />
            <Button
              onClick={onOpenFeedback}
              className="h-9 w-full bg-gradient-to-r from-[var(--brand-accent)] to-[#ff7b1a] text-sm text-white shadow-[0_8px_16px_rgba(255,87,0,0.22)] hover:from-[#eb4f00] hover:to-[var(--brand-accent)]"
            >
              Open feedback form
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
