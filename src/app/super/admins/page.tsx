import { redirect } from "next/navigation";
import { Mail, ShieldCheck, Trash2, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AddPlatformAdminForm } from "@/components/super/AddPlatformAdminForm";
import { notifyPlatformAdminAction, removePlatformAdminAction } from "@/actions/platformAdmins";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { listPlatformAdmins } from "@/lib/platformAdmins";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function SuperAdminsPage() {
  // Only env-allowlist owners manage the admin list. A DB-granted admin has
  // console access but is bounced back to the overview here.
  const { email, isOwner } = await requireSuperAdmin();
  if (!isOwner) redirect("/super");

  const admins = await listPlatformAdmins();
  const canEmail = emailConfigured();
  const envOwners = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Platform admins
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Grant console access by email. Added admins can manage every company but
          can&apos;t add or remove other admins.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <AddPlatformAdminForm />
        </CardContent>
      </Card>
      {canEmail ? (
        <p className="px-1 text-xs text-neutral-400 dark:text-neutral-500">
          Added admins are emailed an invite automatically. Use Notify to resend it.
        </p>
      ) : (
        <p className="px-1 text-xs text-warning-text">
          Email isn&apos;t set up (RESEND_API_KEY / RESEND_FROM), so admins won&apos;t be
          notified automatically — share the sign-in link with them yourself.
        </p>
      )}

      {/* Env allowlist owners: the trust root, managed in the hosting env var. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Owners
        </h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {envOwners.map((owner) => (
              <div key={owner} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">
                    {owner}
                    {owner.toLowerCase() === email.toLowerCase() && (
                      <span className="ml-1.5 text-xs text-neutral-400">(you)</span>
                    )}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  Owner
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-neutral-400 dark:text-neutral-500">
          Owners are set in the SUPER_ADMIN_EMAILS environment variable and can&apos;t be
          removed here.
        </p>
      </section>

      {/* Admins granted from this panel. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Added admins ({admins.length})
        </h2>
        {admins.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState icon={UserCog} title="No admins added yet" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-neutral-900 dark:text-neutral-100">{a.email}</div>
                    <div className="truncate text-xs text-neutral-400">
                      Added {dateFmt.format(a.createdAt)}
                      {a.invitedBy ? ` · by ${a.invitedBy}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEmail && (
                      <form action={notifyPlatformAdminAction.bind(null, a.id)}>
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          aria-label={`Notify ${a.email}`}
                        >
                          <Mail className="h-4 w-4" />
                          <span className="hidden sm:inline">Notify</span>
                        </Button>
                      </form>
                    )}
                    <form action={removePlatformAdminAction.bind(null, a.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-destructive-text"
                        aria-label={`Remove ${a.email}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
