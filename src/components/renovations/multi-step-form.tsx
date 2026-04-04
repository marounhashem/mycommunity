"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload } from "@/components/tickets/photo-upload";
import { submitRenovation } from "@/lib/renovations/actions";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

const SCOPES = [
  "Interior Renovation",
  "Exterior Modification",
  "Plumbing",
  "Electrical",
  "Structural",
  "Other",
];

interface MultiStepFormProps {
  unitIds: string[];
}

export function MultiStepForm({ unitIds }: MultiStepFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canNext = () => {
    if (step === 1) return scope && description.trim();
    if (step === 2) return startDate;
    return true;
  };

  async function handleSubmit() {
    if (unitIds.length === 0) {
      setError("No unit associated with your account");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitRenovation({
        unitId: unitIds[0],
        scope,
        description: description.trim(),
        contractorName: contractorName.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        attachmentKeys: attachments,
      });
      router.push("/owner/renovations");
    } catch {
      setError("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              s <= step ? "bg-crimson text-white" : "bg-cream-300 text-muted-foreground"
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? "bg-crimson" : "bg-cream-300"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">{error}</div>
      )}

      {/* Step 1: Scope */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe the renovation work..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>
        </div>
      )}

      {/* Step 2: Dates & Contractor */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contractor Name (optional)</Label>
            <Input placeholder="Contractor or company name" value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Floor Plans / Drawings (max 5 files)</Label>
            <PhotoUpload maxFiles={5} onFilesChange={setAttachments} />
          </div>
          <p className="text-xs text-muted-foreground">Upload floor plans, architectural drawings, or photos of the area.</p>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-heading text-lg font-semibold">Review Your Application</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Scope:</span>
              <span className="text-foreground">{scope}</span>
              <span className="text-muted-foreground">Description:</span>
              <span className="text-foreground">{description}</span>
              <span className="text-muted-foreground">Start Date:</span>
              <span className="text-foreground">{startDate}</span>
              {endDate && (<><span className="text-muted-foreground">End Date:</span><span className="text-foreground">{endDate}</span></>)}
              {contractorName && (<><span className="text-muted-foreground">Contractor:</span><span className="text-foreground">{contractorName}</span></>)}
              <span className="text-muted-foreground">Documents:</span>
              <span className="text-foreground">{attachments.length} file(s)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="h-4 w-4 mr-1" /> {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  );
}
