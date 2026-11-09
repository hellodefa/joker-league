export interface PlayerStanding {
  name: string;
  wins: number;
  losses: number;
}

export interface RoundData {
  roundNumber: number;
  roundWinner: string; // Ubah dari optional (?) menjadi wajib string (default "")
  scores: Record<string, number>;
  accumulated: Record<string, number>;
}

export interface GameSession {
  id: string;
  date: string;
  players: string[];
  rounds: RoundData[];
  winner: string;
  losers: string[];
  timestamp: number;
}

export interface PlayerGroup {
  id: string;
  name: string;
  players: string[];
}