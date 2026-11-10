'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ref, get, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession, RoundData } from '@/types';
import GameTable from '@/components/GameTable';
import RoundHistoryModal from '@/components/RoundHistoryModal';

function GamePlayContent() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<GameSession | null>(null);
  const [dailySessions, setDailySessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGameEndedModal, setShowGameEndedModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<GameSession | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      loadDailySessions();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const snap = await get(ref(db, `activeSessions/${sessionId}`));
      if (snap.exists()) {
        const data = snap.val();
        setSession({
          ...data,
          rounds: Array.isArray(data.rounds) ? data.rounds : Object.values(data.rounds || {})
        });
      } else {
        alert('Sesi permainan tidak ditemukan atau sudah selesai.');
        router.push('/game');
      }
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDailySessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snap = await get(ref(db, `dailyStandings/${today}/sessions`));
      if (snap.exists()) {
        const data = snap.val();
        const sessions = Object.values(data).map((s: any) => ({
          ...s,
          rounds: Array.isArray(s.rounds) ? s.rounds : Object.values(s.rounds || {})
        }));
        sessions.sort((a: GameSession, b: GameSession) => b.timestamp - a.timestamp);
        setDailySessions(sessions);
      }
    } catch (err) {
      console.error('Error loading daily sessions:', err);
    }
  };

  const handleRoundInput = async (deltaScores: Record<string, number>, roundWinner: string) => {
    if (!session) return;

    const lastRound = session.rounds[session.rounds.length - 1];
    const newAccumulated: Record<string, number> = {};
    
    session.players.forEach((player) => {
      newAccumulated[player] = (lastRound.accumulated[player] ?? 0) + (deltaScores[player] ?? 0);
    });

    const completedRound: RoundData = {
      roundNumber: lastRound.roundNumber,
      roundWinner,
      scores: deltaScores,
      accumulated: newAccumulated,
    };

    const playersAbove500 = Object.entries(newAccumulated).filter(([, value]) => value >= 500);
    const updatedRounds = [...session.rounds.slice(0, -1), completedRound];

    if (playersAbove500.length > 0) {
      const sorted = Object.entries(newAccumulated).sort((a, b) => b[1] - a[1]);
      const winner = sorted[0][0];
      const minValue = Math.min(...Object.values(newAccumulated));
      const losers = Object.entries(newAccumulated).filter(([, v]) => v === minValue).map(([name]) => name);

      const updatedSession: GameSession = {
        ...session,
        rounds: updatedRounds,
        winner,
        losers,
      };

      setSession(updatedSession);
      setShowGameEndedModal(true);
      
      // FIX: Simpan ke activeSessions agar tidak hilang jika refresh
      await set(ref(db, `activeSessions/${session.id}`), updatedSession);
    } else {
      const nextRound: RoundData = {
        roundNumber: lastRound.roundNumber + 1,
        roundWinner: '',
        scores: Object.fromEntries(session.players.map((p) => [p, 0])),
        accumulated: newAccumulated,
      };
      
      const updatedSession: GameSession = { 
        ...session, 
        rounds: [...updatedRounds, nextRound] 
      };
      
      setSession(updatedSession);
      await set(ref(db, `activeSessions/${session.id}`), updatedSession);
    }
  };

  // FIX: Fungsi untuk menyimpan sesi yang sudah selesai ke riwayat dan update standings
  const saveFinishedSession = async (sessionToSave: GameSession) => {
    if (!sessionToSave.winner || !sessionToSave.losers) return;

    const finishedSession: GameSession = {
      ...sessionToSave,
      isFinished: true,
    };

    // 1. Simpan ke riwayat harian
    await set(ref(db, `dailyStandings/${finishedSession.date}/sessions/${finishedSession.id}`), finishedSession);
    
    // 2. Update klasemen utama
    await updateStandings(sessionToSave.winner, sessionToSave.losers);
    
    // 3. Hapus dari sesi aktif
    await remove(ref(db, `activeSessions/${sessionToSave.id}`));
  };

  const forceStopGame = async (sessionToStop: GameSession) => {
    const lastRound = sessionToStop.rounds[sessionToStop.rounds.length - 1];
    const accumulated = lastRound.accumulated;
    
    const sorted = Object.entries(accumulated).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const minValue = Math.min(...Object.values(accumulated));
    const losers = Object.entries(accumulated).filter(([, v]) => v === minValue).map(([name]) => name);

    const finishedSession: GameSession = {
      ...sessionToStop,
      rounds: sessionToStop.rounds,
      winner,
      losers,
      isFinished: true,
    };

    await saveFinishedSession(finishedSession);
    router.push('/game');
  };

  const handleBackToDashboard = async () => {
    if (!session) return;
    
    // Jika game sudah selesai (modal terbuka), simpan dulu sebelum kembali
    if (showGameEndedModal && session.winner && session.losers) {
      await saveFinishedSession(session);
      router.push('/game');
      return;
    }
    
    const completedRoundsCount = session.rounds.length - 1;

    if (completedRoundsCount >= 1 && !session.isFinished) {
      if (confirm('Anda memiliki ronde yang telah selesai. Kembali ke dashboard akan mengakhiri permainan ini dan menyimpan skor saat ini sebagai riwayat. Lanjutkan?')) {
        await forceStopGame(session);
      }
    } else if (completedRoundsCount === 0) {
      if (confirm('Belum ada ronde yang selesai. Sesi ini akan dihapus permanen. Yakin ingin membatalkan?')) {
        await remove(ref(db, `activeSessions/${session.id}`));
        router.push('/game');
      }
    } else {
      router.push('/game');
    }
  };

 const resetGame = async () => {
  if (!session || !session.winner || !session.losers) return;

  // 1. Simpan sesi saat ini sebagai riwayat selesai
  await saveFinishedSession(session);

  // 2. FIX: Generate ID BARU untuk sesi baru agar tidak override riwayat lama
  const newSessionId = `session_${Date.now()}`;

  // 3. Buat objek sesi BARU yang BERSIH
  const initialAccumulated: Record<string, number> = {};
  session.players.forEach((p) => (initialAccumulated[p] = 0));

  const cleanSession: GameSession = {
    id: newSessionId, // ✅ ID BARU
    groupName: session.groupName,
    date: new Date().toISOString().split('T')[0],
    players: session.players,
    rounds: [{
      roundNumber: 1,
      roundWinner: '',
      scores: Object.fromEntries(session.players.map((p) => [p, 0])),
      accumulated: initialAccumulated,
    }],
    timestamp: Date.now(),
    isFinished: false,
  };

  // 4. Simpan session baru ke activeSessions dengan ID baru
  await set(ref(db, `activeSessions/${newSessionId}`), cleanSession);

  // 5. Update state lokal dan tutup modal
  setSession(cleanSession);
  setShowGameEndedModal(false);
  
  // 6. FIX: Redirect ke URL baru agar konsisten dengan ID baru
  router.replace(`/game/play/${newSessionId}`);
  
  // 7. Refresh klasemen harian
  loadDailySessions();
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

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Memuat permainan...</div>;
  }

  if (!session) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Sesi tidak ditemukan</div>;
  }

  const lastRound = session.rounds[session.rounds.length - 1];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">🎮 {session.groupName}</h1>
            <p className="text-sm text-gray-400">{new Date(session.timestamp).toLocaleString('id-ID')}</p>
          </div>
          <button 
            onClick={handleBackToDashboard} 
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm flex items-center gap-2"
          >
            ← Kembali ke Dashboard
          </button>
        </div>

        <GameTable
          players={session.players}
          currentRound={lastRound}
          roundHistory={session.rounds.slice(0, -1)}
          onRoundSubmit={handleRoundInput}
          gameEnded={showGameEndedModal}
        />

        {/* KLASEMEN HARIAN */}
        <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            📊 Klasemen Harian ({new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })})
          </h2>
          
          {dailySessions.length === 0 ? (
            <p className="text-gray-400 text-center py-6 bg-black/20 rounded-xl">Belum ada permainan yang selesai hari ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/30 text-gray-300">
                  <tr>
                    <th className="py-3 px-4 text-left">Waktu</th>
                    <th className="py-3 px-4 text-left">Group</th>
                    <th className="py-3 px-4 text-left">Pemenang</th>
                    <th className="py-3 px-4 text-left">Pecundang</th>
                    <th className="py-3 px-4 text-center">Ronde</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySessions.map((s) => (
                    <tr key={s.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-gray-300">{new Date(s.timestamp).toLocaleTimeString('id-ID')}</td>
                      <td className="py-3 px-4 font-semibold">{s.groupName}</td>
                      <td className="py-3 px-4 text-yellow-400 font-bold">{s.winner || '-'}</td>
                      <td className="py-3 px-4 text-red-400">{s.losers?.join(', ') || '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">{s.rounds.length}</td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => {
                            setSelectedHistorySession(s);
                            setShowHistoryModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold transition"
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
        </div>

        {/* MODAL PERMAINAN SELESAI */}
        {showGameEndedModal && session.winner && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border-2 border-yellow-500/50 shadow-2xl text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">Permainan Selesai!</h2>
              
              <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-2">
                <p className="text-lg">
                  Pemenang: <span className="font-bold text-white text-xl">{session.winner}</span>
                </p>
                <p className="text-lg">
                  Pecundang: <span className="font-bold text-red-400 text-xl">{session.losers?.join(', ')}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={resetGame}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-bold text-lg shadow-lg transition"
                >
                  🔄 Reset ke 0 & Lanjutkan
                </button>
                <button
                  onClick={handleBackToDashboard}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition"
                >
                  ← Kembali ke Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {showHistoryModal && selectedHistorySession && (
          <RoundHistoryModal
            session={selectedHistorySession}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </main>
  );
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Memuat permainan...</div>}>
      <GamePlayContent />
    </Suspense>
  );
}