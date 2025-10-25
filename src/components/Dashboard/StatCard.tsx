import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatCard = ({ title, value, icon: Icon }: StatCardProps) => {
  return (
    <Card className="bg-card border-border transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
      <CardContent className="p-4 md:p-6 transition-all duration-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between transition-all duration-200">
          <div className="space-y-1 md:space-y-2">
            <p className="text-xs md:text-sm text-muted-foreground transition-all duration-150">{title}</p>
            <p className="text-xl md:text-3xl font-bold transition-all duration-150">{value}</p>
          </div>
          <div className="p-2 md:p-3 bg-primary/10 rounded-lg self-start transition-all duration-200">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary transition-all duration-150" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
