export interface RequestSong {
  rank: number;
  lw: string;
  title: string;
  artist: string;
  spotifyId: string | null;
  isMapped: boolean;
}

export interface RequestChart {
  id: string;
  name: string;
  date: string;
  dbDate: string;
  isUpToDate: boolean;
  songs: RequestSong[];
  error?: string;
}

export interface SpotifySearchResult {
  id: string;
  title: string;
  artists: string[];
  image?: string;
  uri: string;
}


