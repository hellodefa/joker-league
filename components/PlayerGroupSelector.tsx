'use client';

import { useEffect, useState } from 'react';
import { ref, get, push, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { PlayerGroup } from '@/types';

interface Props {
  onClose: () => void;
  onSelect: (players: string[], groupName: string) => void;
}

export default function PlayerGroupSelector({ onClose, onSelect }: Props) {
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [previewGroup, setPreviewGroup] = useState<PlayerGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPlayers, setNewGroupPlayers] = useState<string[]>(['', '', '', '']);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupsRef = ref(db, 'playerGroups');
      const snapshot = await get(groupsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: PlayerGroup[] = Object.entries(data).map(([id, value]: [string, any]) => ({
          id, name: value.name, players: value.players,
        }));
        setGroups(list);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error('Error load groups:', err);
    }
  };

  const handleCreateGroup = async () => {
    const validPlayers = newGroupPlayers.filter((p) => p.trim() !== '');
    if (validPlayers.length < 4 || validPlayers.length > 6) {
      alert('Group harus berisi 4-6 pemain');
      return;
    }
    if (!newGroupName.trim()) {
      alert('Nama group harus diisi');
      return;
    }

    try {
      await push(ref(db, 'playerGroups'), { name: newGroupName, players: validPlayers });
      setNewGroupName('');
      setNewGroupPlayers(['', '', '', '']);
      setShowCreate(false);
      loadGroups();
    } catch (err) {
      console.error('Error create group:', err);
      alert('Gagal membuat group');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Hapus group ini?')) {
      try {
        await remove(ref(db, `playerGroups/${id}`));
        loadGroups();
      } catch (err) {
        console.error('Error delete group:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">📁 Pilih Group Pemain</h2>

        {!showCreate && !previewGroup ? (
          <>
            {groups.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Belum ada group tersimpan</p>
            ) : (
              <div className="space-y-2 mb-4">
                {groups.map((g) => (
                  <div key={g.id} className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold">Group {g.name}</p>
                      <p className="text-sm text-gray-400">{g.players.length} pemain</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewGroup(g)} className="px-3 py-1 bg-blue-500/30 hover:bg-blue-500/50 rounded text-sm">👁 Lihat</button>
                      <button 
                        onClick={() => { onSelect(g.players, g.name); onClose(); }} 
                        className="px-3 py-1 bg-green-500/30 hover:bg-green-500/50 rounded text-sm"
                      >
                        Pilih
                      </button>
                      <button onClick={() => handleDeleteGroup(g.id)} className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-sm">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg">Batal</button>
              <button onClick={() => setShowCreate(true)} className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-lg font-bold">+ Buat Group Baru</button>
            </div>
          </>
        ) : previewGroup ? (
          <>
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <h3 className="text-xl font-bold mb-3">👁 Preview Group {previewGroup.name}</h3>
              
<div className="space-y-2">
  {previewGroup.players.map((player: string, i: number) => (
    <div key={i} className="bg-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
      <span>👤</span>
      <span className="font-semibold">{player}</span>
    </div>
  ))}
</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewGroup(null)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg">← Kembali</button>
              <button 
                onClick={() => { onSelect(previewGroup.players, previewGroup.name); onClose(); }} 
                className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-lg font-bold"
              >
                ✅ Pilih Group Ini
              </button>
            </div>
          </>
        ) : (
          <>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nama Group" className="w-full px-3 py-2 bg-black/30 border border-white/30 rounded mb-3 text-white" />
            <div className="space-y-2 mb-4">
              {newGroupPlayers.map((p, i) => (
                <input key={i} type="text" value={p} onChange={(e) => { const arr = [...newGroupPlayers]; arr[i] = e.target.value; setNewGroupPlayers(arr); }} placeholder={`Pemain ${i + 1}`} className="w-full px-3 py-2 bg-black/30 border border-white/30 rounded text-white" />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg">Kembali</button>
              <button onClick={handleCreateGroup} className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-lg font-bold">Simpan</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}