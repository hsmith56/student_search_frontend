import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <section className="mb-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className={`group min-h-[148px] rounded-xl border p-4 text-left shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-20px_rgba(15,23,42,0.85)] ${card.cardClass}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {card.label}
              </p>
              <card.icon className={`h-[18px] w-[18px] ${card.iconClass}`} />
            </div>
            <p className="mt-7 text-[2rem] font-semibold leading-none text-slate-900">
              {card.value}
            </p>
            <p className="mt-5 text-[11px] font-medium text-slate-500 group-hover:text-slate-700">
              View list
            </p>
          </button>
        ))}

        <div className="flex min-h-[148px] flex-col rounded-xl border border-slate-300/90 bg-white/95 p-4 shadow-[0_5px_14px_-12px_rgba(15,23,42,0.75)]">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Star className="h-4 w-4 text-slate-700" />
            Tips & Feedback
          </h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
            {searchTips.slice(0, 2).map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <span className="mt-[7px] block h-1 w-1 flex-shrink-0 rounded-full bg-slate-500" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={onOpenFeedback}
            className="mt-auto h-9 w-full bg-slate-900 text-sm text-white hover:bg-slate-800"
          >
            Open feedback form
          </Button>
        </div>
      </div>
    </section>
  );
}
