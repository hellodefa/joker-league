export interface PlayerStanding {
  name: string;
  wins: number;
  losses: number;
  history?: { date: string; result: 'win' | 'loss' }[]; // Untuk riwayat di landing page
}

export interface RoundData {
  roundNumber: number;
  roundWinner: string;
  scores: Record<string, number>;
  accumulated: Record<string, number>;
}

export interface GameSession {
  id: string;
  groupName: string;
  date: string;
  players: string[];
  rounds: RoundData[];
  winner?: string;
  losers?: string[];
  timestamp: number;
  isFinished: boolean;
}