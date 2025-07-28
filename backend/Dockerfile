# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js for Prisma CLI
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI globally
RUN npm install -g prisma

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Prisma schema
COPY schema.prisma .

# Copy application code
COPY . .

# Generate Prisma client
RUN prisma generate

# Create necessary directories
RUN mkdir -p logs uploads interview_data user_uploads transcriptions
RUN mkdir -p /app/data/user_uploads
RUN mkdir -p /app/data/interview_data
RUN mkdir -p /app/data/transcriptions
RUN mkdir -p /app/data/logs
RUN mkdir -p /app/data/uploads

# Create non-root user for security
# RUN useradd --create-home --shell /bin/bash app && \
#     chown -R app:app /app
# USER app

# Download required files as specified in README.md
RUN python3 agent.py download-files

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Run the agent in dev mode (as specified in README for frontend applications)
CMD ["python3", "agent.py", "dev"] 
