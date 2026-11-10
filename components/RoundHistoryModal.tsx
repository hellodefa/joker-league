import { useEffect, useState } from 'react';
import { GameSession, RoundData } from '@/types';
import ScoreWithDelta from '@/components/ScoreWithDelta';

interface Props {
  session: GameSession;
  onClose: () => void;
}

export default function RoundHistoryModal({ session, onClose }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Tunggu animasi keluar selesai
  };

  const rounds: RoundData[] = Array.isArray(session.rounds)
    ? session.rounds
    : Object.values(session.rounds ?? {});

  const sortedRounds = [...rounds].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  // Fungsi untuk menentukan pecundang di setiap ronde (nilai terendah)
  const getLosersInRound = (round: RoundData): string[] => {
    const values = Object.values(round.accumulated);
    if (values.length === 0) return [];
    const minValue = Math.min(...values);
    return Object.entries(round.accumulated)
      .filter(([, v]) => v === minValue)
      .map(([name]) => name);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-5xl w-full border border-white/20 max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">📜 Riwayat Permainan</h2>
            <p className="text-sm text-gray-400 mt-1">
              {session.groupName} • {session.date}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            ✕ Tutup
          </button>
        </div>

        {/* Info Permainan */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-400">Pemain</p>
            <p className="font-semibold text-sm">{session.players.length} orang</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Ronde</p>
            <p className="font-semibold text-sm">{sortedRounds.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Pemenang</p>
            <p className="font-semibold text-yellow-400 text-sm">
              👑 {session.winner || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Pecundang</p>
            <p className="font-semibold text-red-400 text-sm">
              💀 {session.losers?.join(', ') || '-'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
            <span>👑</span>
            <span className="text-yellow-300">Pemenang Ronde</span>
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
            <span>💀</span>
            <span className="text-red-300">Pecundang Ronde</span>
          </div>
        </div>

        {/* Tabel Riwayat Per Ronde - TANPA KOLOM PEMENANG & PECUNDANG */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-black/30">
                <th className="py-3 px-2 text-left w-16">Ronde</th>
                {session.players.map((player) => (
                  <th key={player} className="py-3 px-2 text-center">
                    {player}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedRounds.map((round, idx) => {
                const roundLosers = getLosersInRound(round);
                const roundWinner = round.roundWinner || '';

                return (
                  <tr
                    key={round.roundNumber}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    style={{
                      animation: `fadeInRow 0.3s ease-out ${idx * 0.03}s both`,
                    }}
                  >
                    <td className="py-3 px-2 font-bold text-gray-300">
                      #{round.roundNumber}
                    </td>

                    {/* Skor per pemain */}
                    {session.players.map((player) => {
                      const isRoundWinner = roundWinner === player;
                      const isRoundLoser = roundLosers.includes(player);
                      const total = round.accumulated?.[player] ?? 0;
                      const delta = round.scores?.[player] ?? 0;

                      let cellClass = 'py-3 px-2 text-center transition-colors';
                      if (isRoundWinner) {
                        cellClass +=
                          ' bg-yellow-500/20 border-l-2 border-r-2 border-yellow-400';
                      } else if (isRoundLoser) {
                        cellClass +=
                          ' bg-red-500/20 border-l-2 border-r-2 border-red-400';
                      }

                      return (
                        <td key={player} className={cellClass}>
                          <div className="flex flex-col items-center gap-1">
                            {isRoundWinner && (
                              <span className="text-base" title="Pemenang Ronde">
                                👑
                              </span>
                            )}
                            {isRoundLoser && !isRoundWinner && (
                              <span className="text-base" title="Pecundang Ronde">
                                💀
                              </span>
                            )}
                            <ScoreWithDelta value={total} delta={delta} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedRounds.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Belum ada riwayat ronde.
          </div>
        )}
      </div>
    </div>
  );
}