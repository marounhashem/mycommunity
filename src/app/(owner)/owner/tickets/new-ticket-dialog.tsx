"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/tickets/photo-upload";
import { createTicket } from "@/lib/tickets/actions";
import { Plus } from "lucide-react";

const CATEGORIES = ["Maintenance", "Cleaning", "Security", "Landscaping", "Other"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

interface NewTicketDialogProps {
  unitIds: string[];
}

export function NewTicketDialog({ unitIds }: NewTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; filename: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !description.trim()) {
      setError("Category and description are required");
      return;
    }
    if (unitIds.length === 0) {
      setError("No unit associated with your account");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createTicket({
        unitId: unitIds[0],
        category,
        description: description.trim(),
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        attachmentKeys: attachments,
      });
      setOpen(false);
      setCategory("");
      setPriority("MEDIUM");
      setDescription("");
      setAttachments([]);
      router.refresh();
    } catch {
      setError("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Submit a Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Describe your request..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
          </div>
          <div className="space-y-2">
            <Label>Photos (optional, max 3)</Label>
            <PhotoUpload maxFiles={3} onFilesChange={setAttachments} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
