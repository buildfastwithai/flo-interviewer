import logging
import json
import os
import aiohttp
from datetime import datetime, date
from typing import Dict, List, Optional, Union
from enum import Enum
from dataclasses import dataclass

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
    function_tool,
    RunContext,
    ChatContext,
    RoomInputOptions
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


@dataclass
class InterviewSessionData:
    """Shared data structure for interview session state"""
    role: str = "Software Engineer"
    candidate_name: str = "Candidate"
    skill_level: str = "mid"
    record_id: Optional[str] = None
    room_name: Optional[str] = None
    room_id: Optional[str] = None
    interview_id: Optional[str] = None
    all_questions: List[str] = None
    current_question_index: int = 0
    questions_list: str = ""
    interview_data: Dict = None
    dynamic_template: Optional[object] = None
    using_dynamic_template: bool = False

    def __post_init__(self):
        if self.all_questions is None:
            self.all_questions = []
        if self.interview_data is None:
            self.interview_data = {
                "start_time": datetime.now().isoformat(),
                "role": self.role,
                "candidate_name": self.candidate_name,
                "record_id": self.record_id,
                "duration_minutes": 0,
                "room_id": self.room_id or "",
                "interview_id": self.interview_id or "",
            }


class BaseInterviewAgent(Agent):
    """Base interview agent with shared functionality"""
    
    def __init__(self, 
                 instructions: str,
                 chat_ctx: Optional[ChatContext] = None) -> None:
        
        super().__init__(
            instructions=instructions,
            chat_ctx=chat_ctx,
            stt=deepgram.STT(model="nova-3"),
            llm=openai.LLM(model="gpt-4.1"),
            tts=openai.TTS(voice="alloy"),
            turn_detection=MultilingualModel(),
        )
    
    def get_skills(self) -> List:
        """Get skills to cover in the interview"""
        session_data: InterviewSessionData = self.session.userdata
        
        if session_data.using_dynamic_template and session_data.dynamic_template:
            return session_data.dynamic_template.skills
        
        # Fallback to default competencies
        if session_data.role in ROLE_TEMPLATES:
            return ROLE_TEMPLATES[session_data.role].competencies
        
        return []

    def log_interview_data(self, stage: str, data: Dict):
        """Log interview progress and data for quality assurance"""
        session_data: InterviewSessionData = self.session.userdata
        session_data.interview_data["stage"] = stage
        session_data.interview_data[stage] = data
        session_data.interview_data["duration_minutes"] = (
            datetime.now() - datetime.fromisoformat(session_data.interview_data["start_time"])
        ).total_seconds() / 60
        logger.info(f"Interview stage: {stage}, Data: {json.dumps(data, indent=2)}")

    def update_skill_score(self, skill_name: str, score: int, evidence: str):
        """Update score for a specific skill"""
        session_data: InterviewSessionData = self.session.userdata
        if "scores" not in session_data.interview_data:
            session_data.interview_data["scores"] = {}
            
        session_data.interview_data["scores"][skill_name] = {
            "score": score,
            "evidence": evidence,
            "timestamp": datetime.now().isoformat()
        }

    def get_interview_summary(self) -> Dict:
        """Generate final interview summary"""
        session_data: InterviewSessionData = self.session.userdata
        skills = self.get_skills()
        total_weighted_score = 0
        total_weight = 0
        
        summary = {
            "candidate": session_data.candidate_name,
            "role": session_data.role,
            "duration_minutes": session_data.interview_data["duration_minutes"],
            "skill_scores": {},
            "overall_recommendation": "",
            "strengths": [],
            "areas_for_improvement": [],
            "detailed_feedback": {}
        }
        
        if session_data.using_dynamic_template and session_data.dynamic_template:
            # Score calculation for dynamic template
            for skill in skills:
                if skill.name in session_data.interview_data["scores"]:
                    score_data = session_data.interview_data["scores"][skill.name]
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
                if competency.name in session_data.interview_data["scores"]:
                    score_data = session_data.interview_data["scores"][competency.name]
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


