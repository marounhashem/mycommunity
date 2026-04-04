import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUnits } from "@/lib/comms/queries";
import { ViolationForm } from "./violation-form";

export default async function NewViolationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const units = await getAllUnits();

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-foreground">Issue Violation</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Record a community rule violation</p>
      <ViolationForm units={units} />
    </div>
  );
}
