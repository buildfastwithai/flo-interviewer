# AI Interview Analysis Backend

A sophisticated AI-powered FastAPI backend for conducting and analyzing technical interviews. This backend provides comprehensive interview analysis, skill assessment, and insights using multiple AI providers.

## 🐳 Docker Deployment (Recommended)

### Prerequisites for Ubuntu

1. **Install Docker and Docker Compose**:

```bash
# Update package index
sudo apt update

# Install required packages
sudo apt install apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
sudo apt update

# Install Docker
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (optional, to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker
```

2. **Verify Docker Installation**:

```bash
docker --version
docker compose version
```

### Environment Setup

1. **Create Environment File**:

```bash
# Create .env file in the backend directory
cd backend
cp env.example .env  # Copy the example environment file
# Edit .env with your actual API keys and configuration
```

2. **Configure Environment Variables** (edit `.env` file):

```env
# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# LiveKit Configuration (if using voice agent features)
LIVEKIT_URL=wss://your-livekit-url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Groq Configuration (for STT)
GROQ_API_KEY=your_groq_api_key

# Cartesia Configuration (for TTS)
CARTESIA_API_KEY=your_cartesia_api_key

# Next.js API URL (if integrating with frontend)
NEXTJS_API_URL=http://localhost:3000

# Interview Configuration (optional)
INTERVIEW_ROLE=Software Engineer
INTERVIEW_SKILL_LEVEL=mid
INTERVIEW_RECORD_ID=

# Development flag
USE_LEGACY_AGENT=false

# Database (if needed)
DATABASE_URL=sqlite:///./interview_analysis.db
```

### Docker Build and Run

1. **Build the Docker Image**:

```bash
# Navigate to backend directory
cd backend

# Build the Docker image
docker build -t flo-interviewer-backend .
```

2. **Run with Environment File**:

```bash
# Run the container with environment file
docker run -d \
  --name flo-interviewer-backend \
  --env-file .env \
  -p 8000:8000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/interview_data:/app/interview_data \
  flo-interviewer-backend
```

3. **Alternative: Using Docker Compose** (create `docker-compose.yml`):

```yaml
version: "3.8"
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
      - ./interview_data:/app/interview_data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# Run with Docker Compose
docker compose up -d
```

### Docker Management Commands

```bash
# View running containers
docker ps

# View logs
docker logs flo-interviewer-backend

# Follow logs in real-time
docker logs -f flo-interviewer-backend

# Stop the container
docker stop flo-interviewer-backend

# Start the container
docker start flo-interviewer-backend

# Remove the container
docker rm flo-interviewer-backend

# Remove the image
docker rmi flo-interviewer-backend

# Access container shell
docker exec -it flo-interviewer-backend bash
```

### API Testing

Once the container is running, test the API:

```bash
# Health check
curl http://localhost:8000/health

# API documentation
curl http://localhost:8000/docs

# Upload and analyze interview audio (example)
curl -X POST "http://localhost:8000/analyze-interview" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@interview_audio.mp3" \
  -F "skills_to_assess=Python,Communication,Problem Solving" \
  -F "job_role=Software Developer" \
  -F "company_name=YourCompany"
```

### Troubleshooting Docker Setup

1. **Port Already in Use**:

```bash
# Check what's using port 8000
sudo lsof -i :8000

# Kill the process or use a different port
docker run -p 8080:8000 flo-interviewer-backend
```

2. **Permission Issues**:

```bash
# Fix volume permissions
sudo chown -R $USER:$USER logs/ uploads/ interview_data/
```

3. **Container Won't Start**:

```bash
# Check logs for errors
docker logs flo-interviewer-backend

# Run interactively for debugging
docker run -it --env-file .env flo-interviewer-backend bash
```

4. **API Key Issues**:

```bash
# Verify environment variables are loaded
docker exec flo-interviewer-backend env | grep API_KEY
```

5. **LiveKit Turn Detection Error**:

If you encounter `AssertionError: end_of_utterance prediction should always returns a result` in the logs:

```bash
# This error is fixed by disabling the problematic MultilingualModel turn detector
# The fix is already applied in agent.py by setting turn_detection=None
# If you need turn detection, use BasicTurnDetector instead of MultilingualModel

# Check the logs to confirm the fix
docker logs flo-interviewer-backend | grep "turn_detection"
```