class IntroductionAgent(BaseInterviewAgent):
    """Agent responsible for the introduction phase of the interview"""
    
    def __init__(self, chat_ctx: Optional[ChatContext] = None) -> None:
        instructions = """
You are an interviewer beginning a technical interview. Start by welcoming the candidate,
then proceed directly to asking the first technical question from the provided list of questions.

YOU MUST:
1. Begin with a welcome greeting
2. Introduce yourself as the interviewer for the role
3. Ask the FIRST technical question from the provided list EXACTLY as written
"""
        
        super().__init__(instructions=instructions, chat_ctx=chat_ctx)
    
    async def on_enter(self) -> None:
        """Called when this agent becomes active"""
        session_data: InterviewSessionData = self.session.userdata
        
        # Get the first question to start with
        first_question = session_data.all_questions[0] if session_data.all_questions else ""
        
        # Create introduction text with first question
        intro_text = f"Welcome {session_data.candidate_name}, I am an interviewer for the {session_data.role} role and I will be taking your interview. Let's begin.\n\n{first_question}"
        logger.info(f"Starting with introduction and first question: {intro_text}")
        
        # Start with the introduction and first question
        session_data.current_question_index = 0
        await self.session.say(intro_text, allow_interruptions=True)

    @function_tool()
    async def proceed_to_technical_questions(self, context: RunContext[InterviewSessionData]) -> Union[Agent, None]:
        """Use this tool once the introduction is complete to proceed to the technical questions phase"""
        session_data = context.userdata
        logger.info("Moving from introduction to technical questions phase")
        # We've already asked question 0 in the introduction
        session_data.current_question_index = 1  
        return TechnicalQuestionsAgent(chat_ctx=self.session.chat_ctx)


class TechnicalQuestionsAgent(BaseInterviewAgent):
    """Agent responsible for the technical questions phase of the interview"""
    
    def __init__(self, chat_ctx: Optional[ChatContext] = None) -> None:
        instructions = """
STRICT INSTRUCTIONS FOR TECHNICAL INTERVIEWER:

YOU MUST FOLLOW THIS EXACT INTERVIEW FLOW:
1. When the candidate finishes answering a question, BRIEFLY acknowledge their response
2. Then IMMEDIATELY use the ask_next_question tool to get the next question
3. Ask each question EXACTLY as written - DO NOT modify the wording
4. If the candidate doesn't know an answer, acknowledge and use ask_next_question tool
5. DO NOT SKIP any questions under any circumstances
6. STRICTLY FOLLOW THE NUMERICAL ORDER of questions

CRITICAL: After each candidate answer, you MUST use the ask_next_question tool.
When there are no more questions left, the tool will automatically move to the wrap-up phase.

DO NOT engage in extensive follow-up discussions - your job is to move through all questions efficiently.
"""
        super().__init__(instructions=instructions, chat_ctx=chat_ctx)
    
    async def on_enter(self) -> None:
        """Called when this agent becomes active"""
        session_data: InterviewSessionData = self.session.userdata
        
        # When this agent becomes active, immediately ask the next question
        if session_data.all_questions and session_data.current_question_index < len(session_data.all_questions):
            next_question = session_data.all_questions[session_data.current_question_index]
            await self.session.say(f"Next, {next_question}", allow_interruptions=True)
            session_data.current_question_index += 1
        elif session_data.current_question_index == 0 and session_data.all_questions:
            # This is a fallback in case we're starting from the beginning
            question = session_data.all_questions[0]
            await self.session.say(f"Let's start with this question: {question}", allow_interruptions=True)
            session_data.current_question_index = 1
    
    @function_tool()
    async def ask_next_question(self, context: RunContext[InterviewSessionData]) -> Union[Agent, None]:
        """Use this tool to ask the next question in the sequence"""
        session_data = context.userdata
        
        if session_data.all_questions and session_data.current_question_index < len(session_data.all_questions):
            next_question = session_data.all_questions[session_data.current_question_index]
            await self.session.say(next_question, allow_interruptions=True)
            session_data.current_question_index += 1
            return None  # Stay in this agent
        else:
            # If no more questions, move to wrap-up
            return WrapUpAgent(chat_ctx=self.session.chat_ctx)

    @function_tool()
    async def proceed_to_wrap_up(self, context: RunContext[InterviewSessionData]) -> Union[Agent, None]:
        """Use this tool when all questions have been asked to proceed to the wrap-up phase"""
        return WrapUpAgent(chat_ctx=self.session.chat_ctx)


