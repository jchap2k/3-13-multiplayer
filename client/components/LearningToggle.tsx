import { LEARNING_HINT, LEARNING_LABEL } from "@shared/learning";
import { Checkbox } from "./ui/checkbox";

export function LearningToggle({
  checked,
  onChange,
  locked = false,
  compact = false,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  locked?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "text-amber-50" : "text-emerald-50"}>
      <Checkbox
        label={LEARNING_LABEL}
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {compact ? null : (
        <p className="mt-1 text-xs text-emerald-100/50">
          {locked
            ? "This match is locked. A mid-hand toggle cannot sneak you onto the Stats board."
            : LEARNING_HINT}
        </p>
      )}
    </div>
  );
}
