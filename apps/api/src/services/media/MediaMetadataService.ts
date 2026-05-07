import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  bitRate: number | null;
  raw: unknown;
}

interface FfprobeStream {
  codec_name?: string;
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: {
    duration?: string;
    bit_rate?: string;
  };
}

export class MediaMetadataError extends Error {
  readonly code = 'MEDIA_METADATA_FAILED';
}

export async function readVideoMetadataFromFile(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration,bit_rate:stream=codec_type,codec_name,width,height,duration',
      '-of',
      'json',
      filePath,
    ]);
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
    const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
    const duration = Number.parseFloat(parsed.format?.duration || video?.duration || '0');
    const bitRate = parsed.format?.bit_rate ? Number.parseInt(parsed.format.bit_rate, 10) : null;

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('ffprobe returned no video duration');
    }

    return {
      durationSeconds: Math.ceil(duration),
      width: video?.width ?? null,
      height: video?.height ?? null,
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      bitRate: Number.isFinite(bitRate) ? bitRate : null,
      raw: parsed,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown ffprobe error';
    throw new MediaMetadataError(`Unable to read video metadata: ${detail}`);
  }
}

export async function readVideoMetadataFromBuffer(
  buffer: Buffer,
  extension = '.mp4'
): Promise<VideoMetadata> {
  const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const tmpPath = path.join(os.tmpdir(), `smart-pantry-media-${randomUUID()}${safeExtension}`);
  await fs.writeFile(tmpPath, buffer);
  try {
    return await readVideoMetadataFromFile(tmpPath);
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