## 📋 API Endpoints

The FastAPI backend provides several endpoints:

- `GET /` - Root endpoint with status
- `GET /health` - Health check endpoint
- `POST /extract-transcript` - Extract transcript from video URL
- `POST /upload-audio` - Upload and transcribe audio file
- `POST /analyze-interview` - Comprehensive interview analysis from audio file
- `POST /analyze-interview-url` - Analyze interview from video URL
- `POST /analyze-transcript` - Analyze pre-existing transcript
- `POST /compare-analyses` - Compare two PDF analyses

Visit `http://localhost:8000/docs` for interactive API documentation.

---

## 🔧 Local Development Setup (Alternative)

If you prefer to run without Docker:

### Prerequisites

- Python 3.8+
- FFmpeg for audio processing
- OpenAI API key
- Additional API keys (Groq, Cartesia, LiveKit) for voice features

### Installation

1. **Clone and Setup**:

```bash
git clone <repository-url>
cd flo-interviewer/backend
```

2. **Create Virtual Environment**:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies**:

```bash
pip install -r requirements.txt
```

4. **Environment Configuration**:

```bash
cp env.example .env.local  # Create from example
# Edit .env.local with your API keys
```

5. **Run the Application**:

```bash
# Run FastAPI server
python uvicorn_config.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing Setup

```bash
# Run setup validation
python test_setup.py

# Test specific API endpoints
python -m pytest tests/  # If tests exist
```

---

## 🎯 Technical Interview Voice Agent

The backend also includes a sophisticated AI-powered voice agent for conducting structured technical interviews following best practices.

### Voice Agent Features

#### Core Interview Capabilities

- **Structured Interview Flow**: Follows systematic approach with onboarding, technical assessment, candidate questions, and wrap-up
- **Competency-Based Evaluation**: Covers 5 key areas:
  - Data Structures & Algorithms (30%)
  - System Design (25%)
  - Code Quality & Best Practices (20%)
  - Problem Solving & Communication (15%)
  - Behavioral & Culture Fit (10%)

#### Professional Interview Conduct

- **Bias-Free Evaluation**: Evidence-based scoring with behavior-anchored rating scales
- **Respectful Treatment**: Professional conduct with accommodation for different communication styles
- **Accessibility Support**: Flexible question format, thinking time, and technical assistance
- **Time Management**: Structured timing with gentle transitions between sections

#### Adaptive Question Bank

- **Skill-Level Appropriate**: Questions tailored for Junior, Mid, Senior, and Staff levels
- **Role-Specific Content**: Customizable for different engineering roles
- **Comprehensive Coverage**: Multiple questions per competency to ensure thorough evaluation

### Voice Agent Usage

```bash
# Run the voice agent (requires LiveKit setup)
python3 agent.py dev

# Or using Docker with voice agent
docker run --env-file .env flo-interviewer-backend python3 agent.py dev
```

---

## 🔍 Interview Analysis Features

### Comprehensive Analysis Response

The API provides detailed analysis including:

- **Skill Assessments**: Level determination with confidence scores
- **Q&A Evaluation**: Graded responses with detailed feedback
- **Interview Insights**: Performance scores, strengths, weaknesses
- **Hiring Recommendations**: Data-driven decision support

### Supported File Formats

- **Audio**: MP3, WAV, M4A, OGG, WEBM
- **Video URLs**: YouTube, Vimeo, and other yt-dlp supported platforms
- **Text**: Direct transcript upload and analysis

### AI Provider Support

- **OpenAI**: GPT-4 for comprehensive analysis
- **Google Gemini**: Alternative AI provider option
- **Groq**: High-speed speech-to-text processing
- **Cartesia**: Natural text-to-speech synthesis

---

## 🛠️ Customization

### Role Configuration

Edit `interview_config.py` to:

- Add new roles (Frontend, Backend, DevOps, etc.)
- Modify competency weights
- Update question banks
- Adjust evaluation criteria

### Skill Level Adaptation

The system automatically adapts questions based on candidate skill level:

- `junior`: Entry-level questions
- `mid`: Intermediate complexity
- `senior`: Advanced technical depth
- `staff`: Leadership and architecture focus

---

## 📊 Monitoring and Logging

### Application Logs

```bash
# View logs in Docker
docker logs flo-interviewer-backend

