'use client';

import { useEffect, useState } from 'react';
import { RoundData } from '@/types';
import ScoreWithDelta from '@/components/ScoreWithDelta';

interface Props {
  players: string[];
  currentRound: RoundData;
  roundHistory: RoundData[];
  onRoundSubmit: (deltaScores: Record<string, number>, roundWinner?: string) => void;
  gameEnded: boolean;
}

function normalizeIntegerInput(value: string) {
  let cleaned = value.replace(/[^\d-]/g, '');
  cleaned = cleaned.replace(/(?!^)-/g, '');

  if (cleaned === '' || cleaned === '-') return cleaned;

  const isNegative = cleaned.startsWith('-');
  const digits = isNegative ? cleaned.slice(1) : cleaned;
  const normalizedDigits = digits.replace(/^0+(?=\d)/, '');

  return isNegative ? `-${normalizedDigits}` : normalizedDigits;
}

function parseInputNumber(value: string): number | null {
  if (value.trim() === '' || value.trim() === '-') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
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

  useEffect(() => {
    const initialInputs: Record<string, string> = {};

    players.forEach((player) => {
      initialInputs[player] = '';
    });

    setInputs(initialInputs);
    setRoundWinner('');
  }, [currentRound, players]);

  const handleScoreChange = (player: string, value: string) => {
    const normalized = normalizeIntegerInput(value);

    setInputs((prev) => ({
      ...prev,
      [player]: normalized,
    }));
  };

  const handleSubmitRound = () => {
    const deltaScores: Record<string, number> = {};

    for (const player of players) {
      const parsed = parseInputNumber(inputs[player] ?? '');

      if (parsed === null) {
        alert(`Nilai untuk pemain ${player} belum valid.`);
        return;
      }

      deltaScores[player] = parsed;
    }

    onRoundSubmit(deltaScores, roundWinner || undefined);
  };

  const getPreviewTotal = (player: string) => {
    const previous = currentRound.accumulated[player] ?? 0;
    const delta = parseInputNumber(inputs[player] ?? '');

    if (delta === null) return null;

    return previous + delta;
  };

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            📝 Ronde {currentRound.roundNumber}
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Masukkan <b>nilai yang didapat di ronde ini</b> (bisa plus atau minus). 
            Sistem akan menghitung total akumulasi otomatis.
          </p>
        </div>

        {!gameEnded && (
          <div className="text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
            👑 Pilih pemenang ronde (opsional).
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full mb-4 min-w-[760px]">
          <thead>
            <tr className="border-b border-white/20">
              <th className="py-3 text-left">Pemain</th>
              <th className="py-3 text-center">Total Sebelumnya</th>
              <th className="py-3 text-center">Nilai Ronde Ini</th>
              <th className="py-3 text-center">Preview Total Baru</th>
              <th className="py-3 text-center">Pemenang Ronde</th>
            </tr>
          </thead>

          <tbody>
            {players.map((player) => {
              const previousScore = currentRound.accumulated[player] ?? 0;
              const previewTotal = getPreviewTotal(player);
              const isRoundWinner = roundWinner === player;
              const inputValue = inputs[player] ?? '';

              return (
                <tr
                  key={player}
                  className={`border-b border-white/10 ${
                    isRoundWinner ? 'bg-yellow-500/10' : ''
                  }`}
                >
                  <td className="py-3 font-semibold">
                    {isRoundWinner && <span className="mr-2">👑</span>}
                    {player}
                  </td>

                  <td className="py-3 text-center text-yellow-400 font-bold">
                    {previousScore}
                  </td>

                  <td className="py-3 text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(e) =>
                        handleScoreChange(player, e.target.value)
                      }
                      disabled={gameEnded}
                      className="w-28 px-3 py-2 bg-black/30 border border-white/30 rounded text-center text-white outline-none focus:border-yellow-400"
                      placeholder="0"
                    />
                  </td>

                  <td className="py-3 text-center">
                    {previewTotal !== null ? (
                      <span
                        className={`font-bold ${
                          previewTotal > previousScore
                            ? 'text-green-400'
                            : previewTotal < previousScore
                            ? 'text-red-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {previewTotal}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  <td className="py-3 text-center">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="roundWinner"
                        checked={roundWinner === player}
                        onChange={() => setRoundWinner(player)}
                        disabled={gameEnded}
                        className="w-4 h-4"
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
        <button
          onClick={handleSubmitRound}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold text-lg"
        >
          ✅ Selesaikan Ronde {currentRound.roundNumber}
        </button>
      )}

      {roundHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-3">📊 Riwayat Catatan Ronde</h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-3 text-left">Ronde</th>
                  <th className="py-3 text-left">Pemenang Ronde</th>
                  {players.map((player) => (
                    <th key={player} className="py-3 text-center">
                      {player}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {roundHistory.map((round) => (
                  <tr
                    key={round.roundNumber}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="py-3 font-semibold">
                      Ronde {round.roundNumber}
                    </td>

                    <td className="py-3">
                      {round.roundWinner ? (
                        <span className="text-yellow-400 font-bold">
                          👑 {round.roundWinner}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {players.map((player) => {
                      const isWinner = round.roundWinner === player;
                      const total = round.accumulated[player] ?? 0;
                      const delta = round.scores[player] ?? 0;

                      return (
                        <td
                          key={player}
                          className={`py-3 text-center ${
                            isWinner
                              ? 'bg-yellow-500/15 border border-yellow-500/30'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {isWinner && (
                              <span className="text-xs text-yellow-400 font-bold">
                                👑 Winner
                              </span>
                            )}

                            <ScoreWithDelta value={total} delta={delta} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Keterangan: angka utama adalah total akumulasi, angka dalam kurung adalah nilai yang didapat di ronde tersebut.
          </p>
        </div>
      )}
    </div>
  );
}