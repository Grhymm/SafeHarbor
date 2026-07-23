export type MissionStatus =
  | "draft"
  | "paid"
  | "tester_assigned"
  | "contracts_signed"
  | "in_progress"
  | "report_submitted"
  | "under_review"
  | "delivered"
  | "validated"
  | "disputed"
  | "refunded"
  | "closed"
  | "cancelled";

export const STATUS_MAP: Record<MissionStatus, { label: string; tone: "gray" | "amber" | "blue" | "green" | "red" }> = {
  draft: { label: "Brouillon", tone: "gray" },
  paid: { label: "Payée — en attente d'assignation", tone: "amber" },
  tester_assigned: { label: "Test en cours", tone: "amber" },
  contracts_signed: { label: "Test en cours", tone: "amber" },
  in_progress: { label: "Test en cours", tone: "amber" },
  report_submitted: { label: "En relecture", tone: "blue" },
  under_review: { label: "En relecture", tone: "blue" },
  delivered: { label: "Terminée", tone: "green" },
  validated: { label: "Terminée", tone: "green" },
  closed: { label: "Terminée", tone: "green" },
  disputed: { label: "Litige en cours", tone: "red" },
  refunded: { label: "Annulée", tone: "gray" },
  cancelled: { label: "Annulée", tone: "gray" },
};

const TONE_CLASSES: Record<string, string> = {
  gray: "border-sh-ink-dim text-sh-ink-dim bg-sh-ink-dim/5",
  amber: "border-sh-amber text-sh-amber bg-sh-amber/10",
  blue: "border-sh-info-ink text-sh-info-ink bg-sh-info-bg",
  green: "border-sh-ok-ink text-sh-ok-ink bg-sh-ok-bg",
  red: "border-sh-error-ink text-sh-error-ink bg-sh-error-bg",
};

export function StatusBadge({ status }: { status: MissionStatus }) {
  const entry = STATUS_MAP[status];
  return (
    <span
      className={`inline-block font-plex-mono text-[11px] tracking-[0.08em] uppercase border rounded-[3px] px-2.5 py-1 ${TONE_CLASSES[entry.tone]}`}
    >
      {entry.label}
    </span>
  );
}
