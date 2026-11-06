import { severityLabel, statusLabel } from "@/lib/config";

export function StatusTag({ status }: { status: string }) {
  return <span className={`tag tag-${status}`}>{statusLabel(status)}</span>;
}

export function SeverityTag({ severity }: { severity: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
      <span className={`hex sev-${severity}`} aria-hidden />
      {severityLabel(severity)}
    </span>
  );
}
