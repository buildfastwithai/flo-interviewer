# Prisma Database Integration Setup

This backend now uses Prisma to connect directly to the PostgreSQL database instead of making HTTP API calls to the Next.js frontend.

## Prerequisites

1. PostgreSQL database running and accessible
2. Python environment with required dependencies

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
venv\Scripts\activate
pip install prisma asyncpg
```

### 2. Environment Configuration

Create a `.env.local` file in the backend directory with the following:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Other required environment variables
OPENAI_API_KEY="your_openai_api_key"
GROQ_API_KEY="your_groq_api_key"
```

Replace the DATABASE_URL with your actual PostgreSQL connection string.

### 3. Generate Prisma Client

```bash
cd backend
prisma generate
```
