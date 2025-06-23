# Setup Guide for Technical Interview Voice Agent

This guide will help you set up and configure the Technical Interview Voice Agent for your organization.

## Prerequisites

### 1. LiveKit Account

- Sign up at [LiveKit Cloud](https://cloud.livekit.io/) or set up a self-hosted instance
- Create a new project
- Note your project URL, API key, and API secret

### 2. AI Service API Keys

#### Google Cloud AI (Required for LLM, Speech-to-Text, and Text-to-Speech)

- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one
- Enable the following APIs:
  - Speech-to-Text API
  - Text-to-Speech API
  - Vertex AI API (for Gemini models)
- Create a service account and download the JSON credentials file
- Provides Gemini 2.0 Flash, Chirp STT, and Cloud TTS

### Detailed Google Cloud Setup

1. **Create a Google Cloud Project**:

   ```bash
   # Install Google Cloud CLI if not already installed
   # Visit: https://cloud.google.com/sdk/docs/install

   # Create a new project
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

2. **Enable Required APIs**:

   ```bash
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

   # Create and download key file
   gcloud iam service-accounts keys create ./google-credentials.json \
       --iam-account=interview-agent@your-project-id.iam.gserviceaccount.com
   ```

## Environment Configuration

### Quick Setup Option

If you have a Google Cloud service account JSON file, simply:

1. **Download your service account key** from Google Cloud Console
2. **Save it as `google-credentials.json`** in your project root
3. **Create `.env.local`** with minimal configuration:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-project-name.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Google Cloud Authentication
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Full Configuration Options

Create a `.env.local` file in your project root with the following configuration:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-project-name.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Google Cloud Authentication (choose ONE method)
# Method 1: Service Account JSON as environment variable (recommended for production)
GOOGLE_CREDENTIALS_JSON='{"type": "service_account", "project_id": "your-project", ...}'

# Method 2: Path to service account JSON file (recommended for development)
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/google-credentials.json

# Method 3: Custom credentials file location
GOOGLE_CREDENTIALS_FILE=./google-credentials.json

# Optional: Interview Configuration
INTERVIEW_ROLE=Software Engineer
INTERVIEW_SKILL_LEVEL=mid
INTERVIEW_DURATION_MINUTES=60

# Optional: Logging
LOG_LEVEL=INFO
INTERVIEW_LOGS_PATH=./interview_logs
```

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd feedback-v0-custom

# Install Python dependencies
pip install -r requirements.txt

# Install additional Google Cloud libraries
pip install google-cloud-aiplatform google-cloud-speech google-cloud-texttospeech

# Alternative: Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install google-cloud-aiplatform google-cloud-speech google-cloud-texttospeech
```

### 2. Configure Environment Variables

Copy the environment template and customize:

```bash
# Create your environment file
cp .env.local.example .env.local

# Edit with your actual API keys
nano .env.local  # or use your preferred editor
```

### 3. Test Your Configuration

Run a quick test to verify your setup:

```bash
python -c "
from dotenv import load_dotenv
import os
load_dotenv('.env.local')
print('LIVEKIT_URL:', os.getenv('LIVEKIT_URL'))
print('Google Credentials JSON:', 'Set' if os.getenv('GOOGLE_CREDENTIALS_JSON') else 'Missing')
print('Google Credentials File:', 'Set' if os.getenv('GOOGLE_APPLICATION_CREDENTIALS') else 'Missing')
print('Custom Google File:', 'Set' if os.getenv('GOOGLE_CREDENTIALS_FILE') else 'Missing')
"
```

### 4. Start the Agent

```bash
python agent.py
```

You should see output indicating the agent is connecting to your LiveKit room.

## Customization Options

### Interview Role Configuration

Edit `agent.py` to customize the interview role:

```python
agent=InterviewAgent(
    role="Software Engineer",    # Change to: Frontend Developer, Backend Developer, etc.
    candidate_name=participant.identity or "Candidate",
    skill_level="mid"           # junior, mid, senior, staff
)
```

### Adding New Roles

1. Open `interview_config.py`
2. Create a new role template:

```python
FRONTEND_DEVELOPER_TEMPLATE = InterviewTemplate(
    role="Frontend Developer",
    duration_minutes=60,
    introduction_script="Welcome to your frontend developer interview...",
    competencies=[
        # Define frontend-specific competencies
    ]
)

# Add to ROLE_TEMPLATES
ROLE_TEMPLATES["Frontend Developer"] = FRONTEND_DEVELOPER_TEMPLATE
```

### Question Bank Customization

Modify questions in `interview_config.py` for each skill level:

```python
questions={
    SkillLevel.JUNIOR: [
        "Your junior-level questions here"
    ],
    SkillLevel.MID: [
        "Your mid-level questions here"
    ],
    # ... etc
}
```

## Testing Your Setup

### 1. Local Testing

Start the agent and join the LiveKit room using:

- LiveKit's web client
- Your custom application
- Mobile apps

### 2. Interview Flow Testing

Test the complete interview flow:

1. Join room as a candidate
2. Verify audio quality
3. Go through a practice interview
4. Check logging output
5. Review generated summaries

### 3. Performance Testing

Monitor for:

- Audio latency
- Response quality
- Interview timing
- Error handling

## Common Issues and Solutions

### Audio Problems

```bash
# Check microphone permissions
# Verify LiveKit room configuration
# Test with different audio devices
```

### API Connection Issues

```bash
# Verify API keys are correct
# Check internet connectivity
# Monitor API rate limits
# Review service status pages
```

### Interview Flow Issues

```bash
# Check agent logs for errors
# Verify interview_config.py syntax
# Test with simple questions first
# Monitor conversation state
```

## Production Deployment

### Security Considerations

- Use environment variables for API keys
- Implement proper access controls
- Regular security audits
- Data encryption at rest

### Monitoring Setup

- Log aggregation (ELK stack, Datadog, etc.)
- Performance monitoring
- Interview quality metrics
- Usage analytics

### Scalability Planning

- Multiple agent instances
- Load balancing
- Database for interview data
- Backup and recovery

## Support and Maintenance

### Regular Updates

- Monitor API changes
- Update question banks
- Review scoring criteria
- Gather user feedback

### Quality Assurance

- Regular interview audits
- Bias testing
- Candidate experience surveys
- Interviewer training

### Data Management

- Interview data retention policies
- Privacy compliance (GDPR, etc.)
- Data export capabilities
- Audit trail maintenance

## Advanced Configuration

### Custom Scoring Models

```python
# Implement custom scoring logic
def custom_scoring_algorithm(responses, competencies):
    # Your custom logic here
    return weighted_score
```

### Integration with ATS

```python
# Example ATS integration
def sync_with_ats(interview_data):
    # Push results to your ATS
    pass
```

### Multi-language Support

```python
# Configure for different languages
SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de']
```

For additional support or questions, please refer to the main README.md file or create an issue in the repository.
