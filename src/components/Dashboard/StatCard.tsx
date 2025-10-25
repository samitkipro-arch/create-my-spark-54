import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatCard = ({ title, value, icon: Icon }: StatCardProps) => {
  return (
    <Card className="bg-card border-border transition-all duration-200 hover:brightness-[1.03] hover:shadow-[var(--shadow-hover)] shadow-[var(--shadow-soft)] animate-fade-in-scale">
      <CardContent className="p-3 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <p className="text-[10px] md:text-sm text-muted-foreground md:hidden">{title}</p>
          <div className="flex items-center justify-between md:flex-col md:items-start md:space-y-2 md:flex-1">
            <div className="md:space-y-2">
              <p className="hidden md:block text-xs md:text-sm text-muted-foreground">{title}</p>
              <p className="text-xl md:text-3xl font-bold text-[hsl(210,40%,98%)]">{value}</p>
            </div>
          </div>
          <div className="p-2 md:p-3 bg-primary/10 rounded-lg transition-all duration-200">
            <Icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
