import { WorkerNav } from "@/components/layout/WorkerNav";
import { requireAuth } from "@/lib/session";

export default async function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800">
      <WorkerNav name={session.user.name ?? session.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
