import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatCard = ({ title, value, icon: Icon }: StatCardProps) => {
  return (
    <Card className="bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
};
