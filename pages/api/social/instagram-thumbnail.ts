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
    console.log(`[Instagram Thumbnail] Processing URL: ${url}`);
    
    // Use the Python script with Instaloader
    const pythonScript = path.join(process.cwd(), 'api', 'instagram_metadata.py');
    
    const result = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn('python3', [pythonScript, url]);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('[Instagram Thumbnail] Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log(`[Instagram Thumbnail] Python process exited with code: ${code}`);
        
        if (code !== 0) {
          console.error('[Instagram Thumbnail] Python script failed:', error);
          reject(new Error(`Python script failed with code ${code}: ${error}`));
          return;
        }

        try {
          const parsedResult = JSON.parse(output);
          resolve(parsedResult);
        } catch (parseError) {
          console.error('[Instagram Thumbnail] Failed to parse Python output:', parseError);
          console.log('[Instagram Thumbnail] Raw output:', output);
          reject(parseError);
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Instagram Thumbnail] Failed to start Python process:', err.message);
        reject(err);
      });
    });
    
    console.log(`[Instagram Thumbnail] Result:`, result);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        thumbnail_url: result.thumbnail_url,
        title: result.title,
        description: result.description,
        author_name: result.author_name,
        author_url: result.author_url,
        video_url: result.video_url,
        metadata: result.metadata
      });
    } else {
      // Return partial data even on error
      return res.status(200).json({
        success: false,
        error: result.error,
        thumbnail_url: result.thumbnail_url || null,
        title: result.title || 'Instagram Recipe',
        description: result.description || 'Recipe from Instagram'
      });
    }
    
  } catch (error: any) {
    console.error('[Instagram Thumbnail] Error:', error.message);
    
    return res.status(200).json({
      success: false,
      error: error.message,
      thumbnail_url: null,
      title: 'Instagram Recipe',
      description: 'Recipe from Instagram'
    });
  }
}