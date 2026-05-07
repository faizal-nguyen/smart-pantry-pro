/**
 * Pulls a Whisper-friendly mono audio track out of a video file using
 * the `ffmpeg` binary. Used by the local-video → AI recipe pipeline:
 * we feed Whisper an audio-only mp3 because (a) it's bandwidth-light
 * (~600 KB/min at 64 kbps mono) and (b) Whisper enforces a 25 MB hard
 * cap per request — a 25 min video at this bitrate stays under it.
 *
 * Requires the `ffmpeg` CLI on PATH. The dev box and the prod image
 * both ship it (`/opt/homebrew/bin/ffmpeg` on darwin; `apt install
 * ffmpeg` on the deploy image). We fail fast with a clear error if
 * the binary is missing.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export class AudioExtractionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly stderrTail?: string
  ) {
    super(message);
    this.name = 'AudioExtractionError';
  }
}

export interface ExtractedAudio {
  /** Absolute path to the mp3 on disk. Caller MUST call `cleanup()`. */
  audioPath: string;
  byteSize: number;
  cleanup: () => Promise<void>;
}

export interface ExtractAudioOptions {
  /** ffmpeg path. Defaults to `ffmpeg` (PATH lookup). */
  ffmpegPath?: string;
  /** Audio bitrate. Default `64k` — Whisper-grade quality. */
  bitrate?: string;
  /** Sample rate Hz. Default 16000 — Whisper's native rate. */
  sampleRate?: number;
  /** Hard timeout in ms. Default 60s. */
  timeoutMs?: number;
}

/**
 * Write the video buffer to a tempfile, run ffmpeg to extract a mono
 * mp3, return its path. The caller MUST call `cleanup()` on the
 * returned object — both the input and output tempfiles live in the
 * same temp directory which `cleanup` removes.
 */
export async function extractAudioFromVideoBuffer(
  videoBuffer: Buffer,
  videoExtension: string,
  options: ExtractAudioOptions = {}
): Promise<ExtractedAudio> {
  const ffmpeg = options.ffmpegPath ?? 'ffmpeg';
  const bitrate = options.bitrate ?? '64k';
  const sampleRate = options.sampleRate ?? 16_000;
  const timeoutMs = options.timeoutMs ?? 60_000;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'audio-extract-'));
  const inputPath = path.join(tmpDir, `input.${videoExtension.replace(/^\./, '')}`);
  const outputPath = path.join(tmpDir, 'audio.mp3');

  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  };

  try {
    await writeFile(inputPath, videoBuffer);

    await runFfmpeg(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        inputPath,
        '-vn', // strip video track
        '-acodec',
        'libmp3lame',
        '-ab',
        bitrate,
        '-ac',
        '1', // mono
        '-ar',
        String(sampleRate),
        '-y',
        outputPath,
      ],
      timeoutMs
    );

    const { size } = await import('node:fs/promises').then((m) => m.stat(outputPath));
    return { audioPath: outputPath, byteSize: size, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

function runFfmpeg(
  bin: string,
  args: string[],
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
      reject(
        new AudioExtractionError(
          'FFMPEG_TIMEOUT',
          `ffmpeg timed out after ${timeoutMs}ms`,
          stderr.slice(-500)
        )
      );
    }, timeoutMs);

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4_000) stderr = stderr.slice(-4_000);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (killed) return;
      const msg =
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? `ffmpeg binary not found (looked at "${bin}"). Install ffmpeg or set FFMPEG_PATH.`
          : err.message;
      reject(new AudioExtractionError('FFMPEG_SPAWN_FAILED', msg));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) return resolve();
      reject(
        new AudioExtractionError(
          'FFMPEG_FAILED',
          `ffmpeg exited with code ${code}`,
          stderr.slice(-500)
        )
      );
    });
  });
}
