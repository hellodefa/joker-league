export interface PlayerStanding {
  name: string;
  wins: number;
  losses: number;
}

export interface RoundData {
  roundNumber: number;

  /**
   * Pemenang ronde yang dipilih manual.
   * Ini berbeda dengan pemenang permainan akhir.
   */
  roundWinner?: string;

  /**
   * Selisih nilai ronde ini dibanding ronde sebelumnya.
   * Contoh: sebelumnya 100, sekarang 230, maka scores = +130.
   */
  scores: Record<string, number>;

  /**
   * Total akumulasi pemain setelah ronde ini.
   * Contoh: 230.
   */
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