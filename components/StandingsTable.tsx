import { PlayerStanding } from '@/types';

interface Props {
  title: string;
  data: PlayerStanding[];
  type: 'winner' | 'loser';
  emptyText: string;
}

export default function StandingsTable({ title, data, type, emptyText }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
      {data.length === 0 ? (
        <p className="text-center text-gray-400 py-8">{emptyText}</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              <th className="py-2 text-left">Peringkat</th>
              <th className="py-2 text-left">Nama</th>
              <th className="py-2 text-right">
                {type === 'winner' ? 'Jumlah Menang' : 'Jumlah Kalah'}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.name} className="border-b border-white/10 hover:bg-white/5">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-semibold">{p.name}</td>
                <td className="py-2 text-right">
                  {type === 'winner' ? p.wins : p.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}