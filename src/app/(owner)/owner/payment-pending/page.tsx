import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Link from "next/link";

export default function PaymentPendingPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="p-8">
          <Clock className="h-12 w-12 text-gold mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold text-foreground">
            Payment Gateway Coming Soon
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Online payments will be available shortly. Please contact the
            management office for current payment options.
          </p>
          <Button variant="outline" asChild className="mt-6">
            <Link href="/owner/invoices">Back to Invoices</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
