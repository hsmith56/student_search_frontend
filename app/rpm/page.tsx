import { notFound } from "next/navigation";
import RpmPage from "@/features/rpm/rpm-page";
import { ENABLE_RPM } from "@/lib/feature-flags";

export default function RpmRoute() {
  if (!ENABLE_RPM) {
    notFound();
  }

  return <RpmPage />;
}
