import type { QuickStatsCard } from "@/features/student-search/types";

type QuickStatsSectionProps = {
  cards: QuickStatsCard[];
};

export function QuickStatsSection({
  cards,
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
      </div>
    </section>
  );
}
