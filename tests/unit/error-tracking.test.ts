import { describe, it, expect } from 'vitest';
import { captureError, captureMessage, addBreadcrumb } from '@/lib/error-tracking';

describe('Error Tracking - captureError', () => {
  it('should handle error capture without Sentry DSN', () => {
    const error = new Error('Test error');
    expect(() => {
      captureError(error, {
        tags: { test: 'value' },
        extra: { data: 'test' },
      });
    }).not.toThrow();
  });

  it('should handle user context', () => {
    const error = new Error('Test error with user');
    expect(() => {
      captureError(error, {
        user: { id: '123', email: 'test@example.com' },
      });
    }).not.toThrow();
  });
});

describe('Error Tracking - captureMessage', () => {
  it('should handle message capture', () => {
    expect(() => {
      captureMessage('Test info message', 'info');
      captureMessage('Test warning message', 'warning');
      captureMessage('Test error message', 'error');
    }).not.toThrow();
  });
});

describe('Error Tracking - addBreadcrumb', () => {
  it('should handle breadcrumb addition', () => {
    expect(() => {
      addBreadcrumb('Test breadcrumb', 'test', { key: 'value' });
    }).not.toThrow();
  });
});