# Local development logs
tail -f logs/interview_agent.log
```

### Health Monitoring

The application includes built-in health checks:

- Database connectivity
- API service availability
- File system permissions

---

## 🔒 Security Considerations

- **API Keys**: Never commit API keys to version control
- **Environment Variables**: Use `.env` files for sensitive configuration
- **User Data**: Implement proper data encryption and retention policies
- **Network Security**: Use HTTPS in production environments

---

## 🤝 Contributing

When contributing to this project:

1. Follow the existing code structure
2. Update tests for new functionality
3. Document any new configuration options
4. Ensure bias-free and inclusive practices
5. Test Docker builds before submitting PRs

---

## 📄 License

This project is designed for internal use and follows professional interview standards and best practices.

---

## 🧩 Human-in-the-Loop (HIL) Chat Agent (LangGraph)

This project also includes a chat-only interview agent that can pause and ask the user for input before continuing. This is called human-in-the-loop (HIL).

### What is HIL?

- The agent can stop mid-flow and ask a clarifying question instead of guessing.
- The backend returns a prompt like: "The interviewer needs your input: ...".
- After the user replies, the agent continues with that answer.

### Where is it implemented?

- Backend: `backend/human_in_loop_agent.py`
  - FastAPI endpoints: `POST /hil/start`, `POST /hil/message`, `POST /hil/resume`
  - LangGraph nodes: `agent` (LLM) and `ask_human` (interrupt)
  - Uses `interrupt()` to pause and `Command(resume=...)` to continue
- Frontend: `frontend/app/(user)/interview_v3/page.tsx`
  - Chat UI that calls the HIL endpoints and shows the banner when input is needed
- Access code lookup: `frontend/app/api/interview/lookup-by-access-code/route.ts`
  - Resolves `recordId` and role from `accessCode`

### How the flow works

1. User opens `/interview_v3` and clicks Join.
2. Frontend resolves `recordId` from `accessCode`, calls `POST /hil/start`.
3. Backend builds instructions and questions (same logic as the voice agent) and runs the graph until either:
   - it has an AI reply, or
   - it needs human input (HIL interrupt).
4. Frontend renders the result. If `awaiting_user` is present, it shows a banner with the question.
5. If a banner is shown, the next user reply goes to `POST /hil/resume`. Otherwise, normal messages go to `POST /hil/message`.

### Endpoints (quick reference)

- `POST /hil/start`
  - Body: `{ name, accessCode, practice, recordId?, role? }`
  - Returns: `{ thread_id, messages, awaiting_user?, meta }`
- `POST /hil/message`
  - Body: `{ thread_id, message }`
- `POST /hil/resume`
  - Body: `{ thread_id, input }` (used when the backend asked a question)

### How to trigger HIL during a chat

Send messages like:
- "Ask me which area to focus on (SSR, performance, or API), then wait for my answer."
- "Ask me my preferred language (JavaScript or TypeScript), and wait."
- "Ask me to pick difficulty (easy, medium, hard), then wait."

You should see a banner: "The interviewer needs your input:". Reply to that question to resume.

### Run locally (HIL)

- Backend
  - Set `OPENAI_API_KEY`
  - Install: `backend/venv/Scripts/pip.exe install -r backend/requirements.txt`
  - Run: `backend/venv/Scripts/python.exe backend/human_in_loop_agent.py` (http://localhost:8010)
- Frontend
  - `frontend/.env.local`: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8010`
  - Open `/interview_v3`

### Troubleshooting

- 405/CORS on `/hil/*`: ensure the HIL server is running; CORS is enabled in `human_in_loop_agent.py`.
- No AI reply: check `OPENAI_API_KEY` and backend logs.
- `recordId` missing: confirm the access code exists; test `/api/interview/lookup-by-access-code`.

### Backend module: function-by-function (human_in_loop_agent.py)

- `StartRequest`, `MessageRequest`, `ResumeRequest` (Pydantic models)
  - Define request bodies for `/hil/start`, `/hil/message`, `/hil/resume` respectively.
  - Keep payloads typed and validated.

- `ChatResponse` (Pydantic model)
  - Standard response wrapper: `thread_id`, array of AI `messages`, optional `awaiting_user` (the HIL prompt), and optional `meta`.

- `app = FastAPI(...)` + CORS middleware
  - Hosts the HIL HTTP API.
  - CORS allows the Next.js app to call this backend from `localhost:3000`.