class WrapUpAgent(BaseInterviewAgent):
    """Agent responsible for the wrap-up phase of the interview"""
    
    def __init__(self, chat_ctx: Optional[ChatContext] = None) -> None:
        instructions = """
STRICT INSTRUCTIONS FOR INTERVIEW WRAP-UP:

You MUST follow this exact wrap-up flow:
1. Ask the candidate if they have any questions for you about the role or company
2. If they DO have questions, answer them professionally and completely
3. If they DON'T have questions, thank them for their time, ask them to end the interview, say goodbye and DON'T SPEAK ANY MORE
4. If they indicate they have no more questions, use the complete_interview tool to end the session

Remember: Once you've indicated the interview is over, do not say anything further.
"""
        super().__init__(instructions=instructions, chat_ctx=chat_ctx)
    
    async def on_enter(self) -> None:
        """Called when this agent becomes active"""
        await self.session.say("We've gone through all the questions I had for you. Do you have any questions for me about the role or the company?", allow_interruptions=True)

    @function_tool()
    async def complete_interview(self, context: RunContext[InterviewSessionData]) -> None:
        """Use this tool when the wrap-up is complete to end the interview"""
        session_data = context.userdata
        session_data.interview_data["end_time"] = datetime.now().isoformat()
        session_data.interview_data["duration_minutes"] = (
            datetime.fromisoformat(session_data.interview_data["end_time"]) - 
            datetime.fromisoformat(session_data.interview_data["start_time"])
        ).total_seconds() / 60
        
        # Log final data
        logger.info(f"Interview completed. Duration: {session_data.interview_data['duration_minutes']} minutes")
        
        # Say goodbye
        await self.session.say("Thank you for your time today. The interview is now complete. Goodbye!", allow_interruptions=False)


class InterviewAgent(BaseInterviewAgent):
    """Legacy monolithic interview agent - kept for backward compatibility"""
    
    def __init__(self, 
                 role: str = "Software Engineer", 
                 candidate_name: str = "Candidate",
                 skill_level: str = "mid",
                 record_id: str = None,
                 room_name: str = None,
                 room_id: str = None,
                 interview_id: str = None,
                 all_questions: List[str] = None,
                 questions_list: str = "") -> None:
        
        # Create specific instructions with all questions if provided
        if all_questions and questions_list:
            # Create direct instructions with the FULL list of questions
            full_instructions = f"""
STRICT INSTRUCTIONS FOR TECHNICAL INTERVIEWER:

YOU MUST ONLY ASK THE EXACT QUESTIONS LISTED BELOW IN THE EXACT ORDER SHOWN:

{questions_list}

YOU MUST FOLLOW THESE RULES:
1. ONLY ask the exact questions shown above, in the exact order (1, 2, 3, 4...)
2. NEVER create your own questions or substitute different questions
3. After each candidate answer, briefly acknowledge their response
4. Then immediately proceed to the next question in the numbered list
5. If the candidate says they don't know, move to the next question
6. DO NOT SKIP QUESTIONS under any circumstances
7. DO NOT MODIFY THE WORDING of any question
8. STRICTLY FOLLOW THE NUMBERED ORDER - after question 1, ask question 2, then 3, and so on

INTERVIEW FLOW:
- Start with a brief introduction: "Welcome {candidate_name}, I am an interviewer for the {role} role and I will be taking your interview. Let's begin."
- Immediately ask Question #1 exactly as written above
- After the candidate answers, acknowledge and move to Question #2
- Continue in exact order through all questions
- After the last question, ask the candidate if they have any questions for you
- If they have questions, answer them
- If they don't have questions, thank them for their time and ask them to end the interview and say goodbye and don't speak any more

The candidate's name is {candidate_name}.
The role is {role}.

FAILURE TO FOLLOW THESE INSTRUCTIONS WILL RESULT IN TERMINATION.
"""
        else:
            # Fallback instructions if no questions provided
            full_instructions = f"You are an interviewer for {role}. Wait for further instructions."
        
        # Pass FULL instructions to parent class
        super().__init__(instructions=full_instructions)
        
        # Initialize session data directly since we're not using typed session
        self.role = role
        self.candidate_name = candidate_name
        self.skill_level = skill_level
        self.record_id = record_id
        self.room_name = room_name
        self.room_id = room_id
        self.interview_id = interview_id
        self.current_stage = InterviewStage.INTRODUCTION
        self.current_skill_index = 0
        self.current_question_index = 0
        self.dynamic_template = None
        self.using_dynamic_template = bool(record_id)
        self.all_questions = all_questions or []
        self.questions_list = questions_list
        
        # NOTE: Interview data storage is handled by the frontend
        # This is kept only for local logging/tracking, not for database storage
        self.interview_data = {
            "start_time": datetime.now().isoformat(),
            "role": role,
            "candidate_name": candidate_name,
            "record_id": record_id,
            "duration_minutes": 0,
            "room_id": room_id or "",
            "interview_id": interview_id or "",
        }

    async def on_enter(self):
        # Get the first question to start with
        first_question = self.all_questions[0] if self.all_questions else ""
        
        # Create introduction text with first question
        intro_text = f"Welcome {self.candidate_name}, I am an interviewer for the {self.role} role and I will be taking your interview. Let's begin.\n\n{first_question}"
        logger.info(f"Starting with introduction and first question: {intro_text}")
        
        # Start with the introduction and first question
        await self.session.say(intro_text, allow_interruptions=True)
    
    def update_instructions(self, new_instructions: str):
        """Update the agent's instructions at runtime"""
        try:
            if hasattr(self, 'session') and hasattr(self.session, 'llm') and hasattr(self.session.llm, 'update_system_prompt'):
                self.session.llm.update_system_prompt(new_instructions)
                logger.info("Successfully updated agent instructions")
            else:
                logger.warning("Could not update instructions - session or llm not available yet")
        except Exception as e:
            logger.error(f"Error updating instructions: {str(e)}")

    # Override methods with direct property access since we're not using session.userdata
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
        if "scores" not in self.interview_data:
            self.interview_data["scores"] = {}
            
        self.interview_data["scores"][skill_name] = {
            "score": score,
            "evidence": evidence,
            "timestamp": datetime.now().isoformat()
        }


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


