import type { ReactNode } from "react";
import { rupees } from "./format";

type Props = {
  icon: ReactNode;
  // Signed: + shows green (money in), - shows as a normal spend.
  amount: number;
  title: string;
  details: [label: string, value: ReactNode][];
  onEdit?: () => void;
  onDelete: () => void;
};

/** Read-only view of a saved entry. Editing only starts after tapping Edit. */
export function EntryView({ icon, amount, title, details, onEdit, onDelete }: Props) {
  return (
    <div className="stack entry-view">
      <div className="entry-hero">
        {icon}
        <strong className={amount > 0 ? "entry-amount pos" : "entry-amount"}>
          {amount > 0 ? "+" : "−"}
          {rupees(Math.abs(amount))}
        </strong>
        <span className="entry-title">{title}</span>
      </div>
      <dl className="card entry-details">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {onEdit && (
        <button type="button" className="primary" onClick={onEdit}>
          Edit
        </button>
      )}
      <button type="button" className="danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
