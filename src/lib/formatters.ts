/**
 * Formatte un montant en euros avec le symbole € collé au montant
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "—";
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

/**
 * Formatte une date au format français
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return "—";
  
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formatte une date avec heure au format français
 */
export const formatDateTime = (date: string | null | undefined): string => {
  if (!date) return "—";
  
  return new Date(date).toLocaleString("fr-FR");
};
