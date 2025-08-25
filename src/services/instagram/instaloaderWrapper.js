import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InstaloaderWrapper {
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

  async downloadVideo(url) {
    this.addLog('🚀 [InstaloaderWrapper] Starting download with Instaloader...');
    this.addLog('🔗 [InstaloaderWrapper] URL:', url);

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'instagram_downloader.py');
      
      this.addLog('🐍 [InstaloaderWrapper] Running Python script:', pythonScript);
      
      const pythonProcess = spawn('python3', [pythonScript, url]);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        this.addLog('⚠️ [InstaloaderWrapper] Python stderr:', data.toString());
      });

      pythonProcess.on('close', async (code) => {
        this.addLog('📊 [InstaloaderWrapper] Python process exited with code:', code);
        
        if (code !== 0) {
          this.addLog('❌ [InstaloaderWrapper] Python script failed');
          reject(new Error(`Python script failed with code ${code}: ${error}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          this.addLog('📦 [InstaloaderWrapper] Python result:', result);

          if (!result.success) {
            this.addLog('❌ [InstaloaderWrapper] Download failed:', result.error);
            
            // If it's a login required error, return demo mode
            if (result.error && (
              result.error.includes('login required') || 
              result.error.includes('metadata failed') ||
              result.error.includes('demo mode')
            )) {
              this.addLog('🎯 [InstaloaderWrapper] Login required - using demo mode');
              reject(new Error('DEMO_MODE:Instagram login required. Using demo mode for testing.'));
              return;
            }
            
            reject(new Error(result.error || 'Unknown error'));
            return;
          }

          // Read the video file
          if (result.video_path) {
            this.addLog('📁 [InstaloaderWrapper] Reading video file:', result.video_path);
            
            try {
              const videoBuffer = await readFile(result.video_path);
              this.addLog('✅ [InstaloaderWrapper] Video file read successfully:', videoBuffer.length + ' bytes');
              
              // Clean up the temporary file
              await unlink(result.video_path).catch(err => {
                this.addLog('⚠️ [InstaloaderWrapper] Failed to delete temp file:', err.message);
              });

              resolve({
                videoBuffer: videoBuffer,
                caption: result.caption,
                metadata: result.metadata
              });
              
            } catch (readError) {
              this.addLog('❌ [InstaloaderWrapper] Failed to read video file:', readError.message);
              reject(readError);
            }
          } else {
            reject(new Error('No video path returned'));
          }

        } catch (parseError) {
          this.addLog('❌ [InstaloaderWrapper] Failed to parse Python output:', parseError.message);
          this.addLog('📄 [InstaloaderWrapper] Raw output:', output);
          reject(parseError);
        }
      });

      pythonProcess.on('error', (err) => {
        this.addLog('❌ [InstaloaderWrapper] Failed to start Python process:', err.message);
        reject(err);
      });
    });
  }
}

export default InstaloaderWrapper;