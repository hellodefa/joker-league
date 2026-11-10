'use client';

import { useEffect, useState, useRef } from 'react';
import { RoundData } from '@/types';
import ScoreWithDelta from '@/components/ScoreWithDelta';

interface Props {
  players: string[];
  currentRound: RoundData;
  roundHistory: RoundData[];
  onRoundSubmit: (deltaScores: Record<string, number>, roundWinner: string) => void;
  gameEnded: boolean;
}

function normalizeIntegerInput(value: string) {
  let cleaned = value.replace(/[^\d-]/g, '');
  cleaned = cleaned.replace(/(?!^)-/g, '');
  if (cleaned === '' || cleaned === '-') return cleaned;
  const isNegative = cleaned.startsWith('-');
  const digits = isNegative ? cleaned.slice(1) : cleaned;
  return isNegative ? `-${digits.replace(/^0+(?=\d)/, '')}` : digits.replace(/^0+(?=\d)/, '');
}

export default function GameTable({
  players,
  currentRound,
  roundHistory,
  onRoundSubmit,
  gameEnded,
}: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [roundWinner, setRoundWinner] = useState<string>('');
  
  // Ref untuk melacak apakah ronde benar-benar berganti
  const prevRoundRef = useRef(currentRound.roundNumber);

  useEffect(() => {
    // HANYA reset input jika nomor ronde berubah (bukan setiap render)
    if (prevRoundRef.current !== currentRound.roundNumber) {
      const initialInputs: Record<string, string> = {};
      players.forEach((player) => { initialInputs[player] = ''; });
      setInputs(initialInputs);
      setRoundWinner('');
      prevRoundRef.current = currentRound.roundNumber;
    }
  }, [currentRound.roundNumber, players]);

  const handleSubmitRound = () => {
    const deltaScores: Record<string, number> = {};
    for (const player of players) {
      const val = inputs[player]?.trim();
      if (!val && val !== '0') {
        alert(`Nilai untuk pemain ${player} belum diisi.`);
        return;
      }
      deltaScores[player] = Number(val);
    }
    onRoundSubmit(deltaScores, roundWinner || '');
  };

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">📝 Ronde {currentRound.roundNumber}</h2>
          <p className="text-xs md:text-sm text-gray-300 mt-1">Masukkan nilai yang didapat di ronde ini.</p>
        </div>
     .      </div>

      {/* Tampilan Mobile */}
      <div className="md:hidden space-y-3 mb-4">
        {players.map((player) => {
          const isWinner = roundWinner === player;
          return (
            <div key={player} className={`p-3 rounded-xl border ${isWinner ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-black/30 border-white/10'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">{player}</span>
                <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1 rounded-full">
                  <input
                    type="radio"
                    name={`roundWinnerMobile-${currentRound.roundNumber}`}
                    checked={isWinner}
                    onChange={() => setRoundWinner(player)}
                    disabled={gameEnded}
                    className="accent-yellow-400"
                  />
                  <span className="text-sm">👑 Menang</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-16">Nilai:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputs[player] ?? ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, [player]: normalizeIntegerInput(e.target.value) }))}
                  disabled={gameEnded}
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/30 rounded-lg text-center text-white text-lg outline-none focus:border-yellow-400"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tampilan Desktop/Tablet */}
      <div className="hidden md:block overflow-x-auto mb-4">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-white/20">
              <th className="py-3 text-left">Pemain</th>
              <th className="py-3 text-center">Nilai Ronde Ini</th>
              <th className="py-3 text-center">Pemenang Ronde</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const isWinner = roundWinner === player;
              return (
                <tr key={player} className={`border-b border-white/10 ${isWinner ? 'bg-yellow-500/10' : ''}`}>
                  <td className="py-3 font-semibold">{isWinner && <span className="mr-2">👑</span>}{player}</td>
                  <td className="py-3 text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputs[player] ?? ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [player]: normalizeIntegerInput(e.target.value) }))}
                      disabled={gameEnded}
                      className="w-32 px-3 py-2 bg-black/30 border border-white/30 rounded text-center text-white outline-none focus:border-yellow-400"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`roundWinner-${currentRound.roundNumber}`} 
                        checked={isWinner} 
                        onChange={() => setRoundWinner(player)} 
                        disabled={gameEnded} 
                        className="w-4 h-4 accent-yellow-400" 
                      />
                      <span className="text-sm">Menang ronde</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!gameEnded && (
        <button onClick={handleSubmitRound} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold text-lg shadow-lg">
          ✅ Selesaikan Ronde {currentRound.roundNumber}
        </button>
      )}

      {/* Riwayat Ronde (Sama seperti sebelumnya, disingkat untuk ringkas) */}
      {roundHistory.length > 0 && (
        <div className="mt-6 md:mt-8">
          <h3 className="text-lg md:text-xl font-bold mb-3">📊 Riwayat Catatan Ronde</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-3 text-left w-16">#</th>
                  <th className="py-3 text-left hidden md:table-cell">Pemenang</th>
                  {players.map((player) => <th key={player} className="py-3 text-center">{player}</th>)}
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((round) => (
                  <tr key={round.roundNumber} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-3 font-bold text-gray-300">{round.roundNumber}</td>
                    <td className="py-3 hidden md:table-cell">
                      {round.roundWinner ? <span className="text-yellow-400 font-bold">👑 {round.roundWinner}</span> : <span className="text-gray-500">-</span>}
                    </td>
                    {players.map((player) => {
                      const isWinner = round.roundWinner === player;
                      return (
                        <td key={player} className={`py-3 text-center ${isWinner ? 'bg-yellow-500/10' : ''}`}>
                          <ScoreWithDelta value={round.accumulated[player] ?? 0} delta={round.scores[player] ?? 0} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}