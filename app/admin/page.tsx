import { notFound } from "next/navigation";
import AdminPage from "@/features/admin/admin-page";
import { ENABLE_ADMIN_PANEL } from "@/lib/feature-flags";

export default function AdminRoute() {
  if (!ENABLE_ADMIN_PANEL) {
    notFound();
  }

  return <AdminPage />;
}
