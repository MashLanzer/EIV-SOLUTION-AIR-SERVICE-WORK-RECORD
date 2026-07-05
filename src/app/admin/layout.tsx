import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar name={session.user.name ?? session.user.email ?? ""} />
      <main className="max-w-6xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:ml-60 sm:px-8 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
