import logging
import json
import os
import aiohttp
from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum

from dotenv import load_dotenv
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    metrics,
    RoomInputOptions,
)
from livekit.plugins import (
    openai,
    noise_cancellation,
    silero,
    groq,
    deepgram
)

# Import our interview configuration
try:
    from interview_config import (
        ROLE_TEMPLATES, 
        SCORING_RUBRIC, 
        SkillLevel,
        get_questions_for_role_and_level,
        get_evaluation_criteria,
        fetch_interview_template,
        get_dynamic_interview_instructions,
        DynamicInterviewTemplate
    )
except ImportError:
    # Fallback if config file doesn't exist
    ROLE_TEMPLATES = {}
    SCORING_RUBRIC = {}
    SkillLevel = None
import random
load_dotenv(dotenv_path=".env.local")   
logger = logging.getLogger("interview-agent")
# session_id=random.randint(100000, 999999)
logging.basicConfig(filename=f'logs/interview_agent.log', level=logging.INFO)


class InterviewStage(Enum):
    INTRODUCTION = "introduction"
    PROJECTS_DISCUSSION = "projects_discussion"
    TECHNICAL_QUESTIONS = "technical_questions"
    WRAP_UP = "wrap_up"
    COMPLETED = "completed"


class InterviewAgent(Agent):
    def __init__(self, 
                 role: str = "Software Engineer", 
                 candidate_name: str = "Candidate",
                 skill_level: str = "mid",
                 record_id: str = None,
                 room_name: str = None) -> None:
        
        # Initialize with a placeholder instruction
        placeholder_instructions = f"Initializing interview for {candidate_name} for {role} position..."
        
        # Pass placeholder instructions to parent class
        super().__init__(
            instructions=placeholder_instructions,
            stt=deepgram.STT(model="nova-2-meeting"),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(voice="alloy"),
            turn_detection=MultilingualModel(),
        )
        
        self.role = role
        self.candidate_name = candidate_name
        self.skill_level = skill_level
        self.record_id = record_id
        self.room_name = room_name
        self.current_stage = InterviewStage.INTRODUCTION
        self.current_skill_index = 0
        self.current_question_index = 0
        self.dynamic_template = None
        self.using_dynamic_template = bool(record_id)
        
        self.interview_data = {
            "start_time": datetime.now().isoformat(),
            "role": role,
            "candidate_name": candidate_name,
            "skill_level": skill_level,
            "record_id": record_id,
            "skills_covered": [],
            "scores": {},
            "notes": {},
            "stage": self.current_stage.value,
            "duration_minutes": 0,
            "questions_asked": [],
            "evaluation_summary": {}
        }

    async def on_enter(self):
        # If we have a record ID, fetch the template first
        if self.record_id:
            logger.info(f"Fetching dynamic template for record ID: {self.record_id}")
            try:
                self.dynamic_template = await fetch_interview_template(self.record_id, self.room_name)
                if self.dynamic_template:
                    # Generate the dynamic instructions but don't try to update self.instructions directly
                    dynamic_instructions = get_dynamic_interview_instructions(
                        self.dynamic_template, 
                        self.candidate_name
                    )
                    logger.info(f"Dynamic instructions: {dynamic_instructions}")
                    # Update the system prompt via the session
                    self.update_instructions(dynamic_instructions)
                    self.role = self.dynamic_template.jobTitle
                    logger.info(f"Successfully loaded dynamic template for '{self.dynamic_template.jobTitle}'")
                    
                    # Log all skills and questions for debugging
                    for skill in self.dynamic_template.skills:
                        logger.info(f"Skill: {skill.name}, Questions: {len(skill.questions)}")
                        for i, q in enumerate(skill.questions):
                            logger.info(f"  Q{i+1}: {q[:50]}...")
                else:
                    logger.warning(f"Failed to load dynamic template, falling back to default for {self.role}")
                    # Fall back to default instructions
                    default_instructions = get_interview_instructions(self.role, self.candidate_name, self.skill_level)
                    self.update_instructions(default_instructions)
            except Exception as e:
                logger.error(f"Error loading dynamic template: {str(e)}")
                # Fall back to default instructions on error
                default_instructions = get_interview_instructions(self.role, self.candidate_name, self.skill_level)
                self.update_instructions(default_instructions)
        else:
            # Update with default template
            default_instructions = get_interview_instructions(self.role, self.candidate_name, self.skill_level)
            self.update_instructions(default_instructions)
            logger.info(f"Using default template for {self.role}")
        
        # Start the interview with introduction
        await self.session.say(
            self.get_introduction_script(),
            allow_interruptions=True
        )

    def update_instructions(self, new_instructions: str):
        """Update the agent's instructions at runtime"""
        # Don't try to set self.instructions directly as it has no setter
        # Instead, use the session to update the system prompt
        if hasattr(self, 'session') and hasattr(self.session, 'llm') and hasattr(self.session.llm, 'update_system_prompt'):
            self.session.llm.update_system_prompt(new_instructions)
            logger.info("Successfully updated agent instructions")
        else:
            logger.warning("Could not update instructions - session or llm not available yet")

    def get_introduction_script(self) -> str:
        """Get conversational role-specific introduction script"""
        if self.using_dynamic_template and self.dynamic_template:
            return self.dynamic_template.introduction_script
        
        return f"Hello {self.candidate_name}! I'm your interviewer for this {self.role} position. Thank you for taking the time to interview with us today. To start, could you please introduce yourself and tell me a bit about your background?"

    def get_skills(self) -> List:
        """Get skills to cover in the interview"""
        if self.using_dynamic_template and self.dynamic_template:
            return self.dynamic_template.skills
        
        # Fallback to default competencies
        if self.role in ROLE_TEMPLATES:
            return ROLE_TEMPLATES[self.role].competencies
        
        return []

    def log_interview_data(self, stage: str, data: Dict):
        """Log interview progress and data for quality assurance"""
        self.interview_data["stage"] = stage
        self.interview_data[stage] = data
        self.interview_data["duration_minutes"] = (
            datetime.now() - datetime.fromisoformat(self.interview_data["start_time"])
        ).total_seconds() / 60
        logger.info(f"Interview stage: {stage}, Data: {json.dumps(data, indent=2)}")

    def update_skill_score(self, skill_name: str, score: int, evidence: str):
        """Update score for a specific skill"""
        self.interview_data["scores"][skill_name] = {
            "score": score,
            "evidence": evidence,
            "timestamp": datetime.now().isoformat()
        }

    def get_interview_summary(self) -> Dict:
        """Generate final interview summary"""
        skills = self.get_skills()
        total_weighted_score = 0
        total_weight = 0
        
        summary = {
            "candidate": self.candidate_name,
            "role": self.role,
            "duration_minutes": self.interview_data["duration_minutes"],
            "skill_scores": {},
            "overall_recommendation": "",
            "strengths": [],
            "areas_for_improvement": [],
            "detailed_feedback": {}
        }
        
        if self.using_dynamic_template and self.dynamic_template:
            # Score calculation for dynamic template
            for skill in skills:
                if skill.name in self.interview_data["scores"]:
                    score_data = self.interview_data["scores"][skill.name]
                    # Default weight is 1.0 for all skills in dynamic template
                    weighted_score = score_data["score"]
                    total_weighted_score += weighted_score
                    total_weight += 1.0
                    
                    summary["skill_scores"][skill.name] = {
                        "score": score_data["score"],
                        "weight": 1.0,
                        "weighted_score": weighted_score,
                        "evidence": score_data["evidence"]
                    }
        else:
            # Traditional competency scoring
            for competency in skills:
                if competency.name in self.interview_data["scores"]:
                    score_data = self.interview_data["scores"][competency.name]
                    weighted_score = score_data["score"] * competency.weight
                    total_weighted_score += weighted_score
                    total_weight += competency.weight
                    
                    summary["skill_scores"][competency.name] = {
                        "score": score_data["score"],
                        "weight": competency.weight,
                        "weighted_score": weighted_score,
                        "evidence": score_data["evidence"]
                    }
        
        # Calculate overall score
        overall_score = total_weighted_score / total_weight if total_weight > 0 else 0
        summary["overall_score"] = round(overall_score, 2)
        
        # Generate recommendation
        if overall_score >= 4.0:
            summary["overall_recommendation"] = "Strong Hire"
        elif overall_score >= 3.5:
            summary["overall_recommendation"] = "Hire"
        elif overall_score >= 2.5:
            summary["overall_recommendation"] = "Borderline - Additional Assessment Needed"
        else:
            summary["overall_recommendation"] = "No Hire"
        
        return summary


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def fetch_user_info_from_api(participant_id: str, room_name: str) -> Optional[Dict]:
    """Fetch user information from Next.js API endpoint"""
    api_url = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')
    endpoint = f"{api_url}/api/interview-info"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                endpoint,
                params={'participantId': participant_id, 'roomName': room_name},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.warning(f"API request failed with status: {response.status}")
                    return None
    except Exception as e:
        logger.error(f"Failed to fetch user info from API: {e}")
        return None


