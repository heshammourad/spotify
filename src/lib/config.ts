export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "1a8e8e375a4145c0b67e51b893fb07b1";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "c5db802b1b3f47e28d3f72162ea7fde4";

const rawPrefix = process.env.NEXT_PUBLIC_SUBPATH_PREFIX || "";

export const BASE_PATH = rawPrefix
  ? (rawPrefix.startsWith("/") ? rawPrefix : `/${rawPrefix}`).replace(/\/$/, "")
  : "";

export const getRedirectUri = (reqHeaders?: { 
  host: string | null; 
  forwardedHost?: string | null; 
  forwardedProto?: string | null; 
}) => {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  
  const host = reqHeaders?.forwardedHost || reqHeaders?.host;
  if (host) {
    const protocol = reqHeaders?.forwardedProto || 
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    return `${protocol}://${host}${BASE_PATH}/api/auth/callback`;
  }
  return `https://example.org${BASE_PATH}/api/auth/callback`; // Fallback
};

export const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-private",
  "user-read-email"
].join(" ");

export interface ChartPlaylists {
  number_ones?: string;
  top_tens?: string;
}

export const CHART_PLAYLIST_MAP: Record<string, ChartPlaylists> = {
  "hot-100": {
    number_ones: "23jzCOsR4J3Jhaie2EvQj4"
  },
  "adult-pop-songs": {
    number_ones: "7GOIHMPaFizUWgp5SjBlAP",
    top_tens: "5vRpnGrXJigrFDRmvPuwTQ"
  },
  "country-songs": {
    top_tens: "4V9vE0Hx1N10vOccKHRDDt"
  },
  "country-airplay": {
    number_ones: "1t4DFBDBXuADXKRV0MHuTd",
    top_tens: "0QbRdzU6Ew7vQq6DeGJsGP"
  },
  "dance-electronic-songs": {
    number_ones: "0XHmp48FQkmA29qop9udgy",
    top_tens: "2oCBSTYhkTfmqY5p0xnp3S"
  },
  "alternative-airplay": {
    number_ones: "7l5yL1d8HMUlQiRP2vU4m2",
    top_tens: "69NDNxTpTWgy0qLjBGCiZK"
  },
  "hot-mainstream-rock-tracks": {
    number_ones: "4EQXOVf7jbFyx4iI8mz5pJ",
    top_tens: "3B19zVWNuiAaBcS2vOrzl0"
  },
  "r-and-b-songs": {
    number_ones: "58ZSfnZa8Rz0MBbHpTw0Nf",
    top_tens: "6pjqh5lPggVRBqEv9s4M4q"
  },
  "spotify": {
    number_ones: "2jsguRCxGRwO80VHDtz16o"
  }
};

export const TEMP_PLAYLIST_ID = "5yEhcPD7ZmStRWXvWtgeY2";

export const BILLBOARD_CHARTS = [
  { id: "hot-100", name: "Hot 100", maxSongs: 1 },
  { id: "adult-pop-songs", name: "Adult Pop Airplay", maxSongs: 10 },
  { id: "country-songs", name: "Hot Country Songs", maxSongs: 10 },
  { id: "country-airplay", name: "Country Airplay", maxSongs: 10 },
  { id: "dance-electronic-songs", name: "Hot Dance/Electronic Songs", maxSongs: 10 },
  { id: "alternative-airplay", name: "Alternative Airplay", maxSongs: 10 },
  { id: "hot-mainstream-rock-tracks", name: "Mainstream Rock Airplay", maxSongs: 10 },
  { id: "r-and-b-songs", name: "Hot R&B Songs", maxSongs: 10 }
];
