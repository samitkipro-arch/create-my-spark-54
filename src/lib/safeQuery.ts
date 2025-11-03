import { toast } from "@/hooks/use-toast";

/**
 * Safe query wrapper with timeout and error handling
 * Prevents infinite spinners and provides user feedback
 */
export async function safeQuery<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  options: {
    timeoutMs?: number;
    fallbackMsg?: string;
    showToast?: boolean;
  } = {}
): Promise<T | null> {
  const { 
    timeoutMs = 10000, 
    fallbackMsg = 'Impossible de charger les données.', 
    showToast = true 
  } = options;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // Race between query and timeout
    const result = await Promise.race([
      fn(),
      new Promise<{ data: null; error: any }>((_, reject) => {
        ctrl.signal.addEventListener('abort', () => 
          reject(new Error(`Temps de réponse dépassé (${timeoutMs}ms)`))
        );
      })
    ]);

    clearTimeout(timeout);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  } catch (error: any) {
    clearTimeout(timeout);
    const errorMessage = error?.message || fallbackMsg;
    
    console.error('Query error:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    if (showToast) {
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }

    throw error;
  }
}
