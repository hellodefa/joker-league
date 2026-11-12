'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession } from '@/types';
import Link from 'next/link';
import SkeletonList from '@/components/SkeletonList';
import PlayerDetailModal from '@/components/PlayerDetailModal';

interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  totalGames: number;
}

export default function LandingPage() {
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const dailyRef = ref(db, 'dailyStandings');
    const unsubscribe = onValue(dailyRef, (snapshot) => {
      let sessions: GameSession[] = [];

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach((day: any) => {
          if (day.sessions) {
            const daySessions = Array.isArray(day.sessions)
              ? day.sessions
              : Object.values(day.sessions);
            sessions = [...sessions, ...daySessions];
          }
        });
      }

      sessions.sort((a, b) => b.timestamp - a.timestamp);
      setAllSessions(sessions);

      const statsMap = new Map<string, PlayerStats>();

      sessions.forEach((session) => {
        session.players.forEach((player) => {
          if (!statsMap.has(player)) {
            statsMap.set(player, {
              name: player,
              wins: 0,
              losses: 0,
              totalGames: 0,
            });
          }

          const stats = statsMap.get(player)!;
          stats.totalGames++;

          if (session.winner === player) {
            stats.wins++;
          }

          if (session.losers?.includes(player)) {
            stats.losses++;
          }
        });
      });

      setPlayerStats(Array.from(statsMap.values()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const winners = [...playerStats]
    .filter((p) => p.wins > 0)
    .sort((a, b) => b.wins - a.wins);

  const losers = [...playerStats]
    .filter((p) => p.losses > 0)
    .sort((a, b) => b.losses - a.losses);

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-600/40 to-yellow-400/20 border-yellow-400/50 text-yellow-300 scale-105 shadow-lg shadow-yellow-500/20';
    if (index === 1) return 'bg-gradient-to-r from-gray-400/40 to-gray-300/20 border-gray-300/50 text-gray-200';
    if (index === 2) return 'bg-gradient-to-r from-orange-700/40 to-orange-500/20 border-orange-500/50 text-orange-200';
    return 'bg-white/5 border-white/10 text-gray-300';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          {/* LOGO */}
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="Joker League Logo"
              width={120}
              height={120}
              className="drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
            Liga Joker by HelloDefa
          </h1>
          <p className="text-gray-300">Aplikasi Catatan Klasemen Joker na Anak-anaka</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-yellow-400">🏆 Klasemen All time Pemerintah</h2>
              <SkeletonList count={5} type="card" />
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-red-400">💀 Klasemen All time Penyepong Prabowo</h2>
              <SkeletonList count={5} type="card" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-yellow-400">🏆 Tabel Pemenang</h2>
              {winners.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada pemenang</p>
              ) : (
                <div className="space-y-2">
                  {winners.map((p, i) => (
                    <div
                      key={p.name}
                      onClick={() => setSelectedPlayer(p.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${getRankStyle(i)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xl md:text-2xl font-bold w-8 text-center ${i < 3 ? 'scale-110' : ''}`}>
                          {getRankIcon(i)}
                        </span>
                        <span className={`font-semibold ${i < 3 ? 'text-lg md:text-xl' : 'text-base'}`}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg md:text-xl">{p.wins}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-red-400">💀 Tabel Pecundang</h2>
              {losers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada pecundang</p>
              ) : (
                <div className="space-y-2">
                  {losers.map((p, i) => (
                    <div
                      key={p.name}
                      onClick={() => setSelectedPlayer(p.name)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${
                        i === 0 ? 'bg-red-900/40 border-red-500/50 text-red-200' : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold w-8 text-center">{i === 0 ? '💀' : `#${i + 1}`}</span>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{p.losses}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/game"
            className="inline-block px-8 md:px-10 py-4 bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 rounded-full text-lg md:text-xl font-bold shadow-lg transform hover:scale-105 transition"
          >
            🎮 Buka Dashboard Permainan
          </Link>
        </div>

        {selectedPlayer && (
          <PlayerDetailModal
            isOpen={!!selectedPlayer}
            playerName={selectedPlayer}
            allSessions={allSessions}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </div>
    </main>
  );
}