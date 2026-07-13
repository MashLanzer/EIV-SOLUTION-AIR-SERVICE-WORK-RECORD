"use client";

import { useState } from "react";
import { Plus, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrgSkillAction, deleteOrgSkillAction } from "@/actions/orgSkills";
import { useT } from "@/components/i18n/LocaleProvider";

interface Skill {
  id: string;
  name: string;
}

// Admin-curated skill catalog: chips with a remove button plus an add field.
// The list re-renders from the server (revalidatePath) after each change.
export function OrgSkillsManager({ skills }: { skills: Skill[] }) {
  const t = useT().settings.skillsCatalog;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300"
            >
              <Wrench className="h-3 w-3 shrink-0 text-neutral-400" />
              {s.name}
              <button
                type="button"
                onClick={() => deleteOrgSkillAction(s.id)}
                className="ml-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label={t.removeAria.replace("{name}", s.name)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.empty}</p>
      )}

      <form
        action={async (formData) => {
          setError(null);
          const res = await createOrgSkillAction(undefined, formData);
          if (res?.error) setError(res.error);
          else setValue("");
        }}
        onSubmit={(e) => {
          if (!value.trim()) e.preventDefault();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <Input
            name="name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            <Plus className="h-4 w-4" />
            {t.add}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}
      </form>
    </div>
  );
}