async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting technical interview for participant {participant.identity}")

    # Extract user information from room name and participant metadata
    role = "Software Engineer"  # default
    skill_level = "mid"  # default
    candidate_name = participant.identity or "Candidate"
    record_id = None
    
    # Option 1: Parse from room name (format: interview-name-skill-timestamp)
    room_parts = ctx.room.name.split('-')
    if len(room_parts) >= 3 and room_parts[0] == 'interview':
        candidate_name = room_parts[1].replace('_', ' ')
        skill_level = room_parts[2]
    
    # Option 2: Parse from participant metadata (preferred)
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            role = metadata.get('role', role)
            skill_level = metadata.get('skill', skill_level)
            record_id = metadata.get('recordId', record_id)
            logger.info(f"Using metadata - Role: {role}, Skill: {skill_level}, Record ID: {record_id}")
        except json.JSONDecodeError:
            logger.warning("Failed to parse participant metadata")
    
    # Option 3: Fetch from Next.js API endpoint
    api_user_info = await fetch_user_info_from_api(participant.identity, ctx.room.name)
    if api_user_info:
        candidate_name = api_user_info.get('candidateName', candidate_name)
        skill_level = api_user_info.get('skillLevel', skill_level)
        role = api_user_info.get('role', role)
        record_id = api_user_info.get('recordId', record_id)
        logger.info(f"Using API data - Name: {candidate_name}, Role: {role}, Skill: {skill_level}, Record ID: {record_id}")
    
    # Option 4: Parse from environment variables (fallback)
    role = os.getenv('INTERVIEW_ROLE', role)
    skill_level = os.getenv('INTERVIEW_SKILL_LEVEL', skill_level)
    record_id = os.getenv('INTERVIEW_RECORD_ID', record_id)

    usage_collector = metrics.UsageCollector()

    # Log metrics and collect usage data
    def on_metrics_collected(agent_metrics: metrics.AgentMetrics):
        metrics.log_metrics(agent_metrics)
        usage_collector.collect(agent_metrics)

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        # Adjusted for interview context - longer delays for thinking time
        min_endpointing_delay=1.0,
        max_endpointing_delay=8.0,
    )

    # Trigger the on_metrics_collected function when metrics are collected
    session.on("metrics_collected", on_metrics_collected)

    await session.start(
        room=ctx.room,
        agent=InterviewAgent(
            role=role,
            candidate_name=candidate_name,
            skill_level=skill_level,
            record_id=record_id,
            room_name=ctx.room.name
        ),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )


