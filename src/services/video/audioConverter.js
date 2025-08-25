import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);

class AudioConverter {
  constructor() {
    this.logs = [];
  }

  addLog(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(message, data || '');
  }

  getLogs() {
    return this.logs;
  }

  async convertVideoToAudio(videoBuffer, outputFormat = 'mp3') {
    this.addLog('🎵 [AudioConverter] Starting video to audio conversion...');
    this.addLog('📊 [AudioConverter] Input video size:', videoBuffer.length + ' bytes');
    this.addLog('🎼 [AudioConverter] Output format:', outputFormat);

    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}.mp4`);
    const outputPath = join(tempDir, `output_${Date.now()}.${outputFormat}`);

    try {
      // Écrire le buffer vidéo dans un fichier temporaire
      this.addLog('📝 [AudioConverter] Writing temporary video file:', inputPath);
      writeFileSync(inputPath, videoBuffer);

      // Commande FFmpeg pour extraire l'audio
      const command = [
        '-i', inputPath,
        '-vn',  // Pas de vidéo
        '-acodec', this.getAudioCodec(outputFormat),
        '-ar', '44100',  // Sample rate
        '-ab', '128k',   // Bitrate
        '-ac', '2',      // Stéréo
        '-y',  // Overwrite output file
        outputPath
      ];

      this.addLog('⚙️ [AudioConverter] Running FFmpeg command:', 'ffmpeg ' + command.join(' '));

      // Exécuter la conversion avec le ffmpeg système
      await execFile('ffmpeg', command);

      // Lire le fichier audio résultant
      this.addLog('📖 [AudioConverter] Reading converted audio...');
      const audioBuffer = readFileSync(outputPath);
      
      this.addLog('✅ [AudioConverter] Conversion successful');
      this.addLog('📊 [AudioConverter] Output audio size:', audioBuffer.length + ' bytes');

      return audioBuffer;

    } catch (error) {
      this.addLog('❌ [AudioConverter] Conversion failed:', error.message);
      throw error;
    } finally {
      // Nettoyer les fichiers temporaires
      try {
        if (existsSync(inputPath)) {
          unlinkSync(inputPath);
        }
        if (existsSync(outputPath)) {
          unlinkSync(outputPath);
        }
        this.addLog('🧹 [AudioConverter] Temporary files cleaned up');
      } catch (cleanupError) {
        this.addLog('⚠️ [AudioConverter] Cleanup warning:', cleanupError.message);
      }
    }
  }

  getAudioCodec(format) {
    const codecs = {
      'mp3': 'libmp3lame',
      'wav': 'pcm_s16le',
      'aac': 'aac',
      'ogg': 'libvorbis'
    };
    return codecs[format] || 'libmp3lame';
  }


  // Créer une URL temporaire pour l'audio (pour Deepgram)
  async createTemporaryAudioUrl(audioBuffer, format = 'mp3') {
    // Pour une vraie implémentation, on pourrait uploader vers un service cloud
    // temporaire ou servir via un endpoint local
    this.addLog('🌐 [AudioConverter] Creating temporary audio URL...');
    
    // Méthode simple: sauvegarder dans le dossier public temporaire
    const tempDir = tmpdir();
    const fileName = `audio_${Date.now()}.${format}`;
    const filePath = join(tempDir, fileName);
    
    writeFileSync(filePath, audioBuffer);
    
    // Dans un vrai cas d'usage, retourner une URL accessible
    this.addLog('💾 [AudioConverter] Audio saved temporarily:', filePath);
    
    return {
      filePath,
      fileName,
      cleanup: () => {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }
}

export default AudioConverter;