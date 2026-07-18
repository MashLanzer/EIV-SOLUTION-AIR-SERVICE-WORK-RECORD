"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createInvoiceAction,
  updateInvoiceAction,
  type InvoiceFormState,
} from "@/actions/invoices";
import { computeTotals } from "@/lib/invoices";
import { useBeforeUnloadGuard } from "@/hooks/useBeforeUnloadGuard";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// A grouped section: a bordered Card on pages; a plain stacked block inside a
// bottom sheet (fullWidth), so the sheet matches the card-less project/worker/
// team forms instead of nesting a card inside the sheet.
function FormBox({
  fullWidth,
  gap,
  children,
}: {
  fullWidth: boolean;
  gap: string;
  children: ReactNode;
}) {
  if (fullWidth) return <div className={cn("flex flex-col", gap)}>{children}</div>;
  return (
    <Card>
      <CardContent className={cn("flex flex-col p-4", gap)}>{children}</CardContent>
    </Card>
  );
}

interface Row {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceCustomerOption {
  id: string;
  name: string;
  address: string;
}

export interface InvoiceFormValues {
  customerId: string;
  customerName: string;
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  items: { description: string; quantity: string; unitPrice: string }[];
}

let rowSeq = 0;
function newRow(init?: Partial<Row>): Row {
  rowSeq += 1;
  return {
    key: `r${rowSeq}`,
    description: init?.description ?? "",
    quantity: init?.quantity ?? "1",
    unitPrice: init?.unitPrice ?? "0",
  };
}

export function InvoiceForm({
  invoiceId,
  customers,
  currency,
  defaultValues,
  fullWidth = false,
}: {
  invoiceId?: string;
  customers: InvoiceCustomerOption[];
  currency: string;
  defaultValues: InvoiceFormValues;
  // Flatten the cards + stretch the submit for use inside a bottom sheet.
  fullWidth?: boolean;
}) {
  const t = useT().invoices;
  const action = invoiceId
    ? updateInvoiceAction.bind(null, invoiceId)
    : createInvoiceAction;
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(
    action,
    undefined
  );

  const [customerId, setCustomerId] = useState(defaultValues.customerId);
  const [customerName, setCustomerName] = useState(defaultValues.customerName);
  const [customerAddress, setCustomerAddress] = useState(defaultValues.customerAddress);
  const [taxRate, setTaxRate] = useState(defaultValues.taxRate);
  const [rows, setRows] = useState<Row[]>(
    defaultValues.items.length > 0
      ? defaultValues.items.map((it) => newRow(it))
      : [newRow()]
  );
  const [dirty, setDirty] = useState(false);
  useBeforeUnloadGuard(dirty && !pending);

  const markDirty = () => setDirty(true);
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  function onPickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerAddress(c.address);
    }
    markDirty();
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    markDirty();
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()]);
    markDirty();
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
    markDirty();
  }

  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const totals = useMemo(
    () =>
      computeTotals(
        rows.map((r) => ({ quantity: Number(r.quantity), unitPrice: Number(r.unitPrice) })),
        Number(taxRate)
      ),
    [rows, taxRate]
  );

  // Only non-empty descriptions are billed; serialized for the server action.
  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.description.trim())
      .map((r) => ({
        description: r.description.trim(),
        quantity: Number(r.quantity) || 0,
        unitPrice: Number(r.unitPrice) || 0,
      }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="customerId" value={customerId} />

      <FormBox fullWidth={fullWidth} gap="gap-4">
          {customers.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerPick">{t.customer}</Label>
              <Select
                id="customerPick"
                value={customerId}
                onChange={(e) => onPickCustomer(e.target.value)}
              >
                <option value="">{t.pickCustomer}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerName">{t.customerName}</Label>
              <Input
                id="customerName"
                name="customerName"
                required
                autoFocus={fullWidth}
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  markDirty();
                }}
                aria-invalid={err("customerName") ? true : undefined}
              />
              <FieldError id="customerName-error" message={err("customerName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerAddress">{t.customerAddress}</Label>
              <Input
                id="customerAddress"
                name="customerAddress"
                value={customerAddress}
                onChange={(e) => {
                  setCustomerAddress(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="issueDate">{t.issueDate}</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                defaultValue={defaultValues.issueDate}
                aria-invalid={err("issueDate") ? true : undefined}
              />
              <FieldError id="issueDate-error" message={err("issueDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">{t.dueDate}</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={defaultValues.dueDate}
              />
            </div>
          </div>
      </FormBox>

      {/* Line items */}
      <FormBox fullWidth={fullWidth} gap="gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.lineItems}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              {t.addLine}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const amount = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
              return (
                <div
                  key={r.key}
                  className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_5rem_7rem_6rem_auto] sm:items-center"
                >
                  <Input
                    aria-label={t.descriptionPlaceholder}
                    placeholder={t.descriptionPlaceholder}
                    value={r.description}
                    onChange={(e) => updateRow(r.key, { description: e.target.value })}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Input
                    aria-label={t.qty}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    className="tabular-nums"
                  />
                  <Input
                    aria-label={t.unitPrice}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={r.unitPrice}
                    onChange={(e) => updateRow(r.key, { unitPrice: e.target.value })}
                    className="tabular-nums"
                  />
                  <span className="hidden text-right text-sm tabular-nums text-neutral-700 dark:text-neutral-200 sm:block">
                    {money(amount)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t.removeLine}
                    onClick={() => removeRow(r.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Totals + tax rate */}
          <div className="mt-1 flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.subtotal}</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor="taxRate" className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                {t.tax}
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => {
                    setTaxRate(e.target.value);
                    markDirty();
                  }}
                  className="h-8 w-20 tabular-nums"
                  aria-label={t.taxRate}
                />
                %
              </label>
              <span className="tabular-nums">{money(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>{t.total}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>
      </FormBox>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t.notes}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues.notes}
          onChange={markDirty}
        />
      </div>

      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div className={cn(fullWidth && "flex flex-col")}>
        <Button type="submit" disabled={pending} className={cn(fullWidth && "w-full")}>
          <Save className="h-4 w-4" />
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
