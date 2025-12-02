'use client';

import { useState, useEffect } from 'react';

const messages = [
  "Cooking up your opportunities...",
  "Your fundraising dreams are just a click away!",
  "Finding the perfect matches for you...",
  "Scanning thousands of opportunities...",
  "Almost there! Great things take time...",
  "Matching you with your ideal grants...",
  "We're finding opportunities tailored just for you...",
  "Just a moment while we work our magic...",
];

export function LoadingMeter({ loading }: { loading: boolean }) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }

    // Rotate messages every 2 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 2000);

    // Simulate progress (0-90% while loading)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 10;
      });
    }, 300);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  if (!loading && progress === 100) {
    return null;
  }

  return (
    <div className="mb-6 p-6 bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-xl">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="font-primary text-[#ff16a9] text-sm font-semibold">
            {messages[currentMessage]}
          </p>
          <span className="font-secondary text-[#e7e8ef] text-xs">
            {Math.min(Math.round(progress), 90)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#1d1d1e] border border-[#ff16a9]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#ff16a9] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 90)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

