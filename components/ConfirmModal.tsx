'use client';

import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'green' | 'blue' | 'orange';
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  confirmColor = 'red',
  icon = '⚠️',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const colorClasses = {
    red: 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500',
    green: 'from-green-500 to-green-600 hover:from-green-400 hover:to-green-500',
    blue: 'from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500',
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={onCancel}
    >
      <div
        className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{icon}</div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        {/* Message */}
        <div className="bg-black/30 rounded-lg p-4 mb-6">
          <p className="text-gray-200 text-sm whitespace-pre-line">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 bg-gradient-to-r ${colorClasses[confirmColor]} rounded-xl font-semibold shadow-lg transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}