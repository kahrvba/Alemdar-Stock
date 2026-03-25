"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ArduinoCategoryField =
  | "category"
  | "category_layer_1"
  | "category_layer_2";

export type ArduinoCategoryOption = {
  id: number;
  label: string;
};

type ArduinoCategoryOptionsMap = Record<
  ArduinoCategoryField,
  ArduinoCategoryOption[]
>;

type CategoryOptionsManagerProps = {
  options: ArduinoCategoryOptionsMap;
  onAddOption: (field: ArduinoCategoryField, label: string) => Promise<void>;
  onDeleteOption: (field: ArduinoCategoryField, optionId: number) => Promise<void>;
  isBusy?: boolean;
};

export type CategoryOptionsManagerHandle = {
  submitActiveDraft: () => Promise<void>;
};

const FIELD_LABELS: Record<ArduinoCategoryField, string> = {
  category: "Category",
  category_layer_1: "Layer 1",
  category_layer_2: "Layer 2",
};

export const CategoryOptionsManager = forwardRef<
  CategoryOptionsManagerHandle,
  CategoryOptionsManagerProps
>(function CategoryOptionsManager(
  {
    options,
    onAddOption,
    onDeleteOption,
    isBusy = false,
  },
  ref
) {
  const [activeField, setActiveField] =
    useState<ArduinoCategoryField>("category");
  const [drafts, setDrafts] = useState<Record<ArduinoCategoryField, string>>({
    category: "",
    category_layer_1: "",
    category_layer_2: "",
  });

  const submitDraft = async (fieldName: ArduinoCategoryField) => {
    const label = drafts[fieldName].trim();
    if (!label || isBusy) return;
    await onAddOption(fieldName, label);
    setDrafts((current) => ({ ...current, [fieldName]: "" }));
  };

  useImperativeHandle(
    ref,
    () => ({
      submitActiveDraft: async () => {
        await submitDraft(activeField);
      },
    }),
    [activeField, drafts, isBusy, onAddOption]
  );

  return (
    <section className="h-full w-full rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="flex h-full flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Category Lists
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Save once here, then use the dropdown in every Arduino form.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIELD_LABELS) as ArduinoCategoryField[]).map((fieldName) => (
            <button
              key={fieldName}
              type="button"
              onClick={() => setActiveField(fieldName)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
                activeField === fieldName
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {FIELD_LABELS[fieldName]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={drafts[activeField]}
            placeholder={`Add ${FIELD_LABELS[activeField]}`}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [activeField]: event.target.value,
              }))
            }
            className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <Button
            type="button"
            size="sm"
            className="sm:min-w-24"
            disabled={isBusy || !drafts[activeField].trim()}
            onClick={() => void submitDraft(activeField)}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="min-h-0 flex-1 rounded-xl border border-border/50 bg-background/60 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {FIELD_LABELS[activeField]}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {options[activeField].length} saved
            </span>
          </div>

          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
            {options[activeField].length > 0 ? (
              options[activeField].map((option) => (
                <div
                  key={option.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground"
                >
                  <span className="max-w-[12rem] truncate">{option.label}</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDeleteOption(activeField, option.id)}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label={`Delete ${option.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <span className="px-1 text-xs text-muted-foreground">
                No saved options yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