async def extract_questions_from_template(record_id: str, room_name: str) -> tuple:
    """Extract all questions from a template and return as a list and formatted string"""
    all_questions = []
    questions_list = ""
    role_title = "Technical Role"  # Default
    
    try:
        # Fetch the template
        dynamic_template = await fetch_interview_template(record_id, room_name)
        if dynamic_template:
            role_title = dynamic_template.jobTitle
            
            # Extract ALL questions from the template
            for skill in dynamic_template.skills:
                if skill.questions and len(skill.questions) > 0:
                    for question in skill.questions:
                        # Extract just the question text from JSON if needed
                        question_text = question
                        if question_text.startswith('{') and '"question":' in question_text:
                            try:
                                question_obj = json.loads(question_text)
                                if 'question' in question_obj:
                                    question_text = question_obj['question']
                            except json.JSONDecodeError:
                                pass
                        all_questions.append(question_text)
            
            # Log all questions for debugging
            logger.info(f"Extracted {len(all_questions)} questions from template")
            for i, q in enumerate(all_questions):
                logger.info(f"  Q{i+1}: {q[:100]}...")
            
            # Build a numbered list of ALL questions
            for i, q in enumerate(all_questions):
                questions_list += f"{i+1}. {q}\n\n"
            
            # Log the questions
            logger.info(f"The questions are {questions_list}")
        else:
            logger.error("Failed to load dynamic template")
            
    except Exception as e:
        logger.error(f"Error extracting questions from template: {str(e)}")
        
    return all_questions, questions_list, role_title


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
    room_id = None
    interview_id = None
    
    # Option 1: Parse from room name (format: interview-name-skill-timestamp)
    # room_parts = ctx.room.name.split('-')
    # if len(room_parts) >= 3 and room_parts[0] == 'interview':
    #     candidate_name = room_parts[1].replace('_', ' ')
    #     skill_level = room_parts[2]
    
    # Option 2: Parse from participant metadata (preferred)
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            role = metadata.get('role', role)
            skill_level = metadata.get('skill', skill_level)
            record_id = metadata.get('recordId', record_id)
            candidate_name = metadata.get('candidateName', candidate_name)
            room_id = metadata.get('roomId', room_id)
            interview_id = metadata.get('interviewId', interview_id)
            logger.info(f"Using metadata - Role: {role}, Skill: {skill_level}, Record ID: {record_id}, Room ID: {room_id}, Interview ID: {interview_id}")
        except json.JSONDecodeError:
            logger.warning("Failed to parse participant metadata")
    
    # Option 3: Fetch from Next.js API endpoint - Commented out as it doesn't appear to be used
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
    
    # If no interview_id is provided, fallback to room name as interview ID
    if not interview_id:
        interview_id = ctx.room.name
        logger.info(f"No interview ID provided, using room name as ID: {interview_id}")

    # CRITICAL CHANGE: Load all questions BEFORE creating the agent and session
    all_questions = []
    questions_list = ""
    
    if record_id:
        logger.info(f"Fetching dynamic template for record ID: {record_id}")
        all_questions, questions_list, fetched_role = await extract_questions_from_template(record_id, ctx.room.name)
        if fetched_role:
            role = fetched_role
    
    usage_collector = metrics.UsageCollector()

    # Log metrics and collect usage data
    def on_metrics_collected(agent_metrics: metrics.AgentMetrics):
        metrics.log_metrics(agent_metrics)
        usage_collector.collect(agent_metrics)

    # Create the session data object
    session_data = InterviewSessionData(
        role=role,
        candidate_name=candidate_name,
        skill_level=skill_level,
        record_id=record_id,
        room_name=ctx.room.name,
        room_id=room_id,
        interview_id=interview_id,
        all_questions=all_questions,
        questions_list=questions_list,
        using_dynamic_template=bool(record_id)
    )

    # Create the session with typed session data
    session = AgentSession[InterviewSessionData](
        userdata=session_data,
        vad=ctx.proc.userdata["vad"],
        # Adjusted for interview context - longer delays for thinking time
        min_endpointing_delay=1.0,
        max_endpointing_delay=8.0,
    )
    
    print("The session is", session)
    logger.info(f"The session is {session}")

    # Trigger the on_metrics_collected function when metrics are collected
    session.on("metrics_collected", on_metrics_collected)

    # Choose appropriate starting agent based on configuration
    # Default to using workflow agents unless explicitly disabled
    if os.getenv('USE_LEGACY_AGENT', 'false').lower() == 'true':
        # Use legacy monolithic agent if specifically requested
        logger.info("Using legacy monolithic interview agent")
        starting_agent = InterviewAgent(
            role=role,
            candidate_name=candidate_name,
            skill_level=skill_level,
            record_id=record_id,
            room_name=ctx.room.name,
            room_id=room_id,
            interview_id=interview_id,
            all_questions=all_questions,
            questions_list=questions_list
        )
    else:
        # Default to workflow mode with separate agents for each phase
        logger.info("Using workflow-based interview agents")
        starting_agent = IntroductionAgent()

    await session.start(
        room=ctx.room,
        agent=starting_agent,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )


