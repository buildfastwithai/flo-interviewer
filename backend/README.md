<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# Python Voice Agent

<p>
  <a href="https://cloud.livekit.io/projects/p_/sandbox"><strong>Deploy a sandbox app</strong></a>
  •
  <a href="https://docs.livekit.io/agents/overview/">LiveKit Agents Docs</a>
  •
  <a href="https://livekit.io/cloud">LiveKit Cloud</a>
  •
  <a href="https://blog.livekit.io/">Blog</a>
</p>

A basic example of a voice agent using LiveKit and Python.

## Dev Setup

Clone the repository and install dependencies to a virtual environment:

```console
# Linux/macOS
cd voice-pipeline-agent-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 agent.py download-files
```

<details>
  <summary>Windows instructions (click to expand)</summary>
  
```cmd
:: Windows (CMD/PowerShell)
cd voice-pipeline-agent-python
python3 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

</details>

Set up the environment by copying `.env.example` to `.env.local` and filling in the required values:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`
- `CARTESIA_API_KEY`
- `DEEPGRAM_API_KEY`

You can also do this automatically using the LiveKit CLI:

```console
lk app env
```

Run the agent:

```console
python3 agent.py console
```

This agent can use a frontend application to communicate with. You can use one of our example frontends in [livekit-examples](https://github.com/livekit-examples/), create your own following one of our [client quickstarts](https://docs.livekit.io/realtime/quickstarts/), or test instantly against one of our hosted [Sandbox](https://cloud.livekit.io/projects/p_/sandbox) frontends.

Run the agent with the following command when using a frontend application.

```console
python3 agent.py dev
```

# Technical Interview Voice Agent

A sophisticated AI-powered voice agent designed to conduct structured technical interviews following best practices and the Ideal Technical Interview Playbook. This agent provides fair, thorough, and bias-free evaluation of candidates for software engineering positions.

## Features

### Core Interview Capabilities

- **Structured Interview Flow**: Follows a systematic approach with onboarding, technical assessment, candidate questions, and wrap-up
- **Competency-Based Evaluation**: Covers 5 key areas:
  - Data Structures & Algorithms (30%)
  - System Design (25%)
  - Code Quality & Best Practices (20%)
  - Problem Solving & Communication (15%)
  - Behavioral & Culture Fit (10%)

### Professional Interview Conduct

- **Bias-Free Evaluation**: Evidence-based scoring with behavior-anchored rating scales
- **Respectful Treatment**: Professional conduct with accommodation for different communication styles
- **Accessibility Support**: Flexible question format, thinking time, and technical assistance
- **Time Management**: Structured timing with gentle transitions between sections

### Adaptive Question Bank

- **Skill-Level Appropriate**: Questions tailored for Junior, Mid, Senior, and Staff levels
- **Role-Specific Content**: Customizable for different engineering roles
- **Comprehensive Coverage**: Multiple questions per competency to ensure thorough evaluation

### Quality Assurance

- **Interview Logging**: Detailed tracking of interview progress and candidate responses
- **Scoring Documentation**: Evidence-based evaluation with specific examples
- **Performance Analytics**: Comprehensive interview summaries with weighted scores

## Quick Start

### Prerequisites

- Python 3.8+
- LiveKit account and API keys
- OpenAI API key
- Groq API key (for STT)
- Cartesia API key (for TTS)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd feedback-v0-custom
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables in `.env.local`:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-url
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# AI Service APIs
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
CARTESIA_API_KEY=your-cartesia-key
```

### Running the Agent

```bash
python agent.py
```

The agent will:

1. Connect to your LiveKit room
2. Wait for a participant to join
3. Begin the structured interview process
4. Log detailed interview data and evaluations

## Interview Structure

### Onboarding (2-3 minutes)

- Welcome and expectation setting
- Agenda overview
- Technical setup confirmation
- Initial questions clarification

### Technical Deep Dives (40-45 minutes)

#### Data Structures & Algorithms (15 min)

Example questions by level:

- **Junior**: "Implement a function to reverse a string"
- **Mid**: "Find the second largest element in an array"
- **Senior**: "Design and implement a LRU cache with O(1) operations"
- **Staff**: "Design a distributed consistent hashing algorithm"

#### System Design (15 min)

- **Junior**: Simple application design
- **Mid**: Scalable service design (URL shortener)
- **Senior**: Complex distributed systems
- **Staff**: Global enterprise systems

#### Code Quality & Best Practices (10 min)

- Clean code principles
- Testing methodologies
- Architecture patterns
- Performance optimization

#### Problem Solving & Communication (10 min)

- Technical problem breakdown
- Learning approach
- Communication clarity
- Decision-making process

#### Behavioral & Culture Fit (10 min)

- Project examples
- Team collaboration
- Growth mindset
- Values alignment

### Candidate Questions (5-7 minutes)

- Role and company inquiries
- Technical stack questions
- Growth opportunities

### Wrap-up (2-3 minutes)

- Thank you and next steps
- Timeline communication

## Customization

### Role Configuration

Edit `interview_config.py` to:

- Add new roles (Frontend, Backend, DevOps, etc.)
- Modify competency weights
- Update question banks
- Adjust evaluation criteria

### Skill Level Adaptation

The agent automatically adapts questions based on the candidate's skill level:

- `junior`: Entry-level questions
- `mid`: Intermediate complexity
- `senior`: Advanced technical depth
- `staff`: Leadership and architecture focus

### Environment Customization

Modify the agent initialization in `agent.py`:

```python
agent=InterviewAgent(
    role="Software Engineer",  # Customize role
    candidate_name=participant.identity or "Candidate",
    skill_level="mid"  # junior|mid|senior|staff
)
```

## Evaluation & Scoring

### Scoring Rubric (1-5 scale)

- **1**: Does not meet expectations
- **2**: Partially meets expectations
- **3**: Meets expectations
- **4**: Exceeds expectations
- **5**: Significantly exceeds expectations

### Interview Summary

The agent generates comprehensive summaries including:

- Weighted competency scores
- Overall recommendation (Strong Hire/Hire/Borderline/No Hire)
- Specific evidence for each evaluation
- Areas of strength and improvement

### Data Logging

All interviews are logged with:

- Detailed conversation flow
- Question-by-question evaluation
- Time allocation tracking
- Performance metrics

## Best Practices

### For Interviewers

- Review candidate background before starting
- Ensure quiet, professional environment
- Have backup questions ready
- Take notes during the interview
- Follow up with human review of AI evaluation

### For Candidates

- Test audio/video setup beforehand
- Prepare examples from recent projects
- Ask clarifying questions when needed
- Think out loud during problem-solving
- Ask questions about the role and company

## Technical Requirements

### Minimum System Requirements

- 4GB RAM
- Stable internet connection (10+ Mbps)
- Modern web browser or LiveKit client
- Microphone and speakers/headphones

### API Rate Limits

- OpenAI: Varies by plan
- Groq: Check current limits
- Cartesia: Check current limits
- LiveKit: Based on usage tier

## Troubleshooting

### Common Issues

1. **Audio Quality**: Ensure good microphone and stable connection
2. **API Errors**: Check API keys and rate limits
3. **Connection Issues**: Verify LiveKit configuration
4. **Interview Flow**: Review agent logs for debugging

### Support

- Check logs in the console output
- Review interview_data for session details
- Verify all environment variables are set
- Test API connections independently

## Development

### Adding New Roles

1. Create new role template in `interview_config.py`
2. Define competencies and question banks
3. Set evaluation criteria
4. Update role selection logic

### Extending Functionality

- Add video analysis capabilities
- Integrate with applicant tracking systems
- Implement real-time coaching features
- Add multi-language support

## License

This project is designed for internal use and follows professional interview standards and best practices.

## Contributing

When contributing to this project:

1. Follow the existing code structure
2. Update tests for new functionality
3. Document any new configuration options
4. Ensure bias-free and inclusive practices
