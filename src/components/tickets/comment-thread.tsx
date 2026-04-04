"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { addComment } from "@/lib/tickets/actions";

interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  author: { email: string; role: string };
}

interface CommentThreadProps {
  ticketId: string;
  comments: Comment[];
  showInternal: boolean;
  canPostInternal: boolean;
}

export function CommentThread({ ticketId, comments, showInternal, canPostInternal }: CommentThreadProps) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visibleComments = showInternal ? comments : comments.filter((c) => !c.isInternal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      await addComment(ticketId, body.trim(), isInternal);
      setBody("");
      setIsInternal(false);
    } finally {
      setSubmitting(false);
    }
  }

  const initials = (email: string) =>
    email.split("@")[0].split(".").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Comments</h3>

      {visibleComments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {visibleComments.map((comment) => (
        <div key={comment.id} className={`flex gap-3 rounded-lg p-3 ${comment.isInternal ? "bg-sage-50 border border-sage-200" : "bg-card border border-border"}`}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-gold text-white text-xs">{initials(comment.author.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{comment.author.email}</span>
              {comment.isInternal && (
                <Badge variant="outline" className="text-[10px] bg-sage-100 text-sage-700">Internal</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea placeholder="Add a comment..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        <div className="flex items-center justify-between">
          <div>
            {canPostInternal && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                Internal note
              </label>
            )}
          </div>
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