def get_interview_instructions(role: str, candidate_name: str, skill_level: str) -> str:
    """Generate interview instructions for responsive, conversational behavior"""
    
    return f"""
You are an INTERVIEWER conducting a technical interview for a {role} position. {candidate_name} is the CANDIDATE you are evaluating.

INTERVIEW FLOW (3 STAGES):
1. INTRODUCTION STAGE: Ask candidate to introduce themselves and their background
2. TECHNICAL STAGE: Ask skill-based questions related to their projects or general technical knowledge

CRITICAL BEHAVIOR RULES:
- You are the interviewer, NOT the candidate
- ALWAYS respond to what the candidate just said before asking the next question
- Be conversational and natural - acknowledge their answers
- NEVER speak ratings or scores out loud (e.g., never say "Rating: 1")
- Keep all evaluation completely silent and internal

MOST IMPORTANT RULE: ASK ONLY ONE QUESTION AT A TIME
- Never ask multiple questions in a single response
- Wait for the candidate to answer before moving to the next question
- Only introduce a new question after the candidate has responded to the previous one

CONVERSATIONAL FLOW:
1. LISTEN to {candidate_name}'s answer
2. ACKNOWLEDGE their response (brief comment on their answer)
3. ASK ONE follow-up question or move to next topic/stage

STAGE-SPECIFIC GUIDANCE:
INTRODUCTION: "Tell me about yourself and your background"
PROJECTS: "Can you walk me through some projects you've worked on?" "What technologies did you use?" "What challenges did you face?"
TECHNICAL: Ask questions based on technologies/concepts mentioned in their projects, or general {role} skills

RESPONSE PATTERNS:
- If they give a good answer: "That's interesting! Now let me ask you about..."
- If they give a partial answer: "I see, that covers part of it. Can you also explain..."
- If they don't know: "No problem, let's try a different topic. What about..."
- If they ask to repeat: "Of course! I asked about..." then repeat the question
- If they give unclear answer: "Could you clarify what you mean by..."

YOUR INTERVIEWING STYLE:
- Be responsive and adaptive to their answers
- Ask follow-up questions based on their responses
- Show you're listening by referencing what they said
- Keep questions concise but be conversational
- Help them if they're struggling, then move to next topic
- Connect technical questions to their mentioned projects when possible

EVALUATION (SILENT - NEVER SPEAK RATINGS):
- Rate competencies 1-5 based on {candidate_name}'s answers
- NEVER say ratings out loud to the candidate
- Keep all scoring completely silent and internal
- Never mention scores verbally

EXAMPLE OF GOOD FLOW:
Interviewer: "Can you explain your approach to debugging complex issues?"
Candidate: [gives answer]
Interviewer: "That's a good approach using systematic debugging. Now, could you tell me about a particularly challenging bug you solved recently?"

REMEMBER: Ask ONE question, wait for an answer, acknowledge the answer, then ask your next question. Be a human interviewer, not a question robot.
"""


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
