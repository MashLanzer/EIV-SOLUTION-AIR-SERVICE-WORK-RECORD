import { WorkerNav } from "@/components/layout/WorkerNav";
import { requireAuth } from "@/lib/session";

export default async function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav name={session.user.name ?? session.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
