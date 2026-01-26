import { describe, it, expect } from 'vitest';
import { trackEvent, trackFileUpload, trackAIQuery, trackAnalysisComplete } from '@/lib/analytics';

describe('Analytics - trackEvent', () => {
  it('should not throw error when GA is not configured', () => {
    expect(() => {
      trackEvent({
        action: 'test_action',
        category: 'test_category',
        label: 'test_label',
        value: 100,
      });
    }).not.toThrow();
  });
});

describe('Analytics - trackFileUpload', () => {
  it('should track file upload without errors', () => {
    expect(() => {
      trackFileUpload(1024000, 'test.pcap');
    }).not.toThrow();
  });
});

describe('Analytics - trackAIQuery', () => {
  it('should track AI query without errors', () => {
    expect(() => {
      trackAIQuery('summary');
      trackAIQuery('troubleshoot');
      trackAIQuery('explain');
    }).not.toThrow();
  });
});

describe('Analytics - trackAnalysisComplete', () => {
  it('should track analysis completion without errors', () => {
    expect(() => {
      trackAnalysisComplete(1000, 5000);
    }).not.toThrow();
  });
});
