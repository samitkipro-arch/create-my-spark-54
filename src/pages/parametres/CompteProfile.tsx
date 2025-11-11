import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  org_id: string | null;
}

const CompteProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    org_id: "",
  });
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("first_name,last_name,email,phone,org_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error; // ignore "No rows"
      if (data) {
        setProfile({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? user?.email ?? "",
          phone: data.phone ?? "",
          org_id: data.org_id ?? "",
        });
      } else {
        // pas de ligne encore : au moins afficher l'email de la session
        setProfile((p) => ({ ...p, email: user?.email ?? "" }));
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const payload = {
        user_id: user.id, // nécessaire pour l'upsert
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        // on NE modifie pas email / org_id ici côté UI (email et org_id restent en lecture seule)
      };

      const { error } = await (supabase as any).from("profiles").upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
      await loadProfile();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du profil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setPassword("");
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été modifié avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-bold">Compte & Profil</h1>

        <Card className="max-w-4xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">
                {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : "Utilisateur"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>Modifier</Button>
            ) : (
              <Button onClick={handleUpdateProfile} disabled={loading}>
                Enregistrer
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Your First Name"
                  value={profile.first_name || ""}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Your First Name"
                  value={profile.last_name || ""}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Your First Name"
                  value={profile.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone (optionnel)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Your First Name"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your First Name"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!isEditing}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {password && (
                  <Button onClick={handleUpdatePassword} disabled={loading} size="sm" className="mt-2">
                    Mettre à jour le mot de passe
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgId">ID Organisation</Label>
                <Input
                  id="orgId"
                  placeholder="Your First Name"
                  value={profile.org_id || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CompteProfile;
