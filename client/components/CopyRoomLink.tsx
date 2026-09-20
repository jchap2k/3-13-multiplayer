import { Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function publicRoomUrl(roomCode: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, "")}/?room=${encodeURIComponent(roomCode)}`;
}

export function CopyRoomLink({
  roomCode,
  disabled = false,
}: {
  roomCode: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);

  async function copy() {
    const url = publicRoomUrl(roomCode);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setToast(true);
    window.setTimeout(() => setCopied(false), 1400);
    window.setTimeout(() => setToast(false), 2200);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Button variant="gold" onClick={copy} disabled={disabled}>
          <Link2 className="h-4 w-4" />
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <p className="text-xs text-emerald-100/50">Share the full room URL. No login.</p>
      </div>
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="link-copy-toast"
        >
          Link copied
        </div>
      ) : null}
    </>
  );
}