import { Card, CardContent } from "@/components/ui/card";
import { Percent, DollarSign, Ticket, AlertTriangle } from "lucide-react";

interface KpiCardsProps {
  collectionRate: number;
  totalOutstanding: number;
  openTickets: number;
  openViolations: number;
}

export function KpiCards({ collectionRate, totalOutstanding, openTickets, openViolations }: KpiCardsProps) {
  const cards = [
    {
      label: "Collection Rate",
      value: `${collectionRate}%`,
      icon: Percent,
      iconColor: "text-teal",
    },
    {
      label: "Total Outstanding",
      value: `${totalOutstanding.toLocaleString()} AED`,
      icon: DollarSign,
      iconColor: "text-crimson",
    },
    {
      label: "Open Tickets",
      value: String(openTickets),
      icon: Ticket,
      iconColor: "text-gold",
    },
    {
      label: "Open Violations",
      value: String(openViolations),
      icon: AlertTriangle,
      iconColor: "text-crimson",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
