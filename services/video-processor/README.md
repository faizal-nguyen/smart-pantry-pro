# Video Processing Backend

A complete Python backend for processing videos with frame extraction, audio transcription, and OCR capabilities. Supports YouTube, Instagram, and TikTok video downloads.

## Features

- 🎥 **Video Processing**: Download and process videos from URLs or file uploads
- 🖼️ **Frame Extraction**: Extract frames at intervals using OpenCV
- 🎵 **Audio Transcription**: Transcribe audio using OpenAI Whisper
- 📝 **Text Recognition**: Extract text from frames using OpenAI Vision API
- ⚡ **Async Processing**: Background processing with Celery and Redis
- 🌐 **REST API**: Complete FastAPI-based REST API
- 📊 **Monitoring**: Built-in task monitoring with Flower

## Supported Platforms

- **YouTube**: All video formats and qualities
- **Instagram**: Posts, Reels, and IGTV
- **TikTok**: All video content
- **File Upload**: MP4, AVI, MOV, MKV, WebM formats

## Quick Start

### Prerequisites

- Python 3.8+
- Redis server
- OpenAI API key

### Installation

1. **Clone and setup**:
   ```bash
   cd services/video-processor
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and other settings
   ```

3. **Start Redis** (choose one):
   ```bash
   # macOS with Homebrew
   brew services start redis
   
   # Linux
   sudo systemctl start redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

4. **Start the application**:
   ```bash
   # Option A: script helper
   ./start.sh

   # Option B: uvicorn directly
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```

5. **Integrate with Node API**:
   - In `apps/api/.env`, set `VIDEO_PROCESSOR_URL=http://localhost:8000` (or your chosen port)
   - Restart the Node API. Endpoints `/api/v1/youtube-extract` and `/api/v1/transcribe-youtube` will delegate here.

### Using Docker

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Usage

### Process Video from URL

```bash
curl -X POST "http://localhost:8000/process/url" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.youtube.com/watch?v=example",
    "language": "en",
    "extract_frames": true,
    "transcribe_audio": true,
    "extract_text": true
  }'
```

### Upload and Process Video

```bash
curl -X POST "http://localhost:8000/process/upload" \\
  -F "file=@video.mp4" \\
  -F "language=en"
```

### Check Processing Status

```bash
curl "http://localhost:8000/status/TASK_ID"
```

### Get Results

```bash
curl "http://localhost:8000/result/VIDEO_ID"
```

### Download Processed Files

```bash
# Download transcription
curl "http://localhost:8000/download/VIDEO_ID/transcription" -o transcription.json

# Download OCR results
curl "http://localhost:8000/download/VIDEO_ID/ocr_results" -o ocr_results.json

# Download text summary
curl "http://localhost:8000/download/VIDEO_ID/text_summary" -o summary.txt
```

## Configuration

Key configuration options in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for Vision API | Required |
| `MAX_VIDEO_DURATION` | Max video length (seconds) | 600 |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 500MB |
| `FRAME_EXTRACTION_INTERVAL` | Frame extraction interval (seconds) | 30 |
| `MAX_FRAMES_PER_VIDEO` | Maximum frames to extract | 20 |
| `WHISPER_MODEL` | Whisper model size | base |

## API Endpoints

### Core Processing
- `POST /process/url` - Process video from URL
- `POST /process/upload` - Upload and process video file
- `GET /status/{task_id}` - Get processing status
- `GET /result/{video_id}` - Get complete results

### File Access
- `GET /download/{video_id}/{file_type}` - Download processed files
- `GET /frames/{video_id}` - List video frames
- `GET /frames/{video_id}/{frame_filename}` - Get specific frame

### System
- `GET /health` - Health check
- `GET /queue/status` - Queue monitoring
- `GET /info/supported-languages` - Supported transcription languages
- `GET /info/pricing` - Cost information

### Management
- `DELETE /cleanup/{video_id}` - Clean up video files
- `POST /estimate-cost` - Estimate processing costs

## Processing Pipeline

1. **Video Download/Upload**
   - Download from supported platforms using yt-dlp
   - Validate file format and size
   - Store in upload directory

2. **Frame Extraction**
   - Extract frames at configured intervals
   - Smart scene detection option
   - Save as high-quality JPEG files

3. **Audio Transcription**
   - Extract audio track from video
   - Transcribe using OpenAI Whisper
   - Generate SRT subtitle files

4. **Text Recognition**
   - Process extracted frames with OpenAI Vision API
   - Detect and extract text overlays
   - Generate comprehensive text summary

5. **Result Compilation**
   - Combine all processing results
   - Generate downloadable files
   - Clean up temporary data

## File Structure

```
api/video-processor/
├── app.py                 # FastAPI application
├── video_processor.py     # Core video processing
├── frame_extractor.py     # OpenCV frame extraction
├── audio_transcriber.py   # Whisper transcription
├── text_extractor.py      # OpenAI OCR
├── celery_tasks.py        # Background tasks
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker setup
├── Dockerfile            # Container definition
├── start.sh              # Startup script
└── README.md             # This file
```

## Monitoring

Access monitoring interfaces:

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Flower Dashboard**: http://localhost:5555
- **Queue Status**: http://localhost:8000/queue/status

## Error Handling

The system includes comprehensive error handling:

- **Rate Limiting**: Prevents API abuse
- **Timeout Protection**: Configurable processing timeouts
- **Automatic Retries**: Failed tasks are retried with backoff
- **Cleanup**: Automatic cleanup of temporary files
- **Logging**: Detailed logging for debugging

## Cost Estimation

Processing costs (approximate):
- Frame extraction: Free (OpenCV)
- Audio transcription: Free (Whisper)
- Text extraction: ~$0.01 per frame (OpenAI Vision API)

Use the `/estimate-cost` endpoint for specific cost estimates.

## Development

### Running Tests
```bash
pytest tests/
```

### Code Quality
```bash
black .
flake8 .
```

### Adding New Features
1. Implement core logic in appropriate module
2. Add Celery task if background processing needed
3. Create API endpoint in `app.py`
4. Update configuration in `config.py`
5. Add tests and documentation

## Troubleshooting

### Common Issues

**Redis Connection Error**:
- Ensure Redis is running: `redis-cli ping`
- Check Redis URL in `.env` file

**OpenAI API Errors**:
- Verify API key is valid and has credits
- Check rate limits and quotas

**Video Download Failures**:
- Some platforms may block automated downloads
- Try different video URLs or formats

**Processing Timeouts**:
- Increase `PROCESS_TIMEOUT` in configuration
- Reduce video duration or frame extraction rate

### Logs

Check logs for detailed error information:
- Application logs: `video_processor.log`
- Celery worker logs: Check terminal output
- Docker logs: `docker-compose logs -f`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Open an issue with reproducible steps
