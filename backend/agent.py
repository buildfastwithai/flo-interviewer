import json
import os
import aiohttp
import asyncio
from datetime import datetime, date
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
from livekit.agents.metrics import LLMMetrics, STTMetrics, TTSMetrics, EOUMetrics
from livekit.plugins import (
    openai,
    noise_cancellation,
    silero,
    groq,
    cartesia,
    assemblyai,
    deepgram
)

# Import our metrics collector
from metrics import MetricsCollector

# Import our logger
from logger import logger, log_info, log_error, log_warning, log_interview_data, setup_logger

# Import our interview configuration
try:
    from interview_config import (
        fetch_interview_template,
        DynamicInterviewTemplate
    )
except ImportError:
    # Fallback if config file doesn't exist
    DynamicInterviewTemplate = None
# import random

load_dotenv(dotenv_path=".env.local")   
# session_id=random.randint(100000, 999999)


class InterviewStage(Enum):
    INTRODUCTION = "introduction"


class InterviewAgent(Agent):
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
7. Present each question in a natural, conversational manner as a real interviewer would, but NEVER alter the core content, meaning, or difficulty level of any question
8. STRICTLY FOLLOW THE NUMBERED ORDER - after question 1, ask question 2, then 3, and so on
9.Don't ask too many follow up questions to the same question only 1-2 follow up questions to the same question
10. Max 6 follow up questions in the entire interview
11. IF THERE IS A NUMERICAL VALUE IN THE QUESTION, THEN CONVERT THE NUMERICAL VALUE TO TEXT IN A WAY THAT IS EASY TO UNDERSTAND, SUCH AS 20,000 AS "TWENTY THOUSAND RUPEES"
12. NEVER ANSWER THE QUESTION YOURSELF or Give Hint, ALWAYS ASK THE CANDIDATE TO ANSWER THE QUESTION 
13. For questions or scenarios with sub-questions, first present the main question/scenario as written above. Then, verify the candidate's understanding of the question/scenario before proceeding to ask the sub-questions in the order they appear.


INTERVIEW FLOW:
- Start with a brief introduction: "Welcome {candidate_name}, I am an interviewer for the {role} role and I will be taking your interview.
- Ask the candidate if he is ready to begin the interview
- If he is not ready, ask him to wait for a moment and then ask him if he is ready to begin the interview
- If he is ready, then immediately ask Question #1 exactly as written above
- After the candidate answers, acknowledge it
- Then ask the candidate if he wants to add more details to his answer
- If he wants to add more details, ask him to do so
- If he doesn't want to add more details.
- If only required, ask follow up questions to the answer that would suitable to previous question and candidate's answer
- If not required, move to the next question
- If the candidate says "I don't know," or something similar, respond politely and continue with the next question.
- Continue in exact order through all questions
- After the last question, ask the candidate if they have any questions for you
- If they have questions, answer them
- If they don't have questions, thank them for their time and ask them to end the interview and say goodbye and don't speak any more

The candidate's name is {candidate_name}.
The role is {role}.

