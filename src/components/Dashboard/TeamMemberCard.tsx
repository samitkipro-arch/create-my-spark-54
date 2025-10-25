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
    <Card className="bg-card border-border shadow-[var(--shadow-soft)] transition-all duration-200 hover:brightness-[1.03] hover:shadow-[var(--shadow-hover)]">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-11 w-11 md:h-12 md:w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm md:text-base">{name}</h3>
              <Badge variant="secondary" className="text-xs">
                {role}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {receiptsCount} reçu{receiptsCount !== 1 ? "s" : ""} – {tvaAmount} de TVA
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
