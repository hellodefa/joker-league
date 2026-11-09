'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { PlayerStanding } from '@/types';
import Link from 'next/link';
import StandingsTable from '@/components/StandingsTable';

export default function LandingPage() {
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    try {
      const standingsRef = ref(db, 'standings');
      const snapshot = await get(standingsRef);

      if (snapshot.exists()) {
        const data = snapshot.val(); // { playerName: { wins, losses }, ... }
        const list: PlayerStanding[] = Object.entries(data).map(
          ([name, value]: [string, any]) => ({
            name,
            wins: value.wins || 0,
            losses: value.losses || 0,
          })
        );
        setStandings(list);
      } else {
        setStandings([]);
      }
    } catch (err) {
      console.error('Error load standings:', err);
    } finally {
      setLoading(false);
    }
  };

  const winners = [...standings]
    .filter((p) => p.wins > 0)
    .sort((a, b) => a.wins - b.wins); // ascending

  const losers = [...standings]
    .filter((p) => p.losses > 0)
    .sort((a, b) => a.losses - b.losses); // ascending

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
            🃏 Joker League
          </h1>
          <p className="text-gray-300">Catatan Liga Jokerna Anak-anaka By HelloDefa</p>
        </div>

        {loading ? (
          <div className="text-center py-20">Memuat data...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <StandingsTable
              title="🏆 Tabel Pemenang"
              data={winners}
              type="winner"
              emptyText="Belum ada pemenang"
            />
            <StandingsTable
              title="💀 Tabel Pecundang"
              data={losers}
              type="loser"
              emptyText="Belum ada pecundang"
            />
          </div>
        )}

        <div className="text-center">
          <Link
            href="/game"
            className="inline-block px-10 py-4 bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 transition"
          >
            🎮 Mulai Pencatatan Permainan
          </Link>
        </div>
      </div>
    </main>
  );
}