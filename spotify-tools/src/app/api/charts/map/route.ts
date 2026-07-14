import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addSong } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, title, artists } = await request.json();

    if (!id || !title || !artists) {
      return NextResponse.json({ error: "Missing required parameters: id, title, artists" }, { status: 400 });
    }

    await addSong(id, title, artists);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully mapped "${title}" by "${artists}" to Spotify ID ${id}.` 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save song mapping";
    console.error("Error saving song mapping:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
