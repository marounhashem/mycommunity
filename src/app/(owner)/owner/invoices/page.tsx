import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function OwnerInvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground">
        My Invoices
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        View and pay your service charges
      </p>

      <Card className="mt-6">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Q1 2026 Service Charge</p>
            <p className="text-sm text-muted-foreground mt-1">Due: April 30, 2026</p>
          </div>
          <Button asChild>
            <Link href="/owner/payment-pending">Pay Now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
