# Flo-Interviewer

A full-stack automated interview platform powered by AI that helps conduct technical interviews seamlessly using LiveKit and AI-powered voice agents.

## Overview

Flo-Interviewer is an AI-powered platform that facilitates technical interviews by automating the interview process. It allows admins to create interview templates from job descriptions, generate relevant technical questions, and conduct real-time interviews with candidates.

## Features

- **Admin Panel**:

  - Job Description Analysis and Question Generation
  - Dynamic Interview Creation from PDF/Text uploads
  - Skills Extraction and Question Generation
  - Analytics Dashboard with regeneration tracking
  - Excel-based question set management

- **Interview Experience**:

  - Real-time Audio/Video Communication via LiveKit
  - AI-powered Interviewer using Google Cloud AI
  - Dynamic Question Selection based on extracted skills
  - Interview Recording and Transcription

- **Technical Capabilities**:
  - LiveKit Integration for real-time communication
  - Google Cloud AI (Gemini 2.0 Flash, Speech-to-Text, Text-to-Speech)
  - Dynamic instruction templates
  - Question relevance scoring and feedback system
  - Multi-turn conversation support

## System Architecture

### Frontend (Next.js + Prisma + PostgreSQL)

- Next.js 15+ with App Router
- Prisma ORM with PostgreSQL database
- Real-time communication with LiveKit
- Comprehensive admin interfaces
- TypeScript for type safety

### Backend (Python + LiveKit Agent)

