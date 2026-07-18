"use client";

import Link from "next/link";
import { useState } from "react";
import { FilePlus2, FileText, Receipt, ReceiptText, type LucideIcon } from "lucide-react";

import { BottomSheet as FormSheet } from "@/components/ui/bottom-sheet";
import { EstimateForm } from "@/components/estimates/EstimateForm";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { useT } from "@/components/i18n/LocaleProvider";

const TILE =
  "flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-3 text-center text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

function TileInner({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </>
  );
}

// The Financials "Quick access" grid. New invoice / New estimate open their
// form in a bottom sheet in place (like the FAB create menu) instead of
// navigating to a /new page; Invoices / Estimates jump to their lists.
export function FinancialsQuickActions({
  customers,
  currency,
  defaultTaxRate,
}: {
  customers: { id: string; name: string; address: string }[];
  currency: string;
  defaultTaxRate: string;
}) {
  const t = useT();
  const [create, setCreate] = useState<"estimate" | "invoice" | null>(null);

  const docDefaults = {
    customerId: "",
    customerName: "",
    customerAddress: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    taxRate: defaultTaxRate,
    notes: "",
    items: [] as { description: string; quantity: string; unitPrice: string }[],
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <button type="button" className={TILE} onClick={() => setCreate("invoice")}>
          <TileInner icon={ReceiptText} label={t.nav.newInvoice} />
        </button>
        <button type="button" className={TILE} onClick={() => setCreate("estimate")}>
          <TileInner icon={FilePlus2} label={t.nav.newEstimate} />
        </button>
        <Link href="/admin/invoices" className={TILE}>
          <TileInner icon={Receipt} label={t.nav.invoices} />
        </Link>
        <Link href="/admin/estimates" className={TILE}>
          <TileInner icon={FileText} label={t.nav.estimates} />
        </Link>
      </div>

      <FormSheet
        open={create === "invoice"}
        onClose={() => setCreate(null)}
        title={t.invoices.newInvoice}
        closeLabel={t.common.close}
      >
        <InvoiceForm customers={customers} currency={currency} defaultValues={docDefaults} fullWidth />
      </FormSheet>
      <FormSheet
        open={create === "estimate"}
        onClose={() => setCreate(null)}
        title={t.estimates.newEstimate}
        closeLabel={t.common.close}
      >
        <EstimateForm customers={customers} currency={currency} defaultValues={docDefaults} fullWidth />
      </FormSheet>
    </>
  );
}
