import { cn } from "@/lib/utils/cn";
import { StoreIcon } from "./icons";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold tracking-tight text-ink",
        className,
      )}
    >
      <StoreIcon className="size-[1.1em] text-brand" />
      MyGerai
    </span>
  );
}