- Python-based LiveKit agent
- Google Cloud AI integration
- Real-time interview conducting
- Dynamic question selection

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and **npm/yarn**
- **Python 3.11+**
- **PostgreSQL** database
- **LiveKit account** ([Sign up here](https://cloud.livekit.io/))
- **Google Cloud Project** with AI APIs enabled

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd flo-interviewer
```

### 2. Environment Configuration

#### Root-level .env.local (Create this file)

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/flo_interviewer"

# LiveKit Configuration
LIVEKIT_URL=wss://your-project-name.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Google Cloud AI (choose one method)
# Method 1: Service account JSON file path (recommended for development)
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# Method 2: Direct JSON content (recommended for production)
# GOOGLE_CREDENTIALS_JSON='{"type": "service_account", "project_id": "your-project", ...}'

# Optional: Interview Configuration
INTERVIEW_ROLE="Software Engineer"
INTERVIEW_SKILL_LEVEL=mid
INTERVIEW_DURATION_MINUTES=60

# Logging
LOG_LEVEL=INFO
```

#### Frontend .env.local (already exists in frontend/)

```bash
# Copy root .env.local content here or create symlink
cp .env.local frontend/.env.local
```

#### Backend .env.local (Create in backend/)

```bash
# Copy root .env.local content here or create symlink
cp .env.local backend/.env.local
```

### 3. Google Cloud Setup

1. **Create a Google Cloud Project**:

   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Required APIs**:

   ```bash
   # Install Google Cloud CLI first: https://cloud.google.com/sdk/docs/install

   gcloud services enable speech.googleapis.com
   gcloud services enable texttospeech.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

3. **Create Service Account**:

   ```bash
   # Create service account
   gcloud iam service-accounts create interview-agent \
       --display-name="Interview Agent Service Account"

   # Grant necessary roles
   gcloud projects add-iam-policy-binding your-project-id \
       --member="serviceAccount:interview-agent@your-project-id.iam.gserviceaccount.com" \
       --role="roles/aiplatform.user"

   gcloud projects add-iam-policy-binding your-project-id \
       --member="serviceAccount:interview-agent@your-project-id.iam.gserviceaccount.com" \
       --role="roles/speech.client"

   # Download credentials
   gcloud iam service-accounts keys create ./google-credentials.json \
       --iam-account=interview-agent@your-project-id.iam.gserviceaccount.com
   ```

### 4. Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create database**:
   ```sql
   CREATE DATABASE flo_interviewer;
   ```
3. **Update DATABASE_URL** in your .env.local files

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 6. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test configuration
python agent.py download-files

# Start the interview agent
python agent.py dev
```

## Detailed Setup Instructions

### Frontend Development

#### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

#### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Reset database (careful!)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Backend Development

#### Virtual Environment Management

```bash
# Create virtual environment
python -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Deactivate
deactivate
```

#### Testing Your Setup

```bash
# Test environment configuration
python test_setup.py

# Test Google Cloud credentials
python -c "
from google.cloud import aiplatform
print('Google Cloud AI Platform: ✓ Connected')
"
```

## Usage Guide

### Creating an Interview

1. **Navigate to Admin Panel**: Go to `/admin/jd-qna`
2. **Upload Job Description**: Upload PDF or paste text
3. **Extract Skills**: Review and edit extracted skills
4. **Generate Questions**: Create questions for each skill
5. **Create Interview**: Go to `/admin/create-interview`
6. **Select Record**: Choose your job description record
7. **Generate Access Code**: Share with candidate

### Conducting an Interview

1. **Candidate Access**: Candidate uses access code at `/interview`
2. **Permissions**: Browser will request camera/microphone access
3. **AI Interview**: Automated interview begins with AI agent
4. **Real-time**: Questions adapt based on responses
5. **Recording**: Interview is automatically recorded

### Admin Features

- **Dashboard**: View interview analytics at `/admin/jd-qna/dashboard`
- **Records**: Manage job descriptions at `/admin/jd-qna/records`
- **Analytics**: Track question regenerations and feedback

## Environment Variables Reference

### Required Variables

| Variable                         | Description                      | Example                                    |
| -------------------------------- | -------------------------------- | ------------------------------------------ |
| `DATABASE_URL`                   | PostgreSQL connection string     | `postgresql://user:pass@localhost:5432/db` |
| `LIVEKIT_URL`                    | LiveKit server URL               | `wss://project.livekit.cloud`              |
| `LIVEKIT_API_KEY`                | LiveKit API key                  | `APIxxxxxxxxxxx`                           |
| `LIVEKIT_API_SECRET`             | LiveKit API secret               | `secretxxxxxxxxx`                          |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud credentials | `./google-credentials.json`                |

### Optional Variables

| Variable                     | Description            | Default               |
| ---------------------------- | ---------------------- | --------------------- |
| `INTERVIEW_ROLE`             | Default interview role | `"Software Engineer"` |
| `INTERVIEW_SKILL_LEVEL`      | Default skill level    | `"mid"`               |
| `INTERVIEW_DURATION_MINUTES` | Interview duration     | `60`                  |
| `LOG_LEVEL`                  | Logging level          | `INFO`                |

## API Documentation

### Admin APIs

- `GET /api/records` - Get all job description records
- `GET /api/interview-template` - Get interview templates
- `POST /api/create-interview` - Create a new interview
- `GET /api/interviews` - List all active interviews
- `GET /api/connection-details` - Get LiveKit connection details
- `POST /api/auto-generate` - Auto-generate questions for skills

### Interview APIs

- `GET /api/interviews/[id]` - Get interview details
- `POST /api/interviews/[id]/complete` - Mark interview as complete

## Troubleshooting

### Common Issues

#### Frontend Issues

- **Database connection failed**: Check DATABASE_URL format and PostgreSQL is running
- **Prisma errors**: Run `npx prisma generate` and `npx prisma migrate dev`
- **Build errors**: Clear `.next` folder and run `npm run build` again

#### Backend Issues

- **Google Cloud authentication**: Verify credentials file path and permissions
- **LiveKit connection failed**: Check API keys and project URL
- **Python import errors**: Ensure virtual environment is activated

#### Environment Issues

- **Missing .env.local**: Ensure file exists in correct directories
- **Permission denied**: Check file permissions on credential files
- **Port conflicts**: Change ports if 3000 (frontend) or default agent port is taken

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.DATABASE_URL)"

# Test database connection
npx prisma migrate status

# Test Google Cloud
python -c "import google.cloud.aiplatform; print('✓ Google Cloud working')"

# Test LiveKit
python -c "from livekit import api; print('✓ LiveKit SDK working')"
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the logs in `backend/logs/`
3. Open an issue in the repository
