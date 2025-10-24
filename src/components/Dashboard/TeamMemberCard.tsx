import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamMemberCardProps {
  name: string;
  role: string;
  receiptsCount: number;
  tvaAmount: string;
  initials: string;
}

export const TeamMemberCard = ({
  name,
  role,
  receiptsCount,
  tvaAmount,
  initials,
}: TeamMemberCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{name}</h3>
              <Badge variant="secondary" className="text-xs">
                {role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {receiptsCount} reçu{receiptsCount !== 1 ? "s" : ""} – {tvaAmount} de TVA
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
