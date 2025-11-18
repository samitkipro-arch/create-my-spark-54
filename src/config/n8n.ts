/**
 * n8n Webhook Configuration
 * 
 * This file centralizes the n8n webhook URL configuration.
 * The URL should be set via the VITE_N8N_WEBHOOK_URL environment variable.
 */

export const N8N_CONFIG = {
  /**
   * n8n webhook URL
   * Set this via VITE_N8N_WEBHOOK_URL environment variable
   * Example: http://62.84.190.215:5678/webhook-test/b9bdd19b-6e33-485c-8190-7c53ee4f088e
   */
  WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
} as const;

/**
 * Validates that required n8n configuration is present
 * @throws {Error} if configuration is missing
 */
export const validateN8nConfig = () => {
  if (!N8N_CONFIG.WEBHOOK_URL) {
    throw new Error(
      'Configuration manquante : VITE_N8N_WEBHOOK_URL doit être définie. ' +
      'Définissez cette variable dans votre fichier .env ou les paramètres de déploiement.'
    );
  }
};
