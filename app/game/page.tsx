'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession, RoundData } from '@/types';
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
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllSessions();
  }, []);

  // Handle URL param untuk auto-redirect ke play page
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      router.replace(`/game/play/${sessionId}`);
    }
  }, [searchParams, router]);

  const loadAllSessions = async () => {
    try {
      setLoading(true);
      
      // Load Active Sessions (yang belum selesai)
      const activeRef = ref(db, 'activeSessions');
      const activeSnap = await get(activeRef);
      let activeList: GameSession[] = [];
      if (activeSnap.exists()) {
        activeList = Object.values(activeSnap.val()).map((s: any) => ({
          ...s,
          rounds: Array.isArray(s.rounds) ? s.rounds : Object.values(s.rounds || {})
        })).filter((s: GameSession) => !s.isFinished); // FIX #2: Filter yang belum selesai
      }
      setActiveSessions(activeList);

      // Load Finished Sessions dari dailyStandings
      const dailyRef = ref(db, 'dailyStandings');
      const dailySnap = await get(dailyRef);
      let finishedList: GameSession[] = [];
      if (dailySnap.exists()) {
        const dailyData = dailySnap.val();
        Object.values(dailyData).forEach((day: any) => {
          if (day.sessions) {
            const sessions = Array.isArray(day.sessions) ? day.sessions : Object.values(day.sessions);
            finishedList = [...finishedList, ...sessions];
          }
        });
      }
      finishedList.sort((a, b) => b.timestamp - a.timestamp);
      setFinishedSessions(finishedList);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const startNewGame = async (playerList: string[], groupName: string) => {
    const sessionId = `session_${Date.now()}`;
    const initialAccumulated: Record<string, number> = {};
    playerList.forEach((p) => (initialAccumulated[p] = 0));

    const newSession: GameSession = {
      id: sessionId,
      groupName,
      date: new Date().toISOString().split('T')[0],
      players: playerList,
      rounds: [{
        roundNumber: 1,
        roundWinner: '',
        scores: Object.fromEntries(playerList.map((p) => [p, 0])),
        accumulated: initialAccumulated,
      }],
      timestamp: Date.now(),
      isFinished: false,
    };

    await set(ref(db, `activeSessions/${sessionId}`), newSession);
    setShowPlayerInput(false);
    setShowGroupSelector(false);
    
    // Redirect ke halaman play
    router.push(`/game/play/${sessionId}`);
  };

  const forceStopGame = async (session: GameSession) => {
    if (!confirm('Yakin ingin menghentikan permainan ini?\n\nPermainan akan diakhiri dan riwayat akan disimpan.')) return;

    const lastRound = session.rounds[session.rounds.length - 1];
    const accumulated = lastRound.accumulated;
    
    const sorted = Object.entries(accumulated).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const minValue = Math.min(...Object.values(accumulated));
    const losers = Object.entries(accumulated).filter(([, v]) => v === minValue).map(([name]) => name);

    const finishedSession: GameSession = {
      ...session,
      rounds: session.rounds,
      winner,
      losers,
      isFinished: true,
    };

    // Save ke dailyStandings
    await set(ref(db, `dailyStandings/${finishedSession.date}/sessions/${finishedSession.id}`), finishedSession);
    
    // Update standings
    await updateStandings(winner, losers);
    
    // Remove dari activeSessions
    await remove(ref(db, `activeSessions/${session.id}`));
    
    await loadAllSessions();
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

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Memuat dashboard...</div>;
  }

  const groupedHistory = finishedSessions.reduce((acc, session) => {
    if (!acc[session.groupName]) acc[session.groupName] = [];
    acc[session.groupName].push(session);
    return acc;
  }, {} as Record<string, GameSession[]>);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">🎮 Dashboard Permainan</h1>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm md:text-base">← Landing Page</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button onClick={() => setShowPlayerInput(true)} className="p-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-lg shadow-lg text-left">
            👥 Input Pemain Baru
            <span className="block text-sm font-normal text-blue-100 mt-1">Buat group otomatis & mulai permainan</span>
          </button>
          <button onClick={() => setShowGroupSelector(true)} className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-2xl font-bold text-lg shadow-lg text-left">
            📁 Gunakan Group Pemain
            <span className="block text-sm font-normal text-green-100 mt-1">Pilih dari group yang sudah tersimpan</span>
          </button>
        </div>

        {/* Permainan Sedang Berlangsung */}
        <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2 text-yellow-400">⏳ Permainan Sedang Berlangsung</h2>
        {activeSessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white/5 rounded-xl mb-8">Tidak ada permainan yang sedang berlangsung.</p>
        ) : (
          <div className="space-y-3 mb-8">
            {activeSessions.map((session) => (
              <div key={session.id} className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-yellow-500/30">
                <div>
                  <h3 className="font-bold text-lg text-yellow-400">Group: {session.groupName}</h3>
                  <p className="text-sm text-gray-300">{session.players.join(', ')}</p>
                  <p className="text-xs text-gray-400 mt-1">Ronde saat ini: {session.rounds[session.rounds.length - 1]?.roundNumber || 1}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/game/play/${session.id}`)} className="flex-1 md:flex-none px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg font-semibold text-sm">
                    ▶ Lanjutkan
                  </button>
                  <button onClick={() => forceStopGame(session)} className="flex-1 md:flex-none px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 border border-orange-500/50 rounded-lg text-sm font-semibold">
                    ⏹ Hentikan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Riwayat Semua Permainan */}
        <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2 text-blue-400">📊 Klasemen Semua Permainan</h2>
        {Object.keys(groupedHistory).length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white/5 rounded-xl">Belum ada riwayat permainan yang selesai.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([groupName, sessions]) => (
              <div key={groupName} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-white/10 p-3 font-bold text-lg flex items-center gap-2">
                  📁 Group: {groupName} <span className="text-sm font-normal text-gray-400">({sessions.length} sesi)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black/20 text-gray-300">
                      <tr>
                        <th className="py-3 px-4 text-left">Tanggal & Waktu</th>
                        <th className="py-3 px-4 text-left">Pemenang</th>
                        <th className="py-3 px-4 text-left">Pecundang</th>
                        <th className="py-3 px-4 text-center">Total Ronde</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{session.date}</div>
                            <div className="text-xs text-gray-400">{new Date(session.timestamp).toLocaleTimeString('id-ID')}</div>
                          </td>
                          <td className="py-3 px-4 text-yellow-400 font-bold">{session.winner || '-'}</td>
                          <td className="py-3 px-4 text-red-400">{session.losers?.join(', ') || '-'}</td>
                          <td className="py-3 px-4 text-center font-mono">{session.rounds.length}</td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => viewSessionHistory(session)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded text-xs"
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
            ))}
          </div>
        )}

        {showPlayerInput && (
          <PlayerInputModal 
            onClose={() => setShowPlayerInput(false)} 
            onStart={(players) => startNewGame(players, `Group ${activeSessions.length + finishedSessions.length + 1}`)} 
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
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Memuat dashboard...</div>}>
      <GameDashboardContent />
    </Suspense>
  );
}