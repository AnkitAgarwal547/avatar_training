import { NextResponse } from 'next/server';

/**
 * Minimal TTS proxy endpoint.
 * TalkingHead requires a ttsEndpoint to be provided at init — this route
 * satisfies that requirement. Our actual audio comes from speakAudio() calls
 * driven by the WebSocket server's Kokoro TTS output.
 */
export async function POST() {
  // Return empty audio — actual TTS is done via Kokoro on the WS server
  return NextResponse.json({ audioContent: '' });
}
