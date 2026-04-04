"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AudienceSelector } from "@/components/comms/audience-selector";
import { FileAttachment } from "@/components/comms/file-attachment";
import { sendAnnouncement } from "@/lib/comms/actions";
import { Eye, Send } from "lucide-react";

const TiptapEditor = dynamic(
  () => import("@/components/comms/tiptap-editor").then((m) => m.TiptapEditor),
  { ssr: false }
);

interface ComposeFormProps {
  zones: string[];
  units: { id: string; unitNumber: string; zone: string }[];
}

export function ComposeForm({ zones, units }: ComposeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [zoneFilter, setZoneFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [attachment, setAttachment] = useState<{ key: string; filename: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const canSend = title.trim() && bodyHtml.trim() && bodyHtml !== "<p></p>";

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");
    try {
      await sendAnnouncement({
        title: title.trim(),
        bodyHtml,
        audience: audience as "ALL" | "ZONE" | "UNIT",
        zoneFilter: zoneFilter || undefined,
        unitFilter: unitFilter || undefined,
        attachmentR2Key: attachment?.key,
        attachmentName: attachment?.filename,
      });
      router.push("/manager/announcements");
    } catch {
      setError("Failed to send announcement");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <AudienceSelector
        audience={audience} zoneFilter={zoneFilter} unitFilter={unitFilter}
        zones={zones} units={units}
        onAudienceChange={setAudience} onZoneChange={setZoneFilter} onUnitChange={setUnitFilter}
      />
      {preview ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-xl font-bold mb-4">{title || "Untitled"}</h2>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <Label>Body</Label>
          <TiptapEditor content={bodyHtml} onChange={setBodyHtml} />
        </div>
      )}
      <div className="space-y-2">
        <Label>Attachment (optional)</Label>
        <FileAttachment onFileChange={setAttachment} />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setPreview(!preview)}>
          <Eye className="h-4 w-4 mr-1" />{preview ? "Edit" : "Preview"}
        </Button>
        <Button onClick={handleSend} disabled={!canSend || sending}>
          <Send className="h-4 w-4 mr-1" />{sending ? "Sending..." : "Send Announcement"}
        </Button>
      </div>
    </div>
  );
}
