'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GameSession } from '@/types';
import RoundHistoryModal from '@/components/RoundHistoryModal';

// ============================================
// HELPER: Highlight kata kunci dalam text
// ============================================
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightText({
  text,
  keyword,
  className = '',
}: {
  text: string;
  keyword: string;
  className?: string;
}) {
  if (!keyword.trim()) return <span className={className}>{text}</span>;

  const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-400/60 text-yellow-950 rounded px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);

  // ============================================
  // REAL-TIME LISTENER
  // ============================================
  useEffect(() => {
    const dailyRef = ref(db, 'dailyStandings');
    const unsubscribe = onValue(dailyRef, (snapshot) => {
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
      setAllSessions(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // FILTER: Hanya berdasarkan field yang ditampilkan
  // ============================================
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return allSessions;

    const term = searchTerm.toLowerCase().trim();

    return allSessions.filter((s) => {
      // Field yang ditampilkan di tabel:
      // 1. Tanggal (date)
      const dateStr = s.date.toLowerCase();
      const formattedDate = new Date(s.date).toLocaleDateString('id-ID').toLowerCase();
      
      // 2. Waktu (timestamp)
      const timeStr = new Date(s.timestamp).toLocaleTimeString('id-ID').toLowerCase();
      
      // 3. Pemenang (winner)
      const winner = (s.winner || '').toLowerCase();
      
      // 4. Pecundang (losers)
      const losers = (s.losers || []).join(' ').toLowerCase();
      
      // 5. Jumlah ronde (rounds.length)
      const roundCount = String(s.rounds.length);

      // Cek apakah term cocok dengan salah satu field
      return (
        dateStr.includes(term) ||
        formattedDate.includes(term) ||
        timeStr.includes(term) ||
        winner.includes(term) ||
        losers.includes(term) ||
        roundCount.includes(term)
      );
    });
  }, [allSessions, searchTerm]);

  // Grouping: Grup → Tanggal (untuk display)
  const groupedHistory = useMemo(() => {
    return filteredSessions.reduce((acc, session) => {
      if (!acc[session.groupName]) acc[session.groupName] = [];
      acc[session.groupName].push(session);
      return acc;
    }, {} as Record<string, GameSession[]>);
  }, [filteredSessions]);

  const isSearching = searchTerm.trim() !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Memuat riwayat...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              📚 Riwayat Semua Permainan
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Total: {allSessions.length} sesi • Ditampilkan:{' '}
              {filteredSessions.length} sesi
            </p>
          </div>
          <button
            onClick={() => router.push('/game')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm md:text-base self-start md:self-auto transition-colors"
          >
            ← Kembali ke Dashboard
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
          <label className="block text-sm font-semibold mb-2 text-gray-300">
            🔍 Cari berdasarkan pemenang, pecundang, jumlah ronde, tanggal, atau waktu
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Contoh: Andi, Budi, 5, 2026-11-11, 14:30..."
              className="w-full px-4 py-3 pl-11 bg-black/40 border border-white/20 rounded-lg text-white outline-none focus:border-blue-400 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔎
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Quick Filter Examples */}
          <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-400">
            <span>Contoh pencarian:</span>
            <button
              onClick={() => setSearchTerm(new Date().toLocaleDateString('id-ID'))}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              📅 Hari ini
            </button>
            <button
              onClick={() => setSearchTerm('5')}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              🎯 5 ronde
            </button>
          </div>
        </div>

        {/* Info Filter Aktif */}
        {isSearching && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 transition-all">
            <span className="text-yellow-400 font-bold">✨</span>
            <span className="text-yellow-200 text-sm">
              Menampilkan <b>{filteredSessions.length}</b> hasil untuk{' '}
              <b className="bg-black/30 px-2 py-0.5 rounded">"{searchTerm}"</b>
            </span>
          </div>
        )}

        {/* Hasil */}
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-400">
              {isSearching
                ? 'Tidak ada hasil yang cocok dengan pencarian Anda.'
                : 'Belum ada riwayat permainan.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([groupName, sessions], gIdx) => {
              const byDate = sessions.reduce((acc, session) => {
                if (!acc[session.date]) acc[session.date] = [];
                acc[session.date].push(session);
                return acc;
              }, {} as Record<string, GameSession[]>);

              const sortedDates = Object.keys(byDate).sort((a, b) =>
                b.localeCompare(a)
              );

              return (
                <div
                  key={groupName}
                  className={`bg-white/5 rounded-xl border overflow-hidden transition-all ${
                    isSearching
                      ? 'border-yellow-400/50 shadow-lg shadow-yellow-500/10'
                      : 'border-white/10'
                  }`}
                  style={{
                    animation: `fadeInRow 0.3s ease-out ${gIdx * 0.08}s both`,
                  }}
                >
                  {/* Header Grup */}
                  <div
                    className={`p-3 flex items-center justify-between transition-colors ${
                      isSearching ? 'bg-yellow-500/10' : 'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span className="font-bold text-lg">{groupName}</span>
                      <span className="text-sm font-normal text-gray-400">
                        ({sessions.length} sesi)
                      </span>
                    </div>
                    {isSearching && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                        ✨ Match
                      </span>
                    )}
                  </div>

                  {/* Konten per Tanggal */}
                  <div className="divide-y divide-white/5">
                    {sortedDates.map((date) => {
                      const dateSessions = byDate[date];
                      const sortedSessions = [...dateSessions].sort(
                        (a, b) => b.timestamp - a.timestamp
                      );

                      const formattedDate = new Date(date).toLocaleDateString(
                        'id-ID',
                        {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }
                      );

                      return (
                        <div key={date} className="p-3">
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                            <span>📅</span>
                            <HighlightText
                              text={formattedDate}
                              keyword={searchTerm}
                              className="font-semibold"
                            />
                            <span className="text-xs">
                              ({dateSessions.length} sesi)
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-black/20 text-gray-400 text-xs">
                                <tr>
                                  <th className="py-2 px-3 text-left">
                                    Tanggal & Waktu
                                  </th>
                                  <th className="py-2 px-3 text-left">Pemenang</th>
                                  <th className="py-2 px-3 text-left">Pecundang</th>
                                  <th className="py-2 px-3 text-center">Ronde</th>
                                  <th className="py-2 px-3 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedSessions.map((session, sIdx) => {
                                  const timeStr = new Date(
                                    session.timestamp
                                  ).toLocaleTimeString('id-ID');

                                  return (
                                    <tr
                                      key={session.id}
                                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                        isSearching
                                          ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
                                          : ''
                                      }`}
                                      style={{
                                        animation: `fadeInRow 0.3s ease-out ${
                                          sIdx * 0.03
                                        }s both`,
                                      }}
                                    >
                                      <td className="py-2 px-3">
                                        <HighlightText
                                          text={session.date}
                                          keyword={searchTerm}
                                          className="font-semibold text-gray-200 block"
                                        />
                                        <HighlightText
                                          text={timeStr}
                                          keyword={searchTerm}
                                          className="text-xs text-gray-400"
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-yellow-400 font-bold">
                                        👑{' '}
                                        <HighlightText
                                          text={session.winner || '-'}
                                          keyword={searchTerm}
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-red-400">
                                        💀{' '}
                                        <HighlightText
                                          text={session.losers?.join(', ') || '-'}
                                          keyword={searchTerm}
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono">
                                        <HighlightText
                                          text={String(session.rounds.length)}
                                          keyword={searchTerm}
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <button
                                          onClick={() => {
                                            setSelectedSession(session);
                                            setShowHistoryModal(true);
                                          }}
                                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded text-xs transition-colors"
                                        >
                                          📜 Detail
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
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

        {/* Modal Riwayat Detail */}
        {showHistoryModal && selectedSession && (
          <RoundHistoryModal
            session={selectedSession}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          Memuat...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}