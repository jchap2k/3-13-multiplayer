import { DOUBLE_TAP_MS, LONG_PRESS_MS } from "../lib/a11y";
import { useA11y } from "../lib/A11yContext";
import { playTurnChime, unlockTurnAudio } from "../lib/turnSound";
import { cn } from "../lib/utils";
import { Checkbox } from "./ui/checkbox";

export function AccessibilityPanel({ compact = false }: { compact?: boolean }) {
  const { prefs, patch } = useA11y();
  return (
    <section className={cn(compact ? "" : "lobby-card rounded-3xl p-5")}>
      <h2 className={cn("font-bold text-white", compact ? "text-base" : "text-lg")}>
        Accessibility
      </h2>
      <p className="mt-1 text-xs text-emerald-100/55">
        Saved on this browser. Change anytime — including mid-hand. New browsers start with bigger
        ranks, wild marks, the turn chime, and chat overlay on.
      </p>
      <div className="mt-3 space-y-3 text-emerald-50">
        <Checkbox
          label="Bigger ranks & suits — larger, higher-contrast pip numbers (card size stays about the same)"
          checked={prefs.largePips}
          onChange={(e) => patch({ largePips: e.currentTarget.checked })}
        />
        <Checkbox
          label="Mark wilds on cards — yellow ring and WILD badge on this-round wilds and jokers (on by default)"
          checked={prefs.markWilds}
          onChange={(e) => patch({ markWilds: e.currentTarget.checked })}
        />
        <Checkbox
          label="Double-click / double-tap to discard (added to tap-select + Discard)"
          checked={prefs.doubleDiscard}
          onChange={(e) => patch({ doubleDiscard: e.currentTarget.checked })}
        />
        <Checkbox
          label={`Long-press / hold to discard (${LONG_PRESS_MS}ms, no drag)`}
          checked={prefs.longDiscard}
          onChange={(e) => patch({ longDiscard: e.currentTarget.checked })}
        />
        <Checkbox
          label="Chat overlay while playing — two lines under previous/current/next (on for new browsers; Talk still works either way)"
          checked={prefs.chatOverlay}
          onChange={(e) => patch({ chatOverlay: e.currentTarget.checked })}
        />
        <Checkbox
          label="Sound on your turn — a short chime when it becomes your draw or discard"
          checked={prefs.turnSound}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            patch({ turnSound: on });
            if (on) {
              unlockTurnAudio();
              playTurnChime();
            }
          }}
        />
      </div>
      <p className="mt-3 text-xs leading-snug text-emerald-100/55">
        A second tap on the selected card <span className="text-amber-100">deselects</span> it.
        Discard with the Discard button, or (if on) double-tap ({DOUBLE_TAP_MS}ms) / long-press.
        Any legal discard that leaves a fully melded hand{" "}
        <span className="text-amber-100">goes out automatically</span>. Everyone sees a big “went
        out” flash.
      </p>
    </section>
  );
}
