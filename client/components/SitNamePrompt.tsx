import { useEffect, useState } from "react";
import { hasSitName, normalizeSitName } from "@shared/sitName";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SitNameFields({
  value,
  onChange,
  onSubmit,
  submitLabel = "Continue",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (name: string) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const ready = hasSitName(value);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const next = normalizeSitName(value);
        if (!next) return;
        onSubmit(next);
      }}
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Your name"
        maxLength={24}
        autoFocus={autoFocus}
        autoComplete="nickname"
        aria-label="Sit name"
      />
      <Button variant="gold" type="submit" disabled={!ready} className="w-full sm:w-auto">
        {submitLabel}
      </Button>
      {!ready ? (
        <p className="text-sm text-amber-100/80">Type a name to continue. You need one to join.</p>
      ) : null}
    </form>
  );
}

export function SitNamePrompt({
  open,
  name,
  onName,
  onCommit,
  onHowTo,
  title = "What should we call you?",
  body = "You need a name to join. It is your identity for Stats — Dad and dad are the same row.",
  submitLabel = "Save name",
}: {
  open: boolean;
  name: string;
  onName: (value: string) => void;
  onCommit: (name: string) => void;
  onHowTo?: () => void;
  title?: string;
  body?: string;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (open) setDraft(name);
  }, [open, name]);

  if (!open) return null;

  function update(value: string) {
    setDraft(value);
    onName(value);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-3 sm:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sit-name-title"
        className="w-full max-w-lg rounded-3xl border border-amber-200/30 bg-[#10261c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
          Join the table
        </p>
        <h2 id="sit-name-title" className="font-display mt-2 text-2xl font-extrabold text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">{body}</p>
        <div className="mt-4">
          <SitNameFields
            value={draft}
            onChange={update}
            onSubmit={onCommit}
            submitLabel={submitLabel}
            autoFocus
          />
        </div>
        {onHowTo ? (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-emerald-100/70 underline-offset-2 hover:underline"
            onClick={onHowTo}
          >
            How to play first
          </button>
        ) : null}
      </div>
    </div>
  );
}
