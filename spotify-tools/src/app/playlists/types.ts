export interface SpotifyTrack {
  id: string;
  title: string;
  artists: string[];
  uri: string;
  added_at: string;
  position: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  public: boolean;
  collaborative: boolean;
}


