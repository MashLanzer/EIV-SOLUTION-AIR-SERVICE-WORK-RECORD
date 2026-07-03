import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar name={session.user.name ?? session.user.username} />
      <main className="max-w-6xl px-4 py-6 sm:ml-60 sm:px-8">{children}</main>
    </div>
  );
}
