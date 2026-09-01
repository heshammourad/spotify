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
  /** ISO timestamp when this data was scraped, set only when serving a stale cached copy after a scrape failure. */
  stale?: string | null;
}

export interface SpotifySearchResult {
  id: string;
  title: string;
  artists: string[];
  image?: string;
  uri: string;
}


