"use client";

import { useRouter } from "next/navigation";
import { resolveViolation } from "@/lib/violations/actions";
import { Check } from "lucide-react";

export function ResolveButton({ violationId }: { violationId: string }) {
  const router = useRouter();

  async function handleResolve() {
    await resolveViolation(violationId);
    router.refresh();
  }

  return (
    <button onClick={handleResolve} className="text-teal hover:text-teal-600" title="Mark Resolved">
      <Check className="h-4 w-4" />
    </button>
  );
}
