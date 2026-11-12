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

  // ==========================================
  // PERHITUNGAN STATISTIK LENGKAP
  // ==========================================
  let totalGames = 0;
  let totalRounds = 0;
  let totalRoundsWon = 0;      // ← Jumlah ronde yang dimenangkan pemain
  let totalRoundsLost = 0;     // ← Jumlah ronde di mana pemain jadi pecundang
  let highestScore = -Infinity;
  let lowestScore = Infinity;
  let gamesWon = 0;

  allSessions.forEach((session) => {
    if (!session.players.includes(playerName)) return;
    
    totalGames++;
    if (session.winner === playerName) gamesWon++;

    session.rounds.forEach((round) => {
      totalRounds++;

      // 1. Cek jika menang ronde (dipilih manual sebagai pemenang ronde)
      if (round.roundWinner === playerName) {
        totalRoundsWon++;
      }

      // 2. Cek jika kalah ronde (memiliki nilai terendah di ronde tersebut)
      const scoresInRound = Object.values(round.accumulated);
      if (scoresInRound.length > 0) {
        const minScoreInRound = Math.min(...scoresInRound);
        if ((round.accumulated[playerName] ?? 0) === minScoreInRound) {
          totalRoundsLost++;
        }
      }

      // 3. Cek skor tertinggi dan terendah
      const playerScore = round.accumulated[playerName] ?? 0;
      if (playerScore > highestScore) highestScore = playerScore;
      if (playerScore < lowestScore) lowestScore = playerScore;
    });
  });

  // Handle edge case jika belum pernah main
  if (totalGames === 0) {
    highestScore = 0;
    lowestScore = 0;
  }

  const gameWinrate = totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : "0.0";
  const avgRoundsWonPerGame = totalGames > 0 ? (totalRoundsWon / totalGames).toFixed(1) : "0.0";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-lg w-full border border-white/20 shadow-2xl transition-all duration-200 max-h-[90vh] overflow-y-auto ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👤</div>
          <h3 className="text-2xl font-bold text-white">{playerName}</h3>
          <p className="text-sm text-gray-400 mt-1">Statistik Detail Permainan</p>
        </div>

        {/* ========================================== */}
        {/* STATS GRID UTAMA - 6 CARD (3 KOLOM x 2 BARIS) */}
        {/* ========================================== */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Card 1: Total Permainan */}
          <div className="bg-black/30 rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-bold text-blue-400">{totalGames}</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">Total Permainan</div>
          </div>

          {/* Card 4: Permainan Menang (Game Win) */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{gamesWon}</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">⚔️ Game Dimenangkan</div>
          </div>


          {/* Card 6: Game Winrate (%) */}
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{gameWinrate}%</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">📊 Game Winrate</div>
          </div>
        </div>

<div className="grid grid-cols-3 gap-3 mb-6">

          {/* Card 2: Total Ronde Dimainkan */}
          <div className="bg-black/30 rounded-xl p-3 text-center border border-white/10">
            <div className="text-2xl font-bold text-purple-400">{totalRounds}</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">🎯 Total Ronde Dimainkan</div>
          </div>

          {/* Card 3: Total Ronde Dimenangkan ← TAMBAHAN BARU */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{totalRoundsWon}</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">🏆 Total Ronde Dimenangkan</div>
          </div>

          {/* Card 5: Total Ronde Kalah */}
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{totalRoundsLost}</div>
            <div className="text-[10px] md:text-xs text-gray-400 mt-1">💀 Total Ronde Dipencundangi</div>
          </div>
</div>


        {/* ========================================== */}
        {/* SKOR TERTINGGI & TERENDAH */}
        {/* ========================================== */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-400">{highestScore}</div>
            <div className="text-xs text-gray-400 mt-1">📈 Nilai Tertinggi</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-red-400">{lowestScore}</div>
            <div className="text-xs text-gray-400 mt-1">📉 Nilai Terendah</div>
          </div>
        </div>

        {/* ========================================== */}
        {/* METRIK TAMBAHAN: RATA-RATA RONDE MENANG / GAME */}
        {/* ========================================== */}
        <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-300" title="Rata-rata jumlah ronde yang dimenangkan per permainan">
              Rata-rata Ronde Menang / Game
            </span>
            <span className="text-xl font-bold text-cyan-400">{avgRoundsWonPerGame}</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full transition-all duration-500"
              style={{
                width: `${
                  totalRounds > 0
                    ? Math.min((totalRoundsWon / totalRounds) * 100, 100)
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            *Total ronde menang ({totalRoundsWon}) ÷ Total permainan ({totalGames}) = rata-rata per game
          </p>
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