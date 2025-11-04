import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionLimits {
  canAddClients: boolean;
  canAddTeamMembers: boolean;
  canProcessReceipts: boolean;
  maxReceipts: number | null;
  maxTeamMembers: number | null;
  hasUnlimitedReceipts: boolean;
  hasUnlimitedTeamMembers: boolean;
  hasPrioritySupport: boolean;
  hasClientPortal: boolean;
}

export const useSubscriptionLimits = (): SubscriptionLimits => {
  const { subscription } = useAuth();

  // Pas d'abonnement = 5 crédits de test, pas d'autres fonctionnalités
  if (!subscription.subscribed || !subscription.plan) {
    return {
      canAddClients: false,
      canAddTeamMembers: false,
      canProcessReceipts: true, // Peut utiliser les 5 crédits de test
      maxReceipts: 5,
      maxTeamMembers: 0,
      hasUnlimitedReceipts: false,
      hasUnlimitedTeamMembers: false,
      hasPrioritySupport: false,
      hasClientPortal: false,
    };
  }

  // Plan Essentiel
  if (subscription.plan === "essentiel") {
    return {
      canAddClients: true,
      canAddTeamMembers: true,
      canProcessReceipts: true,
      maxReceipts: 750,
      maxTeamMembers: 10,
      hasUnlimitedReceipts: false,
      hasUnlimitedTeamMembers: false,
      hasPrioritySupport: false,
      hasClientPortal: false,
    };
  }

  // Plan Avancé
  if (subscription.plan === "avance") {
    return {
      canAddClients: true,
      canAddTeamMembers: true,
      canProcessReceipts: true,
      maxReceipts: null,
      maxTeamMembers: null,
      hasUnlimitedReceipts: true,
      hasUnlimitedTeamMembers: true,
      hasPrioritySupport: true,
      hasClientPortal: true,
    };
  }

  // Plan Expert (même permissions que Avancé)
  if (subscription.plan === "expert") {
    return {
      canAddClients: true,
      canAddTeamMembers: true,
      canProcessReceipts: true,
      maxReceipts: null,
      maxTeamMembers: null,
      hasUnlimitedReceipts: true,
      hasUnlimitedTeamMembers: true,
      hasPrioritySupport: true,
      hasClientPortal: true,
    };
  }

  // Par défaut, pas d'accès
  return {
    canAddClients: false,
    canAddTeamMembers: false,
    canProcessReceipts: false,
    maxReceipts: 0,
    maxTeamMembers: 0,
    hasUnlimitedReceipts: false,
    hasUnlimitedTeamMembers: false,
    hasPrioritySupport: false,
    hasClientPortal: false,
  };
};
