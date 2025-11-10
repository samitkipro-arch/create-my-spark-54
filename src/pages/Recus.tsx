// …imports existants…
import { useUserRole } from "@/hooks/useUserRole";

// (le reste de tes imports restent inchangés)

const Recus = () => {
  const { role, loading: roleLoading, enterpriseName } = useUserRole();

  // … état local existant …
  // (conserve tout ce que tu m’as donné)

  // ===== Clients & Membres (inchangé) =====
  // … useQuery clients & members …

  // Map nom client -> id
  const clientNameById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients]);
  const memberNameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  // IDs des clients autorisés pour l'entreprise (par nom)
  const allowedClientIds = useMemo(() => {
    if (role !== "enterprise" || !enterpriseName) return null;
    const norm = (s: string) => s.toLowerCase().trim();
    return clients.filter((c) => norm(c.name || "") === norm(enterpriseName)).map((c) => c.id);
  }, [role, enterpriseName, clients]);

  // ===== Reçus =====
  const {
    data: receipts = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "recus",
      storedDateRange,
      storedClientId,
      storedMemberId,
      debouncedQuery,
      sortOrder,
      role,
      enterpriseName,
      allowedClientIds,
    ],
    queryFn: async () => {
      let query = (supabase as any)
        .from("recus")
        .select(
          "id, created_at, date_traitement, date_recu, numero_recu, receipt_number, enseigne, adresse, ville, montant_ht, montant_ttc, tva, moyen_paiement, status, client_id, processed_by, category_id, org_id",
        );

      if (storedDateRange.from && storedDateRange.to) {
        query = query.gte("date_traitement", storedDateRange.from).lte("date_traitement", storedDateRange.to);
      }

      // >>> IMPORTANT : filtrage entreprise
      if (role === "enterprise") {
        if (allowedClientIds && allowedClientIds.length > 0) {
          query = query.in("client_id", allowedClientIds);
        } else {
          // Aucun client correspondant au nom de l'entreprise => forcer 0 résultat
          query = query.eq("client_id", "__none__");
        }
      } else {
        // Comptable : filtres habituels
        if (storedClientId && storedClientId !== "all") query = query.eq("client_id", storedClientId);
        if (storedMemberId && storedMemberId !== "all") query = query.eq("processed_by", storedMemberId);
      }
      // <<<

      if (debouncedQuery) {
        const escaped = debouncedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(`numero_recu.ilike.%${escaped}%,enseigne.ilike.%${escaped}%,adresse.ilike.%${escaped}%`);
      }

      query = query.order("date_traitement", { ascending: sortOrder === "asc", nullsFirst: false });
      query = query.order("created_at", { ascending: sortOrder === "asc" }).limit(100);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Receipt[];
    },
  });

  const error = queryError ? (queryError as any).message : null;

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        {/* Barre d’actions : on masque Export / Lien pour enterprise (et pas de flash tant que rôle charge) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <div className="flex gap-3 w-full md:w-auto transition-all duration-200">
            {!roleLoading && role !== "enterprise" && (
              <Button
                variant="outline"
                className="flex-1 md:flex-initial"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast({
                      title: "Aucun reçu sélectionné",
                      description: "Sélectionnez au moins un reçu.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setExportOpen(true);
                }}
              >
                {selectedIds.length > 0 ? `Exporter (${selectedIds.length})` : "Exporter"}
              </Button>
            )}

            <Button className="gap-2 flex-1 md:flex-initial" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter un reçu</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>

            {/* Créer un lien client : masqué pour enterprise */}
            {!roleLoading && role !== "enterprise" && (
              <Button className="gap-2 flex-1 md:flex-initial" onClick={() => setIsClientLinkOpen(true)}>
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Créer un lien client</span>
                <span className="sm:hidden">Lien client</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filtres : masquer "Tous les clients / Tous les membres" pour enterprise */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 transition-all duration-200">
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
            <SelectTrigger className="w-full md:w-[240px]">
              <ArrowDownUp className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Du plus récent au plus ancien</SelectItem>
              <SelectItem value="asc">Du plus ancien au plus récent</SelectItem>
            </SelectContent>
          </Select>

          {!roleLoading && role !== "enterprise" && (
            <>
              <Select value={storedClientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={storedMemberId || "all"} onValueChange={setMemberId}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Tous les membres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Recherche toujours visible */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, numéro ou adresse"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* … le reste de la page Reçus inchangé (table, drawer, dialogs) … */}
        {/* (conserve exactement ton code à partir du <Card> jusqu’à la fin) */}
      </div>
    </MainLayout>
  );
};

export default Recus;
