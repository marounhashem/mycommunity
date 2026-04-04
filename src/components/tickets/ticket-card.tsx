import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const priorityColors: Record<string, string> = {
  LOW: "bg-sage-100 text-sage-700",
  MEDIUM: "bg-gold-100 text-gold-700",
  HIGH: "bg-crimson-100 text-crimson-700",
  URGENT: "bg-crimson-200 text-crimson-900",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-crimson-100 text-crimson-700",
  IN_PROGRESS: "bg-gold-100 text-gold-700",
  RESOLVED: "bg-teal-100 text-teal-700",
  CLOSED: "bg-cream-300 text-cream-800",
};

interface TicketCardProps {
  id: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  unitNumber: string;
  assigneeEmail?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  commentCount: number;
  href: string;
}

export function TicketCard({
  category,
  description,
  priority,
  status,
  unitNumber,
  assigneeEmail,
  dueDate,
  createdAt,
  commentCount,
  href,
}: TicketCardProps) {
  const isUrgent = priority === "HIGH" || priority === "URGENT";

  return (
    <a href={href} className="block">
      <Card className={`transition-shadow hover:shadow-md ${isUrgent ? "border-l-4 border-l-crimson" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-foreground truncate">
                {category} — Unit {unitNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[status] || ""}>
              {status.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={`text-[10px] ${priorityColors[priority] || ""}`}>
              {priority}
            </Badge>
            {assigneeEmail && <span className="truncate max-w-[120px]">{assigneeEmail}</span>}
            {dueDate && <span>Due {new Date(dueDate).toLocaleDateString()}</span>}
            <span className="ml-auto">{commentCount} comments</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </a>
  );
}
