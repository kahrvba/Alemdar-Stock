"use client";

import { useEffect, useRef, useState } from "react";
import type { DeploymentVersion } from "@/lib/app-version";

const REFRESH_COUNTDOWN_SECONDS = 10;
const DRAFT_TTL_MS = 30 * 60 * 1000;

type FieldSnapshot = {
  key: string;
  type: string;
  value?: string;
  checked?: boolean;
};

type DraftSnapshot = {
  savedAt: number;
  fields: FieldSnapshot[];
};

type DeploymentRefreshGuardProps = {
  initialVersion: DeploymentVersion;
};

function getDraftStorageKey() {
  return `alemdar:draft:${window.location.pathname}${window.location.search}`;
}

function getFormKey(element: HTMLElement) {
  const form = element.closest("form");
  if (!form) return "no-form";
  const forms = Array.from(document.querySelectorAll("form"));
  const index = forms.indexOf(form);
  return index >= 0 ? `form-${index}` : "form-unknown";
}

function getFieldKey(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (element.id) return `id:${element.id}`;
  if (element.name) return `name:${getFormKey(element)}:${element.name}`;
  if (element.dataset.draftKey) return `data:${element.dataset.draftKey}`;
  return null;
}

function collectDraftSnapshot(): DraftSnapshot {
  const fields: FieldSnapshot[] = [];
  const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  );

  elements.forEach((element) => {
    const key = getFieldKey(element);
    if (!key) return;
    if (element instanceof HTMLInputElement && element.type === "file") return;

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") {
        fields.push({ key, type: element.type, checked: element.checked });
        return;
      }

      fields.push({ key, type: element.type, value: element.value });
      return;
    }

    fields.push({ key, type: element.tagName.toLowerCase(), value: element.value });
  });

  return {
    savedAt: Date.now(),
    fields,
  };
}

function saveDraftNow() {
  const snapshot = collectDraftSnapshot();
  localStorage.setItem(getDraftStorageKey(), JSON.stringify(snapshot));
}

function restoreDraftIfPresent() {
  const raw = localStorage.getItem(getDraftStorageKey());
  if (!raw) return;

  let snapshot: DraftSnapshot | null = null;
  try {
    snapshot = JSON.parse(raw) as DraftSnapshot;
  } catch {
    localStorage.removeItem(getDraftStorageKey());
    return;
  }

  if (!snapshot || Date.now() - snapshot.savedAt > DRAFT_TTL_MS) {
    localStorage.removeItem(getDraftStorageKey());
    return;
  }

  const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  );

  const byKey = new Map<string, FieldSnapshot>();
  snapshot.fields.forEach((field) => byKey.set(field.key, field));

  elements.forEach((element) => {
    const key = getFieldKey(element);
    if (!key) return;
    const saved = byKey.get(key);
    if (!saved) return;

    if (element instanceof HTMLInputElement && element.type === "file") return;

    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      element.checked = Boolean(saved.checked);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (typeof saved.value === "string") {
      element.value = saved.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

export function DeploymentRefreshGuard({ initialVersion }: DeploymentRefreshGuardProps) {
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const updateTriggeredRef = useRef(false);

  useEffect(() => {
    restoreDraftIfPresent();

    let saveTimer: number | null = null;
    const handleInputEvent = () => {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        saveDraftNow();
      }, 200);
    };

    document.addEventListener("input", handleInputEvent, true);
    document.addEventListener("change", handleInputEvent, true);

    return () => {
      document.removeEventListener("input", handleInputEvent, true);
      document.removeEventListener("change", handleInputEvent, true);
      if (saveTimer !== null) window.clearTimeout(saveTimer);
    };
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/deployment-events");

    stream.addEventListener("deployment", (event) => {
      if (updateTriggeredRef.current) return;

      const payload = JSON.parse((event as MessageEvent).data) as DeploymentVersion;
      if (payload.deploymentKey === initialVersion.deploymentKey) return;

      updateTriggeredRef.current = true;
      saveDraftNow();
      setRefreshCountdown(REFRESH_COUNTDOWN_SECONDS);
    });

    return () => {
      stream.close();
    };
  }, [initialVersion.deploymentKey]);

  useEffect(() => {
    if (refreshCountdown === null) return;

    if (refreshCountdown <= 0) {
      saveDraftNow();
      window.location.reload();
      return;
    }

    saveDraftNow();

    countdownTimerRef.current = window.setTimeout(() => {
      setRefreshCountdown((current) => (current === null ? current : current - 1));
    }, 1000);

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearTimeout(countdownTimerRef.current);
      }
    };
  }, [refreshCountdown]);

  if (refreshCountdown === null) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center shadow-2xl"
      >
        <p className="text-lg font-semibold text-foreground">New update avalaible</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Saving all changs, reload in {refreshCountdown} S
        </p>
      </div>
    </div>
  );
}
