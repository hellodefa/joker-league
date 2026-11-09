'use client';

import { useEffect, useState } from 'react';
import { ref, push, get, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function TestFirebase() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      addLog('🔍 Memulai test koneksi Realtime Database...');

      // Test 1: Cek db
      if (!db) {
        throw new Error('Firebase db tidak ter-initialize');
      }
      addLog('✅ Firebase db berhasil di-initialize');

      // Test 2: Cek environment variables
      addLog(`🔑 API Key: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10)}...`);
      addLog(`🗄️ Database URL: ${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}`);

      if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
        throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL tidak ditemukan di .env.local');
      }

      // Test 3: Write data dengan push (auto-generate ID)
      addLog('📝 Mencoba write data ke Realtime Database...');
      const testRef = ref(db, 'test');
      const newDocRef = await push(testRef, {
        message: 'Hello Realtime Database!',
        timestamp: new Date().toISOString(),
      });
      addLog(`✅ Write berhasil! Key: ${newDocRef.key}`);

      // Test 4: Read data
      addLog('📖 Mencoba read data...');
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        addLog(`✅ Read berhasil! Data: ${JSON.stringify(data)}`);
      } else {
        addLog('⚠️ Data kosong (tidak ada data di /test)');
      }

      // Test 5: Test listener (real-time)
      addLog('👂 Mencoba subscribe real-time listener...');
      const listenerRef = ref(db, 'test/' + newDocRef.key);
      onValue(listenerRef, (snap) => {
        if (snap.exists()) {
          addLog(`🔔 Real-time update diterima: ${JSON.stringify(snap.val())}`);
        }
      });

      // Test 6: Update data (trigger listener)
      addLog('✏️ Mencoba update data...');
      await set(listenerRef, {
        message: 'Data sudah di-update!',
        timestamp: new Date().toISOString(),
        updated: true,
      });
      addLog('✅ Update berhasil!');

      setStatus('success');
      addLog('🎉 Semua test Realtime Database berhasil!');
    } catch (error: any) {
      setStatus('error');
      const errorMsg = error?.message || String(error);
      const errorCode = error?.code || 'NO_CODE';
      addLog(`❌ ERROR: ${errorMsg}`);
      addLog(`🔖 Error Code: ${errorCode}`);

      if (errorMsg.includes('Permission denied')) {
        addLog('💡 Solusi: Edit Rules di Realtime Database → tab Rules');
      } else if (errorMsg.includes('databaseURL')) {
        addLog('💡 Solusi: Tambahkan NEXT_PUBLIC_FIREBASE_DATABASE_URL di .env.local');
      }
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">🔌 Realtime Database Test</h1>

      <div
        className={`p-4 rounded-lg mb-4 ${
          status === 'testing'
            ? 'bg-yellow-500/20 border border-yellow-500'
            : status === 'success'
            ? 'bg-green-500/20 border border-green-500'
            : 'bg-red-500/20 border border-red-500'
        }`}
      >
        <p className="text-xl font-bold">
          Status:{' '}
          {status === 'testing'
            ? '⏳ Testing...'
            : status === 'success'
            ? '✅ Success'
            : '❌ Error'}
        </p>
      </div>

      <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
        <h2 className="text-lg font-bold mb-2">📋 Debug Log:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-300 border-b border-gray-700 pb-1">
              {log}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          setLogs([]);
          setStatus('testing');
          testConnection();
        }}
        className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold"
      >
        🔄 Test Ulang
      </button>
    </div>
  );
}