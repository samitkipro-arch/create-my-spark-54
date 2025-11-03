import { toast } from "@/hooks/use-toast";

export interface ErrorContext {
  context: string;
  operation?: string;
  details?: any;
}

/**
 * Central error handler with logging and toast notifications
 */
export function reportError(error: any, { context, operation, details }: ErrorContext) {
  const errorMessage = error?.message || String(error);
  
  // Log to console with full context
  console.error(`[${context}]${operation ? ` ${operation}` : ''}:`, {
    error: errorMessage,
    details,
    fullError: error,
    timestamp: new Date().toISOString()
  });
  
  // Show user-friendly toast
  toast({
    title: "Erreur",
    description: `${operation || context}: ${errorMessage}`,
    variant: "destructive",
  });
  
  return errorMessage;
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId)
  };
}

/**
 * Wrap async operations with timeout and error handling
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 10000,
  context: ErrorContext
): Promise<T> {
  const { signal, cleanup } = createTimeoutController(timeoutMs);
  
  try {
    const result = await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        signal.addEventListener('abort', () => 
          reject(new Error('Temps de réponse dépassé'))
        );
      })
    ]);
    cleanup();
    return result;
  } catch (error: any) {
    cleanup();
    if (error.name === 'AbortError' || error.message === 'Temps de réponse dépassé') {
      const timeoutError = new Error(`Temps de réponse dépassé (${timeoutMs}ms)`);
      reportError(timeoutError, context);
      throw timeoutError;
    }
    reportError(error, context);
    throw error;
  }
}
