import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Valid Instagram URL is required' });
  }

  try {
    console.log(`[Instagram Screenshot] Processing URL: ${url}`);
    
    // Use the Python script with Playwright
    const pythonScript = path.join(process.cwd(), 'api', 'instagram_screenshot.py');
    
    const result = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn('python3', [pythonScript, url]);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('[Instagram Screenshot] Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log(`[Instagram Screenshot] Python process exited with code: ${code}`);
        
        if (code !== 0) {
          console.error('[Instagram Screenshot] Python script failed:', error);
          reject(new Error(`Python script failed with code ${code}: ${error}`));
          return;
        }

        try {
          const parsedResult = JSON.parse(output);
          resolve(parsedResult);
        } catch (parseError) {
          console.error('[Instagram Screenshot] Failed to parse Python output:', parseError);
          console.log('[Instagram Screenshot] Raw output:', output);
          reject(parseError);
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Instagram Screenshot] Failed to start Python process:', err.message);
        reject(err);
      });
    });
    
    console.log(`[Instagram Screenshot] Result:`, { 
      success: result.success, 
      hasScreenshot: !!result.screenshot_base64,
      error: result.error 
    });
    
    if (result.success && result.screenshot_base64) {
      return res.status(200).json({
        success: true,
        screenshot_base64: result.screenshot_base64,
        screenshot_url: `data:image/png;base64,${result.screenshot_base64}`,
        metadata: result.metadata
      });
    } else {
      return res.status(200).json({
        success: false,
        error: result.error || 'Failed to take screenshot',
        metadata: result.metadata
      });
    }
    
  } catch (error: any) {
    console.error('[Instagram Screenshot] Error:', error.message);
    
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}