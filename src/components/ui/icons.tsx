import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </Icon>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function ImageOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10.4 4H19a2 2 0 0 1 2 2v8.6" />
      <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" />
      <path d="m2 2 20 20" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </Icon>
  );
}

export function StoreIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <path d="M3 9h18l-1 3.5a2 2 0 0 1-2 1.5 2.3 2.3 0 0 1-2-1.2 2.3 2.3 0 0 1-4 0 2.3 2.3 0 0 1-4 0A2.3 2.3 0 0 1 6 14a2 2 0 0 1-2-1.5Z" />
      <path d="M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
    </Icon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function QrIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 17h.01M21 17v4M17 21h4" />
    </Icon>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </Icon>
  );
}
