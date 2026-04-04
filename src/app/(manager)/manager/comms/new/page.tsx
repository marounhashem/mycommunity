import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDistinctZones, getAllUnits } from "@/lib/comms/queries";
import { ComposeForm } from "./compose-form";

export default async function ComposePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [zones, units] = await Promise.all([getDistinctZones(), getAllUnits()]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">Compose Announcement</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Send an announcement to community owners</p>
      <ComposeForm zones={zones} units={units} />
    </div>
  );
}
