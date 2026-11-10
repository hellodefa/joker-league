'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ref,
  get,
  set,
  push,
  update,
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession, RoundData } from '@/types';
import PlayerInputModal from '@/components/PlayerInputModal';
import PlayerGroupSelector from '@/components/PlayerGroupSelector';
import GameTable from '@/components/GameTable';
import RoundHistoryModal from '@/components/RoundHistoryModal';

export default function GamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundData[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [showPlayerInput, setShowPlayerInput] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showRoundHistory, setShowRoundHistory] = useState(false);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<GameSession | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [lastWinner, setLastWinner] = useState<string>('');
  const [lastLosers, setLastLosers] = useState<string[]>([]);

  useEffect(() => {
    setStartTime(new Date());
    loadTodaySessions();
  }, []);

  const loadTodaySessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sessionsRef = ref(db, `dailyStandings/${today}/sessions`);
      const snapshot = await get(sessionsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();

        const sessions: GameSession[] = Object.values(data)
          .map((raw: any) => {
            const rounds: RoundData[] = Array.isArray(raw.rounds)
              ? raw.rounds
              : Object.values(raw.rounds ?? {}).map((r: any) => ({
                  roundNumber: r.roundNumber,
                  roundWinner: r.roundWinner || "",
                  scores: r.scores ?? {},
                  accumulated: r.accumulated ?? {},
                }));

            return {
              id: raw.id,
              date: raw.date,
              players: raw.players ?? [],
              rounds: rounds.sort((a: RoundData, b: RoundData) => a.roundNumber - b.roundNumber),
              winner: raw.winner,
              losers: raw.losers ?? [],
              timestamp: raw.timestamp ?? 0,
            } as GameSession;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        setGameSessions(sessions);
      } else {
        setGameSessions([]);
      }
    } catch (err) {
      console.error('Error load today sessions:', err);
    }
  };

  const startNewGame = (playerList: string[]) => {
    setPlayers(playerList);
    setRoundHistory([]);
    setGameEnded(false);
    setLastWinner('');
    setLastLosers([]);

    const initialAccumulated: Record<string, number> = {};
    playerList.forEach((p) => (initialAccumulated[p] = 0));

    setCurrentRound({
      roundNumber: 1,
      roundWinner: "", // WAJIB ADA
      scores: Object.fromEntries(playerList.map((p) => [p, 0])),
      accumulated: initialAccumulated,
    });
  };

  const handleRoundInput = (
    deltaScores: Record<string, number>,
    roundWinner: string // Dihapus tanda '?' agar strictly string
  ) => {
    if (!currentRound) return;

    const newAccumulated: Record<string, number> = {};

    players.forEach((player) => {
      const previous = currentRound.accumulated[player] ?? 0;
      const delta = deltaScores[player] ?? 0;
      newAccumulated[player] = previous + delta;
    });

    const completedRound: RoundData = {
      roundNumber: currentRound.roundNumber,
      roundWinner, // Strictly string
      scores: deltaScores,
      accumulated: newAccumulated,
    };

    const newHistory = [...roundHistory, completedRound];
    setRoundHistory(newHistory);

    const playersAbove500 = Object.entries(newAccumulated).filter(
      ([, value]) => value >= 500
    );

    if (playersAbove500.length > 0) {
      setCurrentRound({
        roundNumber: currentRound.roundNumber,
        roundWinner: "", // WAJIB ADA
        scores: Object.fromEntries(players.map((player) => [player, 0])),
        accumulated: newAccumulated,
      });

      finishGame(newHistory, newAccumulated);
    } else {
      setCurrentRound({
        roundNumber: currentRound.roundNumber + 1,
        roundWinner: "", // WAJIB ADA
        scores: Object.fromEntries(players.map((player) => [player, 0])),
        accumulated: newAccumulated,
      });
    }
  };

  const finishGame = async (
    history: RoundData[],
    accumulated: Record<string, number>
  ) => {
    const sorted = Object.entries(accumulated).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];

    const minValue = Math.min(...Object.values(accumulated));
    const losers = Object.entries(accumulated)
      .filter(([, v]) => v === minValue)
      .map(([name]) => name);

    setLastWinner(winner);
    setLastLosers(losers);
    setGameEnded(true);

    const sessionId = `session_${Date.now()}`;
    const session: GameSession = {
      id: sessionId,
      date: new Date().toISOString().split('T')[0],
      players,
      rounds: history,
      winner,
      losers,
      timestamp: Date.now(),
    };

    await saveGameSession(session);
    await updateStandings(winner, losers);
    await updateDailyStanding(session);

    setGameSessions((prev) => [...prev, session]);
  };

  const saveGameSession = async (session: GameSession) => {
    const today = session.date;
    const sessionRef = ref(db, `dailyStandings/${today}/sessions/${session.id}`);

    const roundsObj: Record<string, any> = {};
    session.rounds.forEach((r, idx) => {
      roundsObj[idx] = {
        ...r,
        roundWinner: r.roundWinner || "", // PAKSA string kosong jika undefined
      };
    });

    await set(sessionRef, {
      ...session,
      rounds: roundsObj,
    });
  };

  const updateStandings = async (winner: string, losers: string[]) => {
    const winnerRef = ref(db, `standings/${winner}`);
    const winnerSnap = await get(winnerRef);
    const currentWins = winnerSnap.exists() ? winnerSnap.val().wins || 0 : 0;
    await set(winnerRef, {
      wins: currentWins + 1,
      losses: winnerSnap.exists() ? winnerSnap.val().losses || 0 : 0,
    });

    for (const loser of losers) {
      const loserRef = ref(db, `standings/${loser}`);
      const loserSnap = await get(loserRef);
      const currentLosses = loserSnap.exists() ? loserSnap.val().losses || 0 : 0;
      await set(loserRef, {
        wins: loserSnap.exists() ? loserSnap.val().wins || 0 : 0,
        losses: currentLosses + 1,
      });
    }
  };

  const updateDailyStanding = async (session: GameSession) => {
    const today = session.date;
    const dailyRef = ref(db, `dailyStandings/${today}`);
    await update(dailyRef, {
      date: today,
    });
  };

  const resetForNextGame = () => {
    setGameEnded(false);
    setCurrentRound({
      roundNumber: 1,
      roundWinner: "", // WAJIB ADA
      scores: Object.fromEntries(players.map((p) => [p, 0])),
      accumulated: Object.fromEntries(players.map((p) => [p, 0])),
    });
    setRoundHistory([]);
  };

  const handleViewHistory = (session: GameSession) => {
    const normalizedRounds = Array.isArray(session.rounds)
      ? session.rounds
      : (Object.values(session.rounds) as RoundData[]);

    const normalizedSession: GameSession = {
      ...session,
      rounds: normalizedRounds.map(r => ({
        ...r,
        roundWinner: r.roundWinner || ""
      }))
    };
    
    setSelectedSessionHistory(normalizedSession);
    setShowRoundHistory(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🎮 Catatan Permainan</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
          >
            ← Kembali
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
          <p className="text-lg">
            📅 Tanggal:{' '}
            <span className="font-bold">
              {startTime?.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </p>
          <p className="text-lg">
            ⏰ Waktu:{' '}
            <span className="font-bold">
              {startTime?.toLocaleTimeString('id-ID')}
            </span>
          </p>
        </div>

        {players.length === 0 && (
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShowPlayerInput(true)}
              className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl font-bold text-lg"
            >
              👥 Input Pemain Baru
            </button>
            <button
              onClick={() => setShowGroupSelector(true)}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-bold text-lg"
            >
              📁 Gunakan Group Pemain
            </button>
          </div>
        )}

        {players.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 border border-white/20">
            <p className="mb-2 font-semibold">Pemain Aktif:</p>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {currentRound && (
          <GameTable
            players={players}
            currentRound={currentRound}
            roundHistory={roundHistory}
            onRoundSubmit={handleRoundInput}
            gameEnded={gameEnded}
          />
        )}

        {gameEnded && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-red-500/20 border-2 border-yellow-500/50 rounded-xl p-6 mt-6">
            <h3 className="text-2xl font-bold mb-3">🎉 Permainan Selesai!</h3>
            <p className="text-xl mb-1">
              🏆 Pemenang:{' '}
              <span className="font-bold text-yellow-400">{lastWinner}</span>
            </p>
            <p className="text-xl mb-4">
              💀 Pecundang:{' '}
              <span className="font-bold text-red-400">
                {lastLosers.join(', ')}
              </span>
            </p>
            <button
              onClick={resetForNextGame}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-lg font-bold"
            >
              🔄 Mulai Permainan Baru (Reset ke 0)
            </button>
          </div>
        )}

        {gameSessions.length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-4">📊 Klasemen Hari Ini</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-2 text-left">Sesi</th>
                  <th className="py-2 text-left">Pemenang</th>
                  <th className="py-2 text-left">Pecundang</th>
                  <th className="py-2 text-center">Ronde</th>
                  <th className="py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {gameSessions.map((s, i) => (
                  <tr key={s.id} className="border-b border-white/10">
                    <td className="py-2">#{i + 1}</td>
                    <td className="py-2 text-yellow-400 font-semibold">
                      {s.winner}
                    </td>
                    <td className="py-2 text-red-400">{s.losers.join(', ')}</td>
                    <td className="py-2 text-center">
                      {Array.isArray(s.rounds)
                        ? s.rounds.length
                        : Object.keys(s.rounds).length}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => handleViewHistory(s)}
                        className="px-3 py-1 bg-blue-500/30 hover:bg-blue-500/50 rounded text-sm"
                      >
                        📜 Lihat Riwayat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showPlayerInput && (
          <PlayerInputModal
            onClose={() => setShowPlayerInput(false)}
            onStart={startNewGame}
          />
        )}
        {showGroupSelector && (
          <PlayerGroupSelector
            onClose={() => setShowGroupSelector(false)}
            onSelect={startNewGame}
          />
        )}
        {showRoundHistory && selectedSessionHistory && (
          <RoundHistoryModal
            session={selectedSessionHistory}
            onClose={() => setShowRoundHistory(false)}
          />
        )}
      </div>
    </main>
  );
}