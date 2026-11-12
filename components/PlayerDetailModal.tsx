'use client';

import { useEffect, useState } from 'react';
import { GameSession } from '@/types';

interface PlayerDetailModalProps {
  isOpen: boolean;
  playerName: string;
  allSessions: GameSession[];
  onClose: () => void;
}

export default function PlayerDetailModal({
  isOpen,
  playerName,
  allSessions,
  onClose,
}: PlayerDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  // Hitung statistik pemain dari semua sesi
  const playerStats = allSessions.reduce(
    (acc, session) => {
      // Cek apakah pemain ini bermain di sesi ini
      if (!session.players.includes(playerName)) return acc;

      acc.totalGames++;

      // Cek apakah pemain ini pemenang
      if (session.winner === playerName) {
        acc.wins++;
      }

      // Cek apakah pemain ini pecundang
      if (session.losers?.includes(playerName)) {
        acc.losses++;
      }

      return acc;
    },
    { totalGames: 0, wins: 0, losses: 0 }
  );

  const winrate = playerStats.totalGames > 0 
    ? ((playerStats.wins / playerStats.totalGames) * 100).toFixed(1)
    : '0.0';
  
  const lossrate = playerStats.totalGames > 0
    ? ((playerStats.losses / playerStats.totalGames) * 100).toFixed(1)
    : '0.0';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👤</div>
          <h3 className="text-2xl font-bold text-white">{playerName}</h3>
          <p className="text-sm text-gray-400 mt-1">Statistik Permainan</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Games */}
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{playerStats.totalGames}</div>
            <div className="text-xs text-gray-400 mt-1">Total Permainan</div>
          </div>

          {/* Winrate */}
          <div className="bg-black/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{winrate}%</div>
            <div className="text-xs text-gray-400 mt-1">Win Rate</div>
          </div>

          {/* Wins */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{playerStats.wins}</div>
            <div className="text-xs text-gray-400 mt-1">🏆 Menang</div>
          </div>

          {/* Losses */}
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{playerStats.losses}</div>
            <div className="text-xs text-gray-400 mt-1">💀 Kalah</div>
          </div>
        </div>

        {/* Lossrate */}
        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Loss Rate</span>
            <span className="text-lg font-bold text-red-400">{lossrate}%</span>
          </div>
          <div className="w-full bg-black/30 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500"
              style={{ width: `${winrate}%` }}
            ></div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}