import type React from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function FilterCheckbox(props: React.ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      className="size-5 border-slate-500 bg-white shadow-sm data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white focus-visible:ring-blue-300/70"
      {...props}
    />
  );
}
