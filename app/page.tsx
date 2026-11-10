'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { PlayerStanding } from '@/types';
import Link from 'next/link';

// Komponen Modal Riwayat Sederhana
function HistoryModal({ player, onClose }: { player: PlayerStanding | null, onClose: () => void }) {
  if (!player) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-indigo-900 rounded-2xl p-6 max-w-sm w-full border border-white/20" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">Riwayat: {player.name}</h3>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between p-2 bg-green-500/20 rounded text-green-300">
            <span>Total Menang</span>
            <span className="font-bold">{player.wins}x</span>
          </div>
          <div className="flex justify-between p-2 bg-red-500/20 rounded text-red-300">
            <span>Total Kalah</span>
            <span className="font-bold">{player.losses}x</span>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg">Tutup</button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStanding | null>(null);

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    try {
      const snapshot = await get(ref(db, 'standings'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: PlayerStanding[] = Object.entries(data).map(([name, value]: [string, any]) => ({
          name,
          wins: value.wins || 0,
          losses: value.losses || 0,
        }));
        // Sort descending untuk leaderboard yang masuk akal (paling banyak menang di atas)
        list.sort((a, b) => b.wins - a.wins);
        setStandings(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
            🃏 Joker League
          </h1>
          <p className="text-gray-300">Sistem Pencatat Liga Permainan Joker</p>
        </div>

        {loading ? (
          <div className="text-center py-20">Memuat data klasemen...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Tabel Pemenang */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-yellow-400">🏆 Tabel Pemenang</h2>
              {standings.filter(p => p.wins > 0).length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada pemenang</p>
              ) : (
                <div className="space-y-2">
                  {standings.filter(p => p.wins > 0).map((p, i) => (
                    <div key={p.name} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${getRankStyle(i)}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-xl md:text-2xl font-bold w-8 text-center ${i < 3 ? 'scale-110' : ''}`}>{getRankIcon(i)}</span>
                        <span className={`font-semibold ${i < 3 ? 'text-lg md:text-xl' : 'text-base'}`}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg md:text-xl">{p.wins}</span>
                        <button onClick={() => setSelectedPlayer(p)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs" title="Lihat Riwayat">
                          📜
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabel Pecundang */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center text-red-400">💀 Tabel Pecundang</h2>
              {standings.filter(p => p.losses > 0).length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada pecundang</p>
              ) : (
                <div className="space-y-2">
                  {[...standings].sort((a, b) => b.losses - a.losses).filter(p => p.losses > 0).map((p, i) => (
                    <div key={p.name} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${i === 0 ? 'bg-red-900/40 border-red-500/50 text-red-200' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold w-8 text-center">{i === 0 ? '💀' : `#${i + 1}`}</span>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{p.losses}</span>
                        <button onClick={() => setSelectedPlayer(p)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs" title="Lihat Riwayat">
                          📜
                        </button>
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

        {selectedPlayer && <HistoryModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
      </div>
    </main>
  );
}