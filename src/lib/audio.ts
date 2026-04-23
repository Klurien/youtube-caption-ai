import { spawn } from 'child_process';
import stream from 'stream';

/**
 * Downloads the audio of a YouTube video as a Buffer using yt-dlp.
 */
export async function downloadAudioBuffer(youtubeId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  
  return new Promise((resolve, reject) => {
    // -f "ba" picks the best audio
    // --ext m4a ensures a compact format Gemini likes
    // -o - outputs to stdout
    const ytDlp = spawn('yt-dlp', [
      url,
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'm4a',
      '-o', '-',
    ]);

    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    ytDlp.stdout.on('data', (chunk) => chunks.push(chunk));
    ytDlp.stderr.on('data', (chunk) => errorChunks.push(chunk));

    ytDlp.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errorMsg = Buffer.concat(errorChunks).toString();
        console.error('yt-dlp failed:', errorMsg);
        reject(new Error(`yt-dlp failed with code ${code}`));
      }
    });

    ytDlp.on('error', (err) => {
      reject(err);
    });
  });
}
