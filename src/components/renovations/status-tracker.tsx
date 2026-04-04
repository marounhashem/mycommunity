import { Check, Clock, XCircle, AlertTriangle } from "lucide-react";

interface StatusTrackerProps {
  status: string;
}

const steps = [
  { key: "PENDING", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "FINAL", label: "Decision" },
];

export function StatusTracker({ status }: StatusTrackerProps) {
  const isFinal = ["APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(status);
  const currentIndex = status === "PENDING" ? 0
    : status === "UNDER_REVIEW" ? 1
    : isFinal ? 2 : 0;

  function getStepIcon(index: number) {
    if (index < currentIndex) return <Check className="h-4 w-4 text-white" />;
    if (index === currentIndex && isFinal) {
      if (status === "APPROVED") return <Check className="h-4 w-4 text-white" />;
      if (status === "REJECTED") return <XCircle className="h-4 w-4 text-white" />;
      if (status === "CHANGES_REQUESTED") return <AlertTriangle className="h-4 w-4 text-white" />;
    }
    if (index === currentIndex) return <Clock className="h-4 w-4 text-white" />;
    return <span className="text-xs text-muted-foreground">{index + 1}</span>;
  }

  function getStepColor(index: number) {
    if (index < currentIndex) return "bg-teal";
    if (index === currentIndex) {
      if (status === "APPROVED") return "bg-teal";
      if (status === "REJECTED") return "bg-crimson";
      if (status === "CHANGES_REQUESTED") return "bg-gold";
      return "bg-gold";
    }
    return "bg-cream-300";
  }

  function getLabel(index: number) {
    if (index === 2 && isFinal) {
      if (status === "APPROVED") return "Approved";
      if (status === "REJECTED") return "Rejected";
      if (status === "CHANGES_REQUESTED") return "Changes Requested";
    }
    return steps[index].label;
  }

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getStepColor(index)}`}>
              {getStepIcon(index)}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {getLabel(index)}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 w-12 ${index < currentIndex ? "bg-teal" : "bg-cream-300"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
