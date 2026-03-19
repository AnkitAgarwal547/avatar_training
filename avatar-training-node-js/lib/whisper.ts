import { nodewhisper } from 'nodejs-whisper';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Transcribe an audio buffer (WAV format) to text using Whisper base.en model.
 * The model is auto-downloaded on first use (~150 MB).
 */
export async function transcribe(audioBuffer: Buffer): Promise<string> {
  const modelName =
    process.env.WHISPER_MODEL?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'tiny.en' : 'base.en');
  const tmpFile = path.join(os.tmpdir(), `audio_${Date.now()}.wav`);

  try {
    fs.writeFileSync(tmpFile, audioBuffer);

    const result = await nodewhisper(tmpFile, {
      modelName,
      autoDownloadModelName: modelName,
      whisperOptions: {
        outputInText: true,
      },
    });

    return typeof result === 'string' ? result.trim() : String(result).trim();
  } finally {
    // Always clean up the temp file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}