IMPORTANT:
1. Do not mention or state the question number when asking each question.
2. If a question contains markdown formatting symbols (such as **, __, `, or _), do not include these symbols when reading the question aloud or presenting it to the candidate.


CONTEXTUAL TRANSITIONS (USE ONLY WHEN APPROPRIATE)

Before asking a question, if it clearly belongs to a distinct category or topic, you may use a brief, relevant transition phrase to introduce that section. Use each transition phrase only once, before the first question in its respective category, and only if it is contextually appropriate.

Examples of transition phrases:
- For a new business, technical, behavioral, or scenario-based section, you may say:  
  "Let's move on to the next section."  
  "Now, let's take a look at a new type of question."  
  "We'll now discuss a different topic."  
  "Let's proceed to the next category."

Guidelines:
- Use a transition phrase only once per category or topic, and only if it helps clarify the change in question type.
- Do not invent new transition phrases beyond simple, neutral introductions.
- Do not repeat or elaborate on transition phrases.
- Always follow the transition phrase immediately with the exact question from the list, without any additional commentary or interruption.

FAILURE TO FOLLOW THESE INSTRUCTIONS WILL RESULT IN TERMINATION.


"""
        else:
            # Fallback instructions if no questions provided
            full_instructions = f"You are an interviewer for {role}. Wait for further instructions."
        
        # Pass FULL instructions to parent class
        super().__init__(
            instructions=full_instructions,  # Using full instructions from the start
            stt=assemblyai.STT(
            end_of_turn_confidence_threshold=0.5,
            min_end_of_turn_silence_when_confident=160,
            max_turn_silence=3000,
        ),
        llm=openai.LLM(
            model="gpt-4.1",
            temperature=0.7,
        ),
        tts=cartesia.TTS(
      model="sonic-2",
      voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
   ),
        vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
        )
        
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
        
        # Initialize metrics collector
        self.metrics_collector = MetricsCollector()
        
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
            "metrics": self.metrics_collector.metrics_data
        }
        
        # Set up metrics collectors
        def llm_metrics_wrapper(metrics: LLMMetrics):
            asyncio.create_task(self.metrics_collector.on_llm_metrics_collected(metrics))
        
        def stt_metrics_wrapper(metrics: STTMetrics):
            asyncio.create_task(self.metrics_collector.on_stt_metrics_collected(metrics))
        
        def eou_metrics_wrapper(metrics: EOUMetrics):
            asyncio.create_task(self.metrics_collector.on_eou_metrics_collected(metrics))
        
        def tts_metrics_wrapper(metrics: TTSMetrics):
            asyncio.create_task(self.metrics_collector.on_tts_metrics_collected(metrics))
        
        # Attach listeners to the appropriate components
        if hasattr(self, 'llm'):
            self.llm.on("metrics_collected", llm_metrics_wrapper)
        
        if hasattr(self, 'stt'):
            self.stt.on("metrics_collected", stt_metrics_wrapper)
            self.stt.on("eou_metrics_collected", eou_metrics_wrapper)
        
        if hasattr(self, 'tts'):
            self.tts.on("metrics_collected", tts_metrics_wrapper)

    async def on_enter(self):
        # Get the first question to start with
        first_question = self.all_questions[0] if self.all_questions else ""
        
        # Create introduction text with first question
        intro_text = f"Welcome {self.candidate_name}, I am an interviewer for the {self.role} and I will be taking your interview. Are you ready to begin the interview?"
        log_info(f"Starting with introduction and first question: {intro_text}")
        
        # Start with the introduction and first question
        await self.session.say(intro_text, allow_interruptions=True)

    async def on_exit(self):
        """Store final metrics and summary when interview ends"""
        # Calculate average metrics
        avg_metrics = self.metrics_collector.calculate_avg_metrics()
        
        # Update interview data with final metrics
        self.interview_data["metrics"]["averages"] = avg_metrics
        self.interview_data["end_time"] = datetime.now().isoformat()
        self.interview_data["duration_minutes"] = (
            datetime.fromisoformat(self.interview_data["end_time"]) - 
            datetime.fromisoformat(self.interview_data["start_time"])
        ).total_seconds() / 60
        
        # Log final metrics
        log_info(f"Interview ended. Final metrics: {json.dumps(avg_metrics, indent=2)}")
        
        # You can add code here to send metrics to an API endpoint if needed

    def update_instructions(self, new_instructions: str):
        """Update the agent's instructions at runtime"""
        try:
            if hasattr(self, 'session') and hasattr(self.session, 'llm') and hasattr(self.session.llm, 'update_system_prompt'):
                self.session.llm.update_system_prompt(new_instructions)
                log_info("Successfully updated agent instructions")
            else:
                log_warning("Could not update instructions - session or llm not available yet")
        except Exception as e:
            log_error("Error updating instructions", e)


    def log_interview_data(self, stage: str, data: Dict):
        """Log interview progress and data for quality assurance"""
        log_interview_data(self.interview_data, stage, data)


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


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
            log_info(f"Extracted {len(all_questions)} questions from template")
            for i, q in enumerate(all_questions):
                log_info(f"  Q{i+1}: {q[:100]}...")
            
            # Build a numbered list of ALL questions
            for i, q in enumerate(all_questions):
                questions_list += f"{i+1}. {q}\n\n"
            
            # Log the questions
            log_info(f"The questions are {questions_list}")
        else:
            log_error("Failed to load dynamic template", "No template returned")
            
    except Exception as e:
        log_error(f"Error extracting questions from template", e)
        
    return all_questions, questions_list, role_title


async def entrypoint(ctx: JobContext):
    log_info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    log_info(f"starting technical interview for participant {participant.identity}")

    # Extract user information from room name and participant metadata
    role = "Software Engineer"  # default
    skill_level = "mid"  # default
    candidate_name = participant.identity or "Candidate"
    record_id = None
    room_id = None
    interview_id = None
    
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            role = metadata.get('role', role)
            skill_level = metadata.get('skill', skill_level)
            record_id = metadata.get('recordId', record_id)
            candidate_name = metadata.get('candidateName', candidate_name)
            room_id = metadata.get('roomId', room_id)
            interview_id = metadata.get('interviewId', interview_id)
            log_info(f"Using metadata - Role: {role}, Skill: {skill_level}, Record ID: {record_id}, Room ID: {room_id}, Interview ID: {interview_id}")
        except json.JSONDecodeError:
            log_warning("Failed to parse participant metadata")
    
    # If no interview_id is provided, fallback to room name as interview ID
    if not interview_id:
        interview_id = ctx.room.name
        log_info(f"No interview ID provided, using room name as ID: {interview_id}")

    # CRITICAL CHANGE: Load all questions BEFORE creating the agent and session
    all_questions = []
    questions_list = ""
    
    if record_id:
        log_info(f"Fetching dynamic template for record ID: {record_id}")
        all_questions, questions_list, fetched_role = await extract_questions_from_template(record_id, ctx.room.name)
        if fetched_role:
            role = fetched_role
    
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
    print("The session is", session)
    log_info(f"The session is {session}")

    # Trigger the on_metrics_collected function when metrics are collected
    session.on("metrics_collected", on_metrics_collected)

    # Create the agent instance
    interview_agent = InterviewAgent(
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

    await session.start(
        room=ctx.room,
        agent=interview_agent,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
