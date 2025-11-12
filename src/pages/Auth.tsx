import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type RoleChoice = "cabinet" | "client";

const Auth = () => {
  // --- routing / query ---
  const [search] = useSearchParams();
  const initialMode = search.get("mode") === "signup" ? false : true; // login tab by default unless mode=signup
  const initialRole = (search.get("role") === "client" ? "client" : "cabinet") as RoleChoice;

  // --- tabs & role ---
  const [isLogin, setIsLogin] = useState<boolean>(initialMode); // true => login, false => signup
  const [role, setRole] = useState<RoleChoice>(initialRole);

  // --- shared auth state ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- comptable (cabinet) signup fields ---
  const [firstName, setFirstName] = useState(""); // Prénom
  const [lastName, setLastName] = useState(""); // Nom
  const [orgName, setOrgName] = useState(""); // Nom de votre Cabinet / Organisation
  const [phoneCabinet, setPhoneCabinet] = useState(""); // Téléphone

  // --- entreprise (client) signup fields ---
  const [companyName, setCompanyName] = useState(""); // Nom de l’entreprise
  const [phoneClient, setPhoneClient] = useState(""); // Téléphone
  const [organisationId, setOrganisationId] = useState(""); // ID d’organisation (obligatoire pour entreprise)

  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // ---- Connexion (identique pour comptable & entreprise) ----
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Connexion réussie !");
          navigate("/dashboard");
        }
      } else {
        // ---- Inscription (varie selon le rôle) ----
        if (role === "cabinet") {
          // Comptable : Organisation + Prénom + Nom + Email + Téléphone + Mot de passe
          if (!orgName || !firstName || !lastName || !email || !phoneCabinet || !password) {
            toast.error("Veuillez remplir tous les champs");
            setLoading(false);
            return;
          }

          // org_id créé côté backend (organisationId NON fourni)
          const { error } = await signUp(email, password, firstName, lastName, undefined);
          if (error) {
            if (error.message?.includes("User already registered")) {
              toast.error("Cet email est déjà utilisé");
            } else {
              toast.error(error.message);
            }
          } else {
            toast.success("Compte créé avec succès !");
          }
        } else {
          // Entreprise : Nom d’entreprise + Email + Téléphone + Mot de passe + ID d’organisation (obligatoire)
          if (!companyName || !email || !phoneClient || !password || !organisationId) {
            toast.error("Veuillez remplir tous les champs");
            setLoading(false);
            return;
          }

          // on passe le nom d’entreprise dans firstName et on laisse lastName vide.
          const pseudoFirst = companyName;
          const pseudoLast = "";

          const { error } = await signUp(email, password, pseudoFirst, pseudoLast, organisationId);
          if (error) {
            if (error.message?.includes("User already registered")) {
              toast.error("Cet email est déjà utilisé");
            } else {
              toast.error(error.message);
            }
          } else {
            // --- INSERT dans `entreprises` après signUp Entreprise ---
            // 1) Essayer de récupérer l'utilisateur immédiatement
            let { data: authData } = await supabase.auth.getUser();
            let currentUserId = authData?.user?.id || null;

            // 2) Si pas de session (confirmation email / timing), retenter une connexion et re-check
            if (!currentUserId) {
              const { error: reSignErr } = await supabase.auth.signInWithPassword({ email, password });
              if (!reSignErr) {
                const recheck = await supabase.auth.getUser();
                currentUserId = recheck.data?.user?.id || null;
              }
            }

            if (currentUserId) {
              const { error: insertErr } = await (supabase as any).from("entreprises").insert({
                org_id: organisationId,
                user_id: currentUserId,
                name: companyName,
                email: email,
                phone: phoneClient,
              });

              if (insertErr) {
                // On notifie l’erreur d’insert sans bloquer le flux d’inscription
                toast.error(`Création entreprise: ${insertErr.message}`);
              }
            } else {
              toast.error("Impossible de récupérer l'utilisateur après l'inscription.");
            }

            toast.success("Compte créé avec succès !");
          }
        }
      }
    } catch (error: any) {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Rendu des blocs d’inscription selon le rôle demandé dans l’URL (WhoAreYou envoie ?role=cabinet|client)
  const SignupCabinet = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom de votre Cabinet / Organisation */}
      <div className="space-y-2">
        <Label htmlFor="orgName">Nom de votre organisation / cabinet</Label>
        <Input
          id="orgName"
          type="text"
          placeholder="Ex. Cabinet Durand"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
      </div>

      {/* Prénom / Nom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Jean"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Dupont"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="signup-email-cab">Email</Label>
        <Input
          id="signup-email-cab"
          type="email"
          placeholder="exemple@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone-cab">Téléphone</Label>
        <Input
          id="phone-cab"
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={phoneCabinet}
          onChange={(e) => setPhoneCabinet(e.target.value)}
          required
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="signup-password-cab">Mot de passe</Label>
        <Input
          id="signup-password-cab"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Création..." : "Créer un compte"}
      </Button>
    </form>
  );

  const SignupClient = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom de l’entreprise */}
      <div className="space-y-2">
        <Label htmlFor="companyName">Nom de l’entreprise</Label>
        <Input
          id="companyName"
          type="text"
          placeholder="Ex. Verne SAS"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="signup-email-cli">Email</Label>
        <Input
          id="signup-email-cli"
          type="email"
          placeholder="exemple@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone-cli">Téléphone</Label>
        <Input
          id="phone-cli"
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={phoneClient}
          onChange={(e) => setPhoneClient(e.target.value)}
          required
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="signup-password-cli">Mot de passe</Label>
        <Input
          id="signup-password-cli"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
      </div>

      {/* ID d’organisation (obligatoire, fourni par le comptable) */}
      <div className="space-y-2">
        <Label htmlFor="organisationId">ID d’organisation</Label>
        <Input
          id="organisationId"
          type="text"
          placeholder="Ex. 90570b03-8758-495a-be5f-0b5df4048e45"
          value={organisationId}
          onChange={(e) => setOrganisationId(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Rapprochez-vous de votre comptable pour l’obtenir.</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Création..." : "Créer un compte"}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Bienvenue</CardTitle>
          <CardDescription className="text-center">Connectez-vous ou créez un compte pour continuer</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={isLogin ? "login" : "signup"} onValueChange={(v) => setIsLogin(v === "login")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            {/* --- Connexion (identique) --- */}
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            {/* --- Inscription : formulaire selon role --- */}
            <TabsContent value="signup">{role === "cabinet" ? SignupCabinet : SignupClient}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