# This get_interview_instructions function is not used - we use get_dynamic_interview_instructions instead
# def get_interview_instructions(role: str, candidate_name: str, skill_level: str) -> str:
#     """Generate interview instructions for responsive, conversational behavior"""
    
#     return f"""
# You are an INTERVIEWER conducting a technical interview for a {role} position. {candidate_name} is the CANDIDATE you are evaluating.

# INTERVIEW FLOW (3 STAGES):
# 1. INTRODUCTION STAGE: Ask candidate to introduce themselves and their background
# 2. TECHNICAL STAGE: Ask skill-based questions related to their projects or general technical knowledge

# CRITICAL BEHAVIOR RULES:
# - You are the interviewer, NOT the candidate
# - ALWAYS respond to what the candidate just said before asking the next question
# - Be conversational and natural - acknowledge their answers
# - NEVER speak ratings or scores out loud (e.g., never say "Rating: 1")
# - Keep all evaluation completely silent and internal

# MOST IMPORTANT RULE: ASK ONLY ONE QUESTION AT A TIME
# - Never ask multiple questions in a single response
# - Wait for the candidate to answer before moving to the next question
# - Only introduce a new question after the candidate has responded to the previous one

# CONVERSATIONAL FLOW:
# 1. LISTEN to {candidate_name}'s answer
# 2. ACKNOWLEDGE their response (brief comment on their answer)
# 3. ASK ONE follow-up question or move to next topic/stage

# STAGE-SPECIFIC GUIDANCE:
# INTRODUCTION: "Tell me about yourself and your background"
# PROJECTS: "Can you walk me through some projects you've worked on?" "What technologies did you use?" "What challenges did you face?"
# TECHNICAL: Ask questions based on technologies/concepts mentioned in their projects, or general {role} skills

# RESPONSE PATTERNS:
# - If they give a good answer: "That's interesting! Now let me ask you about..."
# - If they give a partial answer: "I see, that covers part of it. Can you also explain..."
# - If they don't know: "No problem, let's try a different topic. What about..."
# - If they ask to repeat: "Of course! I asked about..." then repeat the question
# - If they give unclear answer: "Could you clarify what you mean by..."

# YOUR INTERVIEWING STYLE:
# - Be responsive and adaptive to their answers
# - Ask follow-up questions based on their responses
# - Show you're listening by referencing what they said
# - Keep questions concise but be conversational
# - Help them if they're struggling, then move to next topic
# - Connect technical questions to their mentioned projects when possible

# EVALUATION (SILENT - NEVER SPEAK RATINGS):
# - Rate competencies 1-5 based on {candidate_name}'s answers
# - NEVER say ratings out loud to the candidate
# - Keep all scoring completely silent and internal
# - Never mention scores verbally

# EXAMPLE OF GOOD FLOW:
# Interviewer: "Can you explain your approach to debugging complex issues?"
# Candidate: [gives answer]
# Interviewer: "That's a good approach using systematic debugging. Now, could you tell me about a particularly challenging bug you solved recently?"

# REMEMBER: Ask ONE question, wait for an answer, acknowledge the answer, then ask your next question. Be a human interviewer, not a question robot.
# """


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
