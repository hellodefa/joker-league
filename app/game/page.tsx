'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, onValue, set, remove, Unsubscribe } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession } from '@/types';
import PlayerInputModal from '@/components/PlayerInputModal';
import PlayerGroupSelector from '@/components/PlayerGroupSelector';
import RoundHistoryModal from '@/components/RoundHistoryModal';

function GameDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
  const [finishedSessions, setFinishedSessions] = useState<GameSession[]>([]);
  const [showPlayerInput, setShowPlayerInput] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSessionHistory, setSelectedSessionHistory] =
    useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // REAL-TIME LISTENERS dengan onValue
  // ============================================
  useEffect(() => {
    // Listener untuk activeSessions
    const activeRef = ref(db, 'activeSessions');
    const unsubActive = onValue(activeRef, (snapshot) => {
      let list: GameSession[] = [];
      if (snapshot.exists()) {
        list = Object.values(snapshot.val())
          .map((s: any) => ({
            ...s,
            rounds: Array.isArray(s.rounds)
              ? s.rounds
              : Object.values(s.rounds || {}),
          }))
          .filter((s: GameSession) => !s.isFinished);
      }
      setActiveSessions(list);
      setLoading(false);
    });

    // Listener untuk dailyStandings (finished sessions)
    const dailyRef = ref(db, 'dailyStandings');
    const unsubDaily = onValue(dailyRef, (snapshot) => {
      let list: GameSession[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach((day: any) => {
          if (day.sessions) {
            const sessions = Array.isArray(day.sessions)
              ? day.sessions
              : Object.values(day.sessions);
            list = [...list, ...sessions];
          }
        });
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setFinishedSessions(list);
    });

    // Cleanup listeners saat unmount
    return () => {
      unsubActive();
      unsubDaily();
    };
  }, []);

  // Handle URL param untuk auto-redirect ke play page
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      router.replace(`/game/play/${sessionId}`);
    }
  }, [searchParams, router]);

  const startNewGame = async (playerList: string[], groupName: string) => {
    const sessionId = `session_${Date.now()}`;
    const initialAccumulated: Record<string, number> = {};
    playerList.forEach((p) => (initialAccumulated[p] = 0));

    const newSession: GameSession = {
      id: sessionId,
      groupName,
      date: new Date().toISOString().split('T')[0],
      players: playerList,
      rounds: [
        {
          roundNumber: 1,
          roundWinner: '',
          scores: Object.fromEntries(playerList.map((p) => [p, 0])),
          accumulated: initialAccumulated,
        },
      ],
      timestamp: Date.now(),
      isFinished: false,
    };

    await set(ref(db, `activeSessions/${sessionId}`), newSession);
    setShowPlayerInput(false);
    setShowGroupSelector(false);

    router.push(`/game/play/${sessionId}`);
  };

  const forceStopGame = async (session: GameSession) => {
    if (
      !confirm(
        'Yakin ingin menghentikan permainan ini?\n\nPermainan akan diakhiri dan riwayat akan disimpan.'
      )
    )
      return;

    const lastRound = session.rounds[session.rounds.length - 1];
    const accumulated = lastRound.accumulated;

    const sorted = Object.entries(accumulated).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const minValue = Math.min(...Object.values(accumulated));
    const losers = Object.entries(accumulated)
      .filter(([, v]) => v === minValue)
      .map(([name]) => name);

    const finishedSession: GameSession = {
      ...session,
      rounds: session.rounds,
      winner,
      losers,
      isFinished: true,
    };

    await set(
      ref(db, `dailyStandings/${finishedSession.date}/sessions/${finishedSession.id}`),
      finishedSession
    );

    await updateStandings(winner, losers);
    await remove(ref(db, `activeSessions/${session.id}`));
  };

  const updateStandings = async (winner: string, losers: string[]) => {
    const winnerRef = ref(db, `standings/${winner}`);
    const winnerSnap = await get(winnerRef);
    await set(winnerRef, {
      name: winner,
      wins: (winnerSnap.exists() ? winnerSnap.val().wins || 0 : 0) + 1,
      losses: winnerSnap.exists() ? winnerSnap.val().losses || 0 : 0,
    });

    for (const loser of losers) {
      const loserRef = ref(db, `standings/${loser}`);
      const loserSnap = await get(loserRef);
      await set(loserRef, {
        name: loser,
        wins: loserSnap.exists() ? loserSnap.val().wins || 0 : 0,
        losses: (loserSnap.exists() ? loserSnap.val().losses || 0 : 0) + 1,
      });
    }
  };

  const viewSessionHistory = (session: GameSession) => {
    setSelectedSessionHistory(session);
    setShowHistoryModal(true);
  };

  // Grouping berdasarkan grup
  const groupedHistory = finishedSessions.reduce((acc, session) => {
    if (!acc[session.groupName]) acc[session.groupName] = [];
    acc[session.groupName].push(session);
    return acc;
  }, {} as Record<string, GameSession[]>);

  // Import get untuk updateStandings
  const { get } = require('firebase/database');

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Memuat dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">🎮 Dashboard Permainan</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm md:text-base transition-colors"
          >
            ← Landing Page
          </button>
        </div>

        {/* Tombol Mulai Permainan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowPlayerInput(true)}
            className="p-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-lg shadow-lg text-left transition-all hover:scale-[1.02] hover:shadow-xl"
          >
            👥 Input Pemain Baru
            <span className="block text-sm font-normal text-blue-100 mt-1">
              Buat group otomatis & mulai permainan
            </span>
          </button>
          <button
            onClick={() => setShowGroupSelector(true)}
            className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-2xl font-bold text-lg shadow-lg text-left transition-all hover:scale-[1.02] hover:shadow-xl"
          >
            📁 Gunakan Group Pemain
            <span className="block text-sm font-normal text-green-100 mt-1">
              Pilih dari group yang sudah tersimpan
            </span>
          </button>
        </div>

        {/* Permainan Sedang Berlangsung */}
        <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2 text-yellow-400">
          ⏳ Permainan Sedang Berlangsung
        </h2>
        {activeSessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white/5 rounded-xl mb-8">
            Tidak ada permainan yang sedang berlangsung.
          </p>
        ) : (
          <div className="space-y-3 mb-8">
            {activeSessions.map((session, idx) => (
              <div
                key={session.id}
                className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-yellow-500/30 transition-all hover:bg-white/15"
                style={{
                  animation: `fadeInRow 0.3s ease-out ${idx * 0.05}s both`,
                }}
              >
                <div>
                  <h3 className="font-bold text-lg text-yellow-400">
                    Group: {session.groupName}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {session.players.join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ronde saat ini:{' '}
                    {session.rounds[session.rounds.length - 1]?.roundNumber || 1}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/game/play/${session.id}`)}
                    className="flex-1 md:flex-none px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg font-semibold text-sm transition-colors"
                  >
                    ▶ Lanjutkan
                  </button>
                  <button
                    onClick={() => forceStopGame(session)}
                    className="flex-1 md:flex-none px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 border border-orange-500/50 rounded-lg text-sm font-semibold transition-colors"
                  >
                    ⏹ Hentikan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KLASEMEN SEMUA PERMAINAN - LIMIT 5 PER GRUP */}
        <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2 text-blue-400">
          📊 Klasemen Semua Permainan
        </h2>

        {Object.keys(groupedHistory).length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white/5 rounded-xl">
            Belum ada riwayat permainan yang selesai.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([groupName, sessions], gIdx) => {
              // Grouping berdasarkan tanggal
              const byDate = sessions.reduce((acc, session) => {
                if (!acc[session.date]) acc[session.date] = [];
                acc[session.date].push(session);
                return acc;
              }, {} as Record<string, GameSession[]>);

              const sortedDates = Object.keys(byDate).sort((a, b) =>
                b.localeCompare(a)
              );

              const totalHistory = sessions.length;
              const showViewAll = totalHistory > 5;

              // FIX #2: Hanya tampilkan 5 data pertama
              const displayedSessions = sessions.slice(0, 5);

              // Re-group displayed sessions by date
              const displayedByDate = displayedSessions.reduce((acc, session) => {
                if (!acc[session.date]) acc[session.date] = [];
                acc[session.date].push(session);
                return acc;
              }, {} as Record<string, GameSession[]>);

              const displayedDates = Object.keys(displayedByDate).sort((a, b) =>
                b.localeCompare(a)
              );

              return (
                <div
                  key={groupName}
                  className="bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all"
                  style={{
                    animation: `fadeInRow 0.3s ease-out ${gIdx * 0.08}s both`,
                  }}
                >
                  {/* Header Grup */}
                  <div className="bg-white/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span className="font-bold text-lg">{groupName}</span>
                      <span className="text-sm font-normal text-gray-400">
                        ({totalHistory} sesi)
                      </span>
                    </div>
                    {showViewAll && (
                      <button
                        onClick={() =>
                          router.push(
                            `/game/history?group=${encodeURIComponent(groupName)}`
                          )
                        }
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        Lihat Semua ({totalHistory - 5} lagi) →
                      </button>
                    )}
                  </div>

                  {/* Konten per Tanggal - HANYA 5 DATA */}
                  <div className="divide-y divide-white/5">
                    {displayedDates.map((date) => {
                      const dateSessions = displayedByDate[date];
                      const sortedSessions = [...dateSessions].sort(
                        (a, b) => b.timestamp - a.timestamp
                      );

                      return (
                        <div key={date} className="p-3">
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                            <span>📅</span>
                            <span className="font-semibold">
                              {new Date(date).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-xs">
                              ({dateSessions.length} sesi)
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-black/20 text-gray-400 text-xs">
                                <tr>
                                  <th className="py-2 px-3 text-left">Waktu</th>
                                  <th className="py-2 px-3 text-left">Pemenang</th>
                                  <th className="py-2 px-3 text-left">Pecundang</th>
                                  <th className="py-2 px-3 text-center">Ronde</th>
                                  <th className="py-2 px-3 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedSessions.map((session) => (
                                  <tr
                                    key={session.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                  >
                                    <td className="py-2 px-3 text-gray-300">
                                      {new Date(
                                        session.timestamp
                                      ).toLocaleTimeString('id-ID')}
                                    </td>
                                    <td className="py-2 px-3 text-yellow-400 font-bold">
                                      👑 {session.winner || '-'}
                                    </td>
                                    <td className="py-2 px-3 text-red-400">
                                      💀 {session.losers?.join(', ') || '-'}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono">
                                      {session.rounds.length}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        onClick={() => viewSessionHistory(session)}
                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded text-xs transition-colors"
                                      >
                                        📜 Detail
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showPlayerInput && (
          <PlayerInputModal
            onClose={() => setShowPlayerInput(false)}
            onStart={(players) =>
              startNewGame(
                players,
                `Group ${activeSessions.length + finishedSessions.length + 1}`
              )
            }
          />
        )}
        {showGroupSelector && (
          <PlayerGroupSelector
            onClose={() => setShowGroupSelector(false)}
            onSelect={(players, groupName) => startNewGame(players, groupName)}
          />
        )}
        {showHistoryModal && selectedSessionHistory && (
          <RoundHistoryModal
            session={selectedSessionHistory}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </main>
  );
}

export default function GameDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          Memuat dashboard...
        </div>
      }
    >
      <GameDashboardContent />
    </Suspense>
  );
}