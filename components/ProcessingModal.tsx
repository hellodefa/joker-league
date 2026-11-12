'use client';

import { useEffect, useState } from 'react';

interface ProcessingModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: number; // 0-100
}

export default function ProcessingModal({
  isOpen,
  title,
  message,
  progress,
}: ProcessingModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/90 backdrop-blur-md' : 'bg-black/0'
      }`}
    >
      <div
        className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border-2 border-blue-500/50 shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/30 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-500 rounded-full"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">⚙️</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-white mb-3">{title}</h3>

        {/* Message */}
        <p className="text-center text-gray-300 mb-6">{message}</p>

        {/* Progress Bar (optional) */}
        {progress !== undefined && (
          <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}