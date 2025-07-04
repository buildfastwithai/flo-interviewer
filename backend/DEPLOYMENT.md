# Dockerfile Documentation

## Overview

This Dockerfile creates a production-ready container for the AI Interview Analysis Backend that runs both the FastAPI main application and the agent worker process concurrently.

## Architecture

The container is designed to run two processes simultaneously:

1. **Main Application** (`main.py`) - FastAPI server on port 8000
2. **Agent Worker** (`agent.py dev worker`) - Background worker process

## Base Image

- **Python 3.11 Slim**: Optimized for size and security
- **Ubuntu-based**: Provides necessary system dependencies

## System Dependencies

The following packages are installed:

- `gcc` & `g++`: C/C++ compilers for Python packages
- `libffi-dev` & `libssl-dev`: Development libraries
- `ffmpeg`: Audio/video processing for interview analysis
- `curl`: HTTP client for health checks

## Directory Structure

The container creates the following directories:

```
/app/
├── logs/              # Application logs
├── uploads/           # File uploads
├── interview_data/    # Interview analysis data
├── user_uploads/      # User-submitted files
├── transcriptions/    # Audio transcriptions
└── start.sh          # Startup script
```

## Multi-Process Setup

### Startup Script (`start.sh`)

The container uses a custom startup script that:

1. Starts the agent worker in the background
2. Starts the main FastAPI application in the foreground

```bash
#!/bin/bash
python3 agent.py dev worker &
python3 main.py
```

### Process Management

- **Background Process**: Agent worker runs with `&` to allow concurrent execution
- **Foreground Process**: Main application handles container lifecycle and signals
- **Signal Handling**: Proper container shutdown through the main process

## Security Features

### Non-Root User

The container runs as a non-root user `app` for security:

- User created with home directory and bash shell
- All application files owned by the `app` user
- Reduces container attack surface

### File Permissions

- Application directory: `/app` owned by `app:app`
- Startup script: Executable permissions set
- Volume mounts: Proper ownership for data directories

## Health Monitoring

### Health Check

Built-in health check configuration:

- **Endpoint**: `http://localhost:8000/health`
- **Interval**: 30 seconds
- **Timeout**: 30 seconds
- **Retries**: 3 attempts
- **Start Period**: 5 seconds

### Monitoring Commands

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' container_name

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' container_name
```

## Environment Variables

### Required Variables

```env
# Core Configuration
PYTHONPATH=/app
PYTHONUNBUFFERED=1

# API Keys (set via .env file)
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CARTESIA_API_KEY=your_cartesia_api_key

# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

### Optional Variables

```env
# Development
USE_LEGACY_AGENT=false

# Database
DATABASE_URL=sqlite:///./interview_analysis.db

# Interview Configuration
INTERVIEW_ROLE=Software Engineer
INTERVIEW_SKILL_LEVEL=mid
```

## Build Process

### Build Command

```bash
docker build -t flo-interviewer-backend .
```

### Build Stages

1. **System Setup**: Install system dependencies
2. **Python Dependencies**: Install requirements.txt
3. **Application Code**: Copy source code
4. **Directory Creation**: Create necessary directories
5. **User Setup**: Create non-root user and set permissions
6. **Agent Download**: Download required agent files
7. **Startup Script**: Create multi-process startup script

## Running the Container

### Basic Run

```bash
docker run -d \
  --name flo-interviewer-backend \
  --env-file .env \
  -p 8000:8000 \
  flo-interviewer-backend
```

### With Volume Mounts

```bash
docker run -d \
  --name flo-interviewer-backend \
  --env-file .env \
  -p 8000:8000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/interview_data:/app/interview_data \
  -v $(pwd)/user_uploads:/app/user_uploads \
  -v $(pwd)/transcriptions:/app/transcriptions \
  flo-interviewer-backend
```

### Production Run

```bash
docker run -d \
  --name flo-interviewer-backend \
  --env-file .env \
  -p 8000:8000 \
  --restart unless-stopped \
  --memory 2g \
  --cpus 1.0 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/interview_data:/app/interview_data \
  flo-interviewer-backend
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs flo-interviewer-backend

# Run interactively
docker run -it --env-file .env flo-interviewer-backend bash
```

### Process Issues

```bash
# Check running processes in container
docker exec flo-interviewer-backend ps aux

# Check if both processes are running
docker exec flo-interviewer-backend ps aux | grep python
```

### Port Issues

```bash
# Check port binding
docker port flo-interviewer-backend

# Test health endpoint
curl http://localhost:8000/health
```

### Permission Issues

```bash
# Fix volume permissions
sudo chown -R 1000:1000 logs/ uploads/ interview_data/

# Check container user
docker exec flo-interviewer-backend whoami
```

## Development

### Debug Mode

```bash
# Run with interactive shell
docker run -it --env-file .env flo-interviewer-backend bash

# Manual process start
python3 agent.py dev worker &
python3 main.py
```

### Custom Startup Script

To modify the startup behavior, you can mount a custom script:

```bash
# Create custom start script
cat > custom_start.sh << 'EOF'
#!/bin/bash
echo "Starting custom processes..."
python3 agent.py dev worker &
python3 main.py
EOF

# Make executable
chmod +x custom_start.sh

# Run with custom script
docker run -d \
  --env-file .env \
  -v $(pwd)/custom_start.sh:/app/start.sh \
  flo-interviewer-backend
```

## Performance Optimization

### Resource Limits

```bash
# Set memory and CPU limits
docker run -d \
  --memory 2g \
  --cpus 1.5 \
  flo-interviewer-backend
```

### Volume Optimization

```bash
# Use tmpfs for temporary files
docker run -d \
  --tmpfs /tmp:rw,size=100m \
  flo-interviewer-backend
```

## Security Considerations

- Container runs as non-root user
- No sensitive data in image layers
- Environment variables for secrets
- Minimal attack surface with slim base image
- Regular security updates recommended

## Best Practices

1. **Environment Variables**: Use `.env` files for configuration
2. **Volume Mounts**: Persist data outside container
3. **Health Checks**: Monitor container health
4. **Resource Limits**: Set appropriate memory/CPU limits
5. **Logging**: Use centralized logging in production
6. **Updates**: Regularly update base image and dependencies
