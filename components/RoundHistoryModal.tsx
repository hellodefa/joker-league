import { GameSession } from '@/types';

interface Props {
  session: GameSession;
  onClose: () => void;
}

export default function RoundHistoryModal({ session, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-2xl w-full border border-white/20 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">📜 Riwayat Permainan</h2>

        <div className="bg-black/30 rounded-lg p-3 mb-4">
          <p>
            <strong>Tanggal:</strong> {session.date}
          </p>
          <p>
            <strong>Pemain:</strong> {session.players.join(', ')}
          </p>
          <p>
            <strong>Pemenang:</strong>{' '}
            <span className="text-yellow-400">{session.winner}</span>
          </p>
          <p>
  <strong>Pecundang:</strong>{' '}
  <span className="text-red-400 font-bold">
    {session.losers?.join(', ') || '-'}
  </span>
</p>
        </div>

        <h3 className="text-lg font-bold mb-2">Detail Per Ronde:</h3>
        <div className="space-y-2">
          {session.rounds.map((r) => (
            <div key={r.roundNumber} className="bg-black/30 rounded-lg p-3">
              <p className="font-bold mb-2">Ronde {r.roundNumber}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-1 text-left">Pemain</th>
                    <th className="py-1 text-center">Nilai Ronde</th>
                    <th className="py-1 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {session.players.map((p) => (
                    <tr key={p} className="border-b border-white/10">
                      <td className="py-1">{p}</td>
                      <td className="py-1 text-center">
                        {r.scores[p] >= 0 ? '+' : ''}
                        {r.scores[p]}
                      </td>
                      <td className="py-1 text-center text-yellow-400 font-bold">
                        {r.accumulated[p]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}