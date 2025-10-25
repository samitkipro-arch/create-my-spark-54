import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatCard = ({ title, value, icon: Icon }: StatCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1 md:space-y-2">
            <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
            <p className="text-xl md:text-3xl font-bold">{value}</p>
          </div>
          <div className="p-2 md:p-3 bg-primary/10 rounded-lg self-start">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
