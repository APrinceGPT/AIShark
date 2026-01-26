'use client';

import { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

export default function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const [steps] = useState<Step[]>([
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to AIShark! 🦈</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Let's take a quick tour to help you get started with AI-powered network packet analysis.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="upload-section"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Upload Your PCAP File</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Start by uploading a Wireshark capture file (.pcap or .pcapng). You can drag & drop or click to browse.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="ai-features"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">AI-Powered Analysis</h3>
          <p className="text-gray-600 dark:text-gray-300">
            AIShark uses Claude AI to provide intelligent insights, anomaly detection, and troubleshooting suggestions.
          </p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="features"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Powerful Features</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Explore advanced filtering, performance profiling, predictive analysis, and real-time packet inspection.
          </p>
        </div>
      ),
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tour="theme-toggle"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Dark Mode</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Toggle between light and dark themes, or use system preference for automatic switching.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sign-in"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Save Your Work</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to save analysis sessions, access history, and share findings with your team.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
  ]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onFinish();
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Handle step completion
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        tooltipContent: {
          padding: '10px 0',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '14px',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
