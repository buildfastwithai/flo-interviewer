# Flo-Interviewer

A full-stack automated interview platform powered by AI that helps conduct technical interviews seamlessly.

## Overview

Flo-Interviewer is an AI-powered platform that facilitates technical interviews by automating the interview process. It allows admins to create interview templates from job descriptions, generate relevant technical questions, and conduct real-time interviews with candidates.

## Features

- **Admin Panel**:
  - Job Description Analysis and Question Generation
  - Dynamic Interview Creation
  - Skills Extraction and Question Generation
  - Analytics Dashboard

- **Interview Experience**:
  - Real-time Audio/Video Communication
  - AI-powered Interviewer
  - Dynamic Question Selection
  - Interview Recording

- **Technical Capabilities**:
  - LiveKit Integration for real-time communication
  - Dynamic instruction templates
  - Question relevance scoring
  - Multi-turn conversation support

## System Architecture

### Frontend

Built with Next.js 13+ (App Router), the frontend consists of:

- Admin interfaces for creating interview templates
- User interfaces for joining interviews
- Authentication and access control
- Real-time communication components

### Backend

Python-based backend with:

- LiveKit integration for audio/video communication
- AI agent for conducting interviews
- Dynamic question selection based on skills and job requirements
- Template-based instruction generation

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- LiveKit account and credentials
- Database (default: PostgreSQL)

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env.local` and fill in required variables.

4. Run development server:
   ```
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and fill in required variables.

5. Start the backend server:
   ```
   python main.py
   ```

## Usage

### Creating an Interview

1. Navigate to the admin JD-QnA section to create a job description
2. Extract skills and generate questions
3. Go to the Create Interview page
4. Select a record to create an interview
5. Share the generated access code with the candidate

### Joining an Interview

1. Use the access code provided by the admin
2. Enter the code at the interview page
3. Grant camera and microphone permissions
4. Begin the interview with the AI agent

## API Documentation

### Admin APIs

- `/api/records` - Get all job description records
- `/api/interview-template` - Get interview templates
- `/api/create-interview` - Create a new interview
- `/api/interviews` - List all active interviews
- `/api/connection-details` - Get LiveKit connection details

### User APIs

- Various endpoints for interview session management and recording

## Troubleshooting

- Ensure all environment variables are correctly set
- Check server logs for any errors
- Verify LiveKit connection details
- Ensure browser permissions for camera and microphone are granted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

[License information]
