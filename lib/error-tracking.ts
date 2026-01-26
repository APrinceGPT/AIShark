import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
  user?: {
    id: string;
    email?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

/**
 * Capture and report an error to Sentry
 */
export function captureError(error: Error | unknown, context?: ErrorContext) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error('Sentry DSN not configured. Error:', error);
    return;
  }

  // Set user context if provided
  if (context?.user) {
    Sentry.setUser({
      id: context.user.id,
      email: context.user.email,
    });
  }

  // Set tags if provided
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  // Capture the exception with extra context
  Sentry.captureException(error, {
    extra: context?.extra,
  });
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log(`Sentry not configured. Message (${level}):`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorContext?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, errorContext);
      throw error;
    }
  }) as T;
}
