import type React from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function FilterCheckbox(props: React.ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      className="size-5 border-[var(--brand-muted)] bg-[var(--brand-surface-elevated)] shadow-sm data-[state=checked]:border-[var(--brand-primary)] data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:text-white focus-visible:ring-[rgba(0,94,184,0.38)]"
      {...props}
    />
  );
}
