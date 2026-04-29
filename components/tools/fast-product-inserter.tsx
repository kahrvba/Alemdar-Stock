"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";

type FieldType = "text" | "number" | "textarea" | "checkbox";

type ToolField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
};

type SectionConfig = {
  key: string;
  label: string;
  endpoint: string;
  fields: ToolField[];
};

const SECTION_CONFIG: SectionConfig[] = [
  {
    key: "arduino",
    label: "Arduino",
    endpoint: "/api/arduino",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "category_layer_1", label: "Category Layer 1", type: "text" },
      { key: "category_layer_2", label: "Category Layer 2", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "mainled",
    label: "Cable",
    endpoint: "/api/mainSideLeds",
    fields: [
      { key: "english_name", label: "English Name", type: "text", required: true },
      { key: "turkish_name", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "sound",
    label: "Sound",
    endpoint: "/api/sound",
    fields: [
      { key: "english_name", label: "English Name", type: "text", required: true },
      { key: "turkish_name", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "sub_category", label: "Sub Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "kodu", label: "Kodu", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "batteries",
    label: "Batteries",
    endpoint: "/api/batteries",
    fields: [
      { key: "model", label: "Model", type: "text", required: true },
      { key: "volt", label: "Volt", type: "number", required: true },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
    ],
  },
  {
    key: "fans",
    label: "Fans",
    endpoint: "/api/fans",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "others",
    label: "Others",
    endpoint: "/api/others",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "electric",
    label: "Electric",
    endpoint: "/api/electric",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "adapters",
    label: "Adapters",
    endpoint: "/api/adapters",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "chargers",
    label: "Chargers",
    endpoint: "/api/chargers",
    fields: [
      { key: "english_names", label: "English Name", type: "text", required: true },
      { key: "turkish_names", label: "Turkish Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "solardb",
    label: "Solar",
    endpoint: "/api/solar",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "rating", label: "Rating", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "is_new", label: "Is New", type: "checkbox" },
      { key: "factory_price", label: "Factory Price", type: "number" },
      { key: "factor", label: "Factor", type: "number" },
      { key: "cost_price", label: "Cost Price", type: "number" },
      { key: "wholesale_price", label: "Wholesale Price", type: "number" },
      { key: "min_selling_price", label: "Min Selling Price", type: "number" },
      { key: "selling_price", label: "Selling Price", type: "number" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "mexxsun",
    label: "Mexxsun",
    endpoint: "/api/mexxsun",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "rating", label: "Rating", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "is_new", label: "Is New", type: "checkbox" },
      { key: "factory_price", label: "Factory Price", type: "number" },
      { key: "factor", label: "Factor", type: "number" },
      { key: "cost_price", label: "Cost Price", type: "number" },
      { key: "wholesale_price", label: "Wholesale Price", type: "number" },
      { key: "min_selling_price", label: "Min Selling Price", type: "number" },
      { key: "selling_price", label: "Selling Price", type: "number" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "tv_remotes",
    label: "TV Remotes",
    endpoint: "/api/tv-remotes",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "brand", label: "Brand", type: "text", required: true },
      { key: "category", label: "Category", type: "text", required: true },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "specs", label: "Specs (JSON)", type: "textarea" },
      { key: "image_filename", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "filaments",
    label: "Filaments",
    endpoint: "/api/filaments",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "brand", label: "Brand", type: "text", required: true },
      { key: "material", label: "Material", type: "text", required: true },
      { key: "color", label: "Color", type: "text", required: true },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "variant", label: "Variant", type: "text" },
      { key: "net_weight_kg", label: "Net Weight KG", type: "number" },
      { key: "diameter_mm", label: "Diameter MM", type: "number" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "image_filename", label: "Image URL", type: "text" },
    ],
  },
];

const toInitialState = (fields: ToolField[]) =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.type === "checkbox" ? "false" : "";
    if (field.key === "specs") acc[field.key] = "{}";
    return acc;
  }, {});

