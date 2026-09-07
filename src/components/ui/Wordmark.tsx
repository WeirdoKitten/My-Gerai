import { cn } from "@/lib/utils/cn";
import { StoreIcon } from "./icons";

export function Wordmark({
  label = "MyGerai",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 font-extrabold tracking-tight text-ink",
        className,
      )}
    >
      <StoreIcon className="size-[1.1em] shrink-0 text-brand" />
      <span className="truncate">{label}</span>
    </span>
  );
}