- `build_instructions(candidate_name, role, practice_mode, questions_list, all_questions)`
  - Builds the interview system prompt.
  - Mirrors the style/guardrails from `backend/agent.py`.
  - Uses practice instructions when `practice_mode` is true; otherwise injects the full questions list if available.

- `AskHumanSpec` (Pydantic tool schema)
  - A mock tool definition “Ask the human a question”.
  - Binding this to the model teaches it to explicitly request human input.

- `create_graph()`
  - Constructs the LangGraph workflow and compiles it (with a shared in‑memory checkpointer):
    - Binds model: `ChatOpenAI(...).bind_tools([AskHumanSpec])`.
    - `call_model(state)`: calls the tool‑bound model with `state["messages"]` and appends the AI reply.
    - `should_continue(state)`: if last AI message called `AskHumanSpec`, route to `ask_human`; otherwise end the turn.
    - `ask_human(state)`: extracts the tool call’s question, calls `interrupt(question)` to pause the graph, and returns a `ToolMessage` placeholder so LangGraph can resume later.
  - Returns a `StateGraph` with edges: `START -> agent`, `agent -> ask_human (conditional)`, `ask_human -> agent` (after resume).

- `graph_app = create_graph().compile(checkpointer=memory)`
  - The runnable graph used by the API stream calls.

- `_collect_stream_values(stream_iter)`
  - Consumes LangGraph `stream(..., stream_mode="updates")` generator.
  - Collects AI messages emitted by nodes and detects HIL interrupts (stores `awaiting_user.question`).
  - Returns `{ messages: [...], awaiting: { question } | null }`.

- `@app.post("/hil/start") -> start_chat(req: StartRequest)`
  - Generates a new `thread_id`.
  - Resolves questions: practice preset or dynamic template via `extract_questions_from_template(record_id, room)` from `agent.py`.
  - Builds instructions and primes the graph with a `SystemMessage` + kickoff `HumanMessage`.
  - Runs the graph until it returns an AI reply or an interrupt prompt.
  - Response includes `meta` (role and total questions).

- `@app.post("/hil/message") -> send_message(req: MessageRequest)`
  - Appends the user message to the existing thread and streams a step.
  - May return normal AI messages or a new HIL prompt.

- `@app.post("/hil/resume") -> resume_interruption(req: ResumeRequest)`
  - Used only when the previous response had `awaiting_user`.
  - Calls `Command(resume=req.input)` to continue the paused graph and returns the next AI output.

- `if __name__ == "__main__": uvicorn.run(app, ...)`
  - Local development entrypoint (defaults to port 8010).

### Frontend chat page: function-by-function (app/(user)/interview_v3/page.tsx)

- State
  - `threadId`: active HIL session id from the backend.
  - `messages`: chat transcript (user and assistant messages displayed in the UI).
  - `awaitingQuestion`: when set, shows the HIL banner that expects a specific answer.
  - `meta`: role and total planned questions (informational sidebar).

- `startInterview()`
  - Looks up `recordId` and role from access code via `POST /api/interview/lookup-by-access-code`.
  - Calls `POST {BACKEND_URL}/hil/start` with `{ name, accessCode, practice, recordId, role }`.
  - Saves `thread_id`, initial AI messages, `awaiting_user` prompt (if any), and `meta`.

- `send()`
  - If `awaitingQuestion` is set, sends the user’s input to `POST /hil/resume`.
  - Otherwise, sends a normal chat message to `POST /hil/message`.
  - Appends returned AI messages and updates `awaitingQuestion`.

- Rendering
  - Sidebar shows connection status and role.
  - Chat area lists messages and, when present, renders the HIL banner: “The interviewer needs your input: …”.

### Data contracts (simplified)

- Backend AI message object (as returned to UI)
  - `{ role: "assistant", content: string }`
- Awaiting prompt
  - `{ awaiting_user: { question: string } }` or `null`
- Thread identifier
  - `{ thread_id: string }` included in every response; must be sent with `/hil/message` and `/hil/resume`.

### Notes and best practices

- Encourage HIL by asking the agent to “ask me X and wait”.
- In production, restrict CORS `allow_origins` to your web app origin.
- You can persist chat history server‑side by storing thread state; currently we use an in‑memory checkpointer for simplicity.