export function FastProductInserter() {
  const [sectionKey, setSectionKey] = useState(SECTION_CONFIG[0]?.key ?? "arduino");
  const selected = useMemo(
    () => SECTION_CONFIG.find((section) => section.key === sectionKey) ?? SECTION_CONFIG[0],
    [sectionKey]
  );
  const [form, setForm] = useState<Record<string, string>>(() => toInitialState(selected.fields));
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const isSolarLike = sectionKey === "solardb" || sectionKey === "mexxsun";

  const handleSectionChange = (nextSection: string) => {
    const target = SECTION_CONFIG.find((section) => section.key === nextSection);
    if (!target) return;
    setSectionKey(nextSection);
    setForm(toInitialState(target.fields));
  };

  const handleChange = (key: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const isSolarLike = sectionKey === "solardb" || sectionKey === "mexxsun";
      if (!isSolarLike) return next;

      if (key === "factory_price" || key === "factor") {
        const factory = Number(next.factory_price?.trim());
        const factor = Number(next.factor?.trim());

        if (Number.isFinite(factory) && Number.isFinite(factor)) {
          const cost = factory * factor;
          next.cost_price = cost.toFixed(2);
          next.wholesale_price = (cost * 1.8).toFixed(2);
          next.min_selling_price = (cost * 1.9).toFixed(2);
          next.selling_price = (cost * 2.0).toFixed(2);
        } else {
          next.cost_price = "";
          next.wholesale_price = "";
          next.min_selling_price = "";
          next.selling_price = "";
        }
      }

      return next;
    });
  };

  const handleSubmit = async () => {
    const missingRequired = selected.fields.find(
      (field) => field.required && !form[field.key]?.trim()
    );
    if (missingRequired) {
      showToast(`${missingRequired.label} is required`, "error");
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const field of selected.fields) {
      const raw = form[field.key] ?? "";
      const trimmed = raw.trim();
      if (field.type === "number") {
        payload[field.key] = trimmed === "" ? null : Number(trimmed);
      } else if (field.key === "specs") {
        if (!trimmed) {
          payload[field.key] = {};
        } else {
          try {
            payload[field.key] = JSON.parse(trimmed);
          } catch {
            showToast("Specs must be valid JSON", "error");
            return;
          }
        }
      } else if (field.type === "checkbox") {
        payload[field.key] = form[field.key] === "true";
      } else {
        payload[field.key] = trimmed === "" ? null : trimmed;
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch(selected.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { id?: number; message?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Insert failed");
      }

      showToast(`Inserted successfully${data?.id ? ` #${data.id}` : ""}`, "success");
      setForm(toInitialState(selected.fields));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Insert failed";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const factorPresets = ["1", "1.12", "1.13", "1.17", "1.30", "1.35"];
  const pricePresets: Record<string, number[]> = {
    wholesale_price: [1.3, 1.4, 1.5, 1.8],
    min_selling_price: [1.4, 1.5, 1.6, 1.7, 1.8, 1.9],
    selling_price: [1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
  };

  const getCostPrice = () => {
    const raw = (form.cost_price ?? "").replace(",", ".").trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const handlePresetMultiplier = (fieldKey: string, multiplier: number) => {
    const cost = getCostPrice();
    if (!Number.isFinite(cost) || cost <= 0) return;
    handleChange(fieldKey, (cost * multiplier).toFixed(2));
  };

  return (
    <section className="p-1">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Fast Product Inserter</h2>
      </div>

      <div className="mb-4">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Section
          <select
            value={sectionKey}
            onChange={(event) => handleSectionChange(event.target.value)}
            className="h-10 cursor-pointer rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {SECTION_CONFIG.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {selected.fields.map((field) => {
          const value = form[field.key] ?? "";
          if (field.type === "checkbox") {
            return (
              <label key={field.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={value === "true"}
                  onChange={(event) => handleChange(field.key, event.target.checked ? "true" : "false")}
                  className="h-4 w-4 cursor-pointer"
                />
                <span>{field.label}</span>
              </label>
            );
          }
          if (field.type === "textarea") {
            return (
              <label key={field.key} className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                {field.label}
                <textarea
                  value={value}
                  onChange={(event) => handleChange(field.key, event.target.value)}
                  rows={3}
                  className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            );
          }

          return (
            <label
              key={field.key}
              className={`flex flex-col gap-1 text-sm text-muted-foreground ${
                isSolarLike &&
                ["factory_price", "factor", "cost_price", "wholesale_price", "min_selling_price", "selling_price"].includes(
                  field.key
                )
                  ? "md:col-span-2"
                  : ""
              }`}
            >
              {field.label}
              <input
                type={field.type}
                value={value}
                onChange={(event) => handleChange(field.key, event.target.value)}
                className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />

              {isSolarLike && field.key === "factor" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {factorPresets.map((preset) => {
                    const active = value === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleChange("factor", preset)}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {isSolarLike && pricePresets[field.key] ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pricePresets[field.key].map((multiplier) => {
                    const currentValue = Number((form[field.key] ?? "").replace(",", "."));
                    const cost = getCostPrice();
                    const currentMultiplier =
                      Number.isFinite(currentValue) && Number.isFinite(cost) && cost > 0
                        ? currentValue / cost
                        : NaN;
                    const active =
                      Number.isFinite(currentMultiplier) &&
                      Math.abs(currentMultiplier - multiplier) < 1e-6;

                    return (
                      <button
                        key={multiplier}
                        type="button"
                        onClick={() => handlePresetMultiplier(field.key, multiplier)}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                        }`}
                      >
                        × {multiplier.toFixed(1)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSaving}
        className="mt-4 h-10 cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Insert Product"}
      </button>
    </section>
  );
}
