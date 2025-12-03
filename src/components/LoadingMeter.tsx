'use client';

import { useState, useEffect } from 'react';

const loadingStages = [
  { progress: 10, message: "Connecting to opportunity database..." },
  { progress: 25, message: "Loading funding opportunities..." },
  { progress: 40, message: "Scanning thousands of opportunities..." },
  { progress: 60, message: "Filtering by your preferences..." },
  { progress: 75, message: "Matching you with ideal opportunities..." },
  { progress: 90, message: "Almost there! Finalizing your matches..." },
];

export function LoadingMeter({ loading }: { loading: boolean }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      setTimeout(() => setProgress(0), 500); // Reset after brief display
      return;
    }

    // Reset when loading starts
    setCurrentStage(0);
    setProgress(loadingStages[0].progress);

    // Progress through stages at fixed intervals
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        const nextStage = prev + 1;
        if (nextStage < loadingStages.length) {
          setProgress(loadingStages[nextStage].progress);
          return nextStage;
        }
        // Stay at last stage
        return prev;
      });
    }, 1500); // Move to next stage every 1.5 seconds

    return () => {
      clearInterval(stageInterval);
    };
  }, [loading]);

  if (!loading) {
    return null;
  }

  const currentMessage = loadingStages[currentStage]?.message || loadingStages[loadingStages.length - 1].message;
  const currentProgress = loadingStages[currentStage]?.progress || 90;

  return (
    <div className="mb-6 p-6 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-xl">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="font-primary text-[#ad3c94] text-sm font-semibold">
            {currentMessage}
          </p>
          <span className="font-secondary text-[#e7e8ef] text-xs">
            {currentProgress}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#1d1d1e] border border-[#ad3c94]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#ad3c94] transition-all duration-500 ease-out"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

