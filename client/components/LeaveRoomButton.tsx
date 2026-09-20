import { DoorOpen } from "lucide-react";
import { Button } from "./ui/button";

export function LeaveRoomButton({
  onLeave,
  compact = false,
}: {
  onLeave: () => void;
  compact?: boolean;
}) {
  return (
    <Button
      size={compact ? "sm" : "default"}
      variant="outline"
      className="shrink-0"
      onClick={onLeave}
      aria-label="Leave room"
    >
      <DoorOpen className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      Leave room
    </Button>
  );
}
