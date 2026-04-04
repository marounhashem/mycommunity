"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createViolation } from "@/lib/violations/actions";
import { Paperclip, X } from "lucide-react";

const RULES = [
  "Noise After Hours",
  "Unauthorized Modifications",
  "Pet Policy Violation",
  "Parking Violation",
  "Common Area Misuse",
  "Waste Disposal Violation",
  "Other",
];

interface ViolationFormProps {
  units: { id: string; unitNumber: string; zone: string }[];
}

export function ViolationForm({ units }: ViolationFormProps) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [rule, setRule] = useState("");
  const [description, setDescription] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [evidence, setEvidence] = useState<{ key: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, prefix: "violations" }),
      });
      const { url, key } = await res.json();
      await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      setEvidence({ key, filename: file.name });
    } catch { setError("Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !rule) { setError("Unit and rule are required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await createViolation({
        unitId, ruleBreached: rule,
        description: description.trim() || undefined,
        evidenceR2Key: evidence?.key,
        evidenceName: evidence?.filename,
        fineAmountAed: fineAmount ? parseFloat(fineAmount) : undefined,
      });
      router.push("/manager/violations");
    } catch { setError("Failed to create violation"); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
          <SelectContent>
            {units.map((u) => (<SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} ({u.zone})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Rule Breached</Label>
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
          <SelectContent>
            {RULES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Photo Evidence (optional)</Label>
        {evidence ? (
          <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="truncate flex-1">{evidence.filename}</span>
            <button type="button" onClick={() => setEvidence(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Paperclip className="h-4 w-4 mr-1" />{uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>
      <div className="space-y-2">
        <Label>Fine Amount (AED)</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Issuing..." : "Issue Violation"}
      </Button>
    </form>
  );
}
