'use client';

import { useState, useEffect } from 'react';
import { ref, get, push } from 'firebase/database';
import { db } from '@/lib/firebase';

interface Props {
  onClose: () => void;
  onStart: (players: string[]) => void;
}

export default function PlayerInputModal({ onClose, onStart }: Props) {
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [nextGroupNumber, setNextGroupNumber] = useState(1);

  useEffect(() => {
    loadNextGroupNumber();
  }, []);

  const loadNextGroupNumber = async () => {
    try {
      const groupsRef = ref(db, 'playerGroups');
      const snapshot = await get(groupsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const groups = Object.values(data) as any[];
        let maxNum = 0;
        groups.forEach((g) => {
          const num = parseInt(g.name);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        setNextGroupNumber(maxNum + 1);
      }
    } catch (err) {
      console.error('Error load next group number:', err);
    }
  };

  const handleCountChange = (count: number) => {
    setPlayerCount(count);
    setNames((prev) => {
      // Buat array baru dengan ukuran 'count', isi dengan nilai lama jika ada, atau string kosong
      return Array.from({ length: count }, (_, i) => prev[i] || '');
    });
  };

  const handleNameChange = (index: number, value: string) => {
    const newArr = [...names];
    newArr[index] = value;
    setNames(newArr);
  };

  const handleStart = async () => {
    const validNames = names.filter((n) => n.trim() !== '');
    if (validNames.length < 4 || validNames.length > 6) {
      alert('Jumlah pemain harus antara 4 dan 6');
      return;
    }

    try {
      const groupName = String(nextGroupNumber);
      const groupsRef = ref(db, 'playerGroups');
      await push(groupsRef, { name: groupName, players: validNames });
      onStart(validNames);
      onClose();
    } catch (err) {
      console.error('Error create group:', err);
      alert('Gagal membuat group otomatis');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20">
        <h2 className="text-2xl font-bold mb-4">👥 Input Pemain</h2>
        <label className="block mb-2">Jumlah Pemain (4-6):</label>
        <div className="flex gap-2 mb-4">
          {[4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => handleCountChange(n)}
              className={`flex-1 py-2 rounded-lg font-bold ${playerCount === n ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="space-y-2 mb-4">
          {names.map((name, i) => (
            <input
              key={i}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={`Nama Pemain ${i + 1}`}
              className="w-full px-3 py-2 bg-black/30 border border-white/30 rounded text-white"
            />
          ))}
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 text-sm">
          <p className="text-blue-300">💡 Group baru akan otomatis dibuat dengan nama: <b>{nextGroupNumber}</b></p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg">Batal</button>
          <button onClick={handleStart} className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-lg font-bold">Mulai</button>
        </div>
      </div>
    </div>
  );
}