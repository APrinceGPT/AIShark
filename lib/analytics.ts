/**
 * Google Analytics Event Tracking
 * Tracks user interactions and key events in the application
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

export interface GAEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

/**
 * Send a custom event to Google Analytics
 */
export const trackEvent = ({ action, category, label, value }: GAEvent) => {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

/**
 * Track page view
 */
export const trackPageView = (url: string) => {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  window.gtag?.('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

/**
 * Track file upload event
 */
export const trackFileUpload = (fileSize: number, fileName: string) => {
  trackEvent({
    action: 'file_upload',
    category: 'engagement',
    label: fileName,
    value: Math.round(fileSize / 1024), // Size in KB
  });
};

/**
 * Track AI query event
 */
export const trackAIQuery = (queryType: 'summary' | 'troubleshoot' | 'explain' | 'query' | 'anomaly' | 'compare') => {
  trackEvent({
    action: 'ai_query',
    category: 'ai_interaction',
    label: queryType,
  });
};

/**
 * Track analysis completion
 */
export const trackAnalysisComplete = (packetCount: number, duration: number) => {
  trackEvent({
    action: 'analysis_complete',
    category: 'engagement',
    label: `${packetCount} packets`,
    value: Math.round(duration),
  });
};

/**
 * Track session save
 */
export const trackSessionSave = (isAuthenticated: boolean) => {
  trackEvent({
    action: 'session_save',
    category: 'engagement',
    label: isAuthenticated ? 'authenticated' : 'anonymous',
  });
};

/**
 * Track filter usage
 */
export const trackFilterUsage = (filterType: 'basic' | 'advanced') => {
  trackEvent({
    action: 'filter_usage',
    category: 'feature_usage',
    label: filterType,
  });
};

/**
 * Track export action
 */
export const trackExport = (exportType: 'pdf' | 'csv' | 'json') => {
  trackEvent({
    action: 'export',
    category: 'engagement',
    label: exportType,
  });
};

/**
 * Track feature usage
 */
export const trackFeatureUsage = (feature: string) => {
  trackEvent({
    action: 'feature_usage',
    category: 'engagement',
    label: feature,
  });
};

/**
 * Track error
 */
export const trackError = (errorMessage: string, errorType: string) => {
  trackEvent({
    action: 'error',
    category: 'errors',
    label: `${errorType}: ${errorMessage}`,
  });
};

/**
 * Track authentication
 */
export const trackAuth = (action: 'sign_in' | 'sign_up' | 'sign_out') => {
  trackEvent({
    action,
    category: 'authentication',
    label: action,
  });
};

/**
 * Track onboarding completion
 */
export const trackOnboardingComplete = () => {
  trackEvent({
    action: 'onboarding_complete',
    category: 'engagement',
    label: 'tutorial_finished',
  });
};
