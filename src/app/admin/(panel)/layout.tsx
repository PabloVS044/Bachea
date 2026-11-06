import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="flex min-h-dvh min-w-[1100px]">
      <AdminNav email={user.email ?? ""} />
      <div className="min-w-0 flex-1 p-6">{children}</div>
    </div>
  );
}
