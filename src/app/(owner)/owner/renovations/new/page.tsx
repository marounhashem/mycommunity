import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOwnerUnitIds } from "@/lib/tickets/queries";
import { MultiStepForm } from "@/components/renovations/multi-step-form";

export default async function NewRenovationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const unitIds = await getOwnerUnitIds(session.user.id);

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">New Renovation Application</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Submit your renovation request for approval</p>
      <MultiStepForm unitIds={unitIds} />
    </div>
  );
}
