import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamMemberDetailDrawer } from "@/components/Equipe/TeamMemberDetailDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Member = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  added_at: string;
};

const Equipe = () => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_members")
        .select("user_id, first_name, last_name, email, phone, notes, added_at");
      
      if (error) throw error;
      return (data || []) as Member[];
    },
  });

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setDrawerOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <Button
            className="gap-2 w-full md:w-auto transition-all duration-200"
            onClick={() => {
              setSelectedMember(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Ajouter un membre
          </Button>
        </div>

        <div className="relative transition-all duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher"
            className="pl-10"
          />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5 transition-all duration-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun membre n'a encore été ajouté
            </div>
          ) : (
            members.map((member) => {
              const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
              const fullName = `${member.first_name} ${member.last_name}`.trim() || 'Membre sans nom';
              
              return (
                <Card 
                  key={member.user_id} 
                  className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg cursor-pointer"
                  onClick={() => handleMemberClick(member)}
                >
                  <CardContent className="p-3 transition-all duration-150">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5">
                        <div className="font-semibold text-sm">{fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.email || "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Ajouté le {new Date(member.added_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop: Table */}
        <Card className="hidden md:block bg-card border-border transition-all duration-200">
          <CardContent className="p-0 transition-all duration-150">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun membre n'a encore été ajouté
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prénom & Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Ajouté le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
                    const fullName = `${member.first_name} ${member.last_name}`.trim() || 'Membre sans nom';
                    
                    return (
                      <TableRow 
                        key={member.user_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleMemberClick(member)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{member.phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(member.added_at).toLocaleDateString("fr-FR")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <TeamMemberDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          member={selectedMember ? {
            user_id: selectedMember.user_id,
            first_name: selectedMember.first_name,
            last_name: selectedMember.last_name,
            email: selectedMember.email || undefined,
            phone: selectedMember.phone || undefined,
            notes: selectedMember.notes || undefined,
            initials: `${selectedMember.first_name.charAt(0)}${selectedMember.last_name.charAt(0)}`.toUpperCase()
          } : null}
        />
      </div>
    </MainLayout>
  );
};

export default Equipe;
