"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateRenovationStatus } from "@/lib/renovations/actions";
import { Check, X, MessageSquare, Eye } from "lucide-react";

interface ApprovalControlsProps {
  renovationId: string;
  currentStatus: string;
}

export function ApprovalControls({ renovationId, currentStatus }: ApprovalControlsProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState("");

  async function handleAction(status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    if ((status === "REJECTED" || status === "CHANGES_REQUESTED") && !comment.trim()) {
      alert("Please provide a comment for this action.");
      return;
    }
    setLoading(status);
    try {
      await updateRenovationStatus(renovationId, status, comment.trim() || undefined);
      router.refresh();
    } finally {
      setLoading("");
    }
  }

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
    return null;
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-card mb-6 space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Comment (required for Reject / Request Changes)</Label>
        <Textarea placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-wrap gap-2">
        {currentStatus === "PENDING" && (
          <Button size="sm" variant="outline" onClick={() => handleAction("UNDER_REVIEW")} disabled={!!loading}>
            <Eye className="h-4 w-4 mr-1" /> {loading === "UNDER_REVIEW" ? "..." : "Mark Under Review"}
          </Button>
        )}
        <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => handleAction("APPROVED")} disabled={!!loading}>
          <Check className="h-4 w-4 mr-1" /> {loading === "APPROVED" ? "..." : "Approve"}
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleAction("REJECTED")} disabled={!!loading}>
          <X className="h-4 w-4 mr-1" /> {loading === "REJECTED" ? "..." : "Reject"}
        </Button>
        <Button size="sm" variant="outline" className="border-gold text-gold-700" onClick={() => handleAction("CHANGES_REQUESTED")} disabled={!!loading}>
          <MessageSquare className="h-4 w-4 mr-1" /> {loading === "CHANGES_REQUESTED" ? "..." : "Request Changes"}
        </Button>
      </div>
    </div>
  );
}
