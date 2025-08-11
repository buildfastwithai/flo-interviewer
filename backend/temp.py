import json
import os
import aiohttp
import asyncio
from datetime import datetime, date
from typing import Dict, List, Optional
from enum import Enum

"""
TURN DETECTION FIX:
===================
The MultilingualModel turn detector was causing errors where predict_end_of_turn returned None.
This has been fixed by:
1. Disabling turn detection (turn_detection=None) to prevent the error
2. Adjusting STT parameters for more conservative end-of-utterance detection
3. Providing alternative turn detector options in comments

If you need turn detection:
- Uncomment BasicTurnDetector import and use it instead of MultilingualModel
- BasicTurnDetector is more stable but less accurate than MultilingualModel
- The VAD (Voice Activity Detection) still works for audio processing
"""

from dotenv import load_dotenv
# from livekit.plugins.turn_detector.multilingual import MultilingualModel
# Alternative: Basic turn detector (uncomment if you want turn detection)
# from livekit.plugins.turn_detector import BasicTurnDetector
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
    deepgram,
    hume
    
)

# Import our metrics collector
from metrics import MetricsCollector

# Import our logger
from logger import logger, log_info, log_error, log_warning, log_interview_data, setup_logger

# Import our interview configuration
try:
    from interview_config import (
        fetch_interview_template,
        DynamicInterviewTemplate,
        cleanup_resources
    )
except ImportError:
    # Fallback if config file doesn't exist
    DynamicInterviewTemplate = None
    cleanup_resources = None
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
        
        # Always provide a compact, style-focused instruction. Questions are orchestrated by workflow, not embedded.
        full_instructions = f"""
You are a warm, professional, and genuinely human interviewer conducting a technical interview. Your goal is to create a comfortable, conversational atmosphere while maintaining the structure of the interview.

INTERVIEW PERSONALITY & COMMUNICATION STYLE:
- Be warm, friendly, and encouraging throughout the interview
- Use natural conversational phrases like "That's great to hear," "I really like that approach," "Thanks for sharing that perspective"
- Add natural human pauses and thinking moments - "Let me think about that..." "Hmm, interesting point..."
- Use the candidate's first name occasionally in a natural way
- Speak with varied pacing and tone
- Show genuine interest with brief follow-ups where appropriate
- Use natural transitions like "So that brings us to our next topic..." or "Let's shift gears a bit..."

WORKFLOW & RULES (Controller-led):
1. You will be given questions one by one by a controller. Do not invent questions.
2. Ask exactly the provided question conversationally, preserving its core content.
3. After each answer, acknowledge it naturally before moving forward.
4. Limit follow-ups to 1-2 per question and no more than 6 follow-ups total across the interview.
5. Do not skip questions. Do not answer questions yourself or give hints.
6. Convert numerical values to natural speech.
7. Never mention question numbers.

INTERVIEW STRUCTURE:
- Start warmly: "Hey {candidate_name}, welcome! I'm here to interview you for the {role} position. How are you doing today? and are you ready for the interview?"
- If they're not ready: "No rush at all, take the time you need. I'll be right here."
- If they're ready: "Great! Let's dive in then. I will ask a series of questions to get to know you better."
- After answers: vary acknowledgments ("That's a solid approach", "I see what you mean there", "That's helpful context")
- For transitions: "Alright, let's explore another area..." or "That leads nicely into my next question..."
- End the interview: "Before we wrap up, {candidate_name.split(' ')[0]}, do you have any questions for me about the role or company?"
- Closing: "It's been a pleasure talking with you today. Thanks so much for your time. You can end the call whenever you're ready. Take care!"

IMPORTANT:
- Keep conversation flowing naturally while following controller-provided order.
- Be encouraging and supportive throughout; use the candidate's name sparingly (2-3 times).

Candidate name: {candidate_name}.
Role: {role}.
"""
        
        # Pass FULL instructions to parent class
        super().__init__(
            instructions=full_instructions,  # Using full instructions from the start
            stt=assemblyai.STT(
            # More conservative settings to prevent EOU issues
            end_of_turn_confidence_threshold=0.7,  # Higher confidence
            min_end_of_turn_silence_when_confident=300,  # Longer silence
            max_turn_silence=5000,  # Allow longer pauses
        ),
        llm=openai.LLM(
            model="gpt-4.1",
            temperature=0.7,
        ),tts=hume.TTS(
      voice=hume.VoiceByName(name="Colton Rivers", provider=hume.VoiceProvider.hume),
      description="The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest.",
   ),

#         tts=cartesia.TTS(
#       model="sonic-2",
#       voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
#       speed=0.5,  # Slower speaking speed (0.5 = 50% speed, 1.0 = normal, 2.0 = double speed)
#    ),
        vad=silero.VAD.load(),
            turn_detection=None,  # Disable turn detection to prevent errors
            # Alternative: turn_detection=BasicTurnDetector(), # More stable than MultilingualModel
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
        
        # --- Interview workflow state ---
        self.phase = "introduction"  # introduction -> questions -> wrap_up
        self.current_question_index = 0
        self.awaiting_main_answer = False
        self.awaiting_followup_answer = False
        self.per_question_followups_asked = 0
        self.total_followups_asked = 0
        self.max_followups_per_question = 2
        self.max_total_followups = 6
        self.last_main_question: Optional[str] = None
        self.last_user_answer: Optional[str] = None
        self.started_questions: bool = False
        
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
        # Attach speech events to drive the workflow
        @self.session.on("user_speech_committed")
        async def _on_user_speech(msg):
            try:
                user_text = getattr(msg, "content", "") or ""
                self.last_user_answer = user_text
                log_info(f"User speech committed. Phase={self.phase}, Text='{user_text[:120]}'")

                if self.phase == "introduction":
                    # After initial response, proceed to questions (guard double-start)
                    if not self.started_questions:
                        self.phase = "questions"
                        self.started_questions = True
                        await self._ask_next_main_question()
                    return

                if self.phase == "questions":
                    # If we were waiting on a follow-up answer, move on
                    if self.awaiting_followup_answer:
                        self.awaiting_followup_answer = False
                        await self._maybe_ask_followup_or_advance()
                        return

                    # If we were waiting on a main answer, consider a follow-up
                    if self.awaiting_main_answer:
                        self.awaiting_main_answer = False
                        await self._maybe_ask_followup_or_advance()
                        return

                # If we reach here in wrap up, do nothing
            except Exception as e:
                log_error("Error in user_speech_committed handler", e)

        # Create warm, human introduction text
        intro_text = f"Hey {self.candidate_name}, welcome! I'm here to interview you for the {self.role} position. How are you doing today? and are you ready to begin the interview?"
        log_info(f"Starting with warm introduction: {intro_text}")
        await self.session.say(intro_text, allow_interruptions=True)

        # Auto-start questions shortly after intro so interviewer leads if user stays silent
        async def _auto_start():
            try:
                await asyncio.sleep(2.0)
                if self.phase == "introduction" and not self.started_questions:
                    if not self.all_questions:
                        log_warning("No questions loaded from DB; cannot start question flow")
                        return
                    self.phase = "questions"
                    self.started_questions = True
                    await self._ask_next_main_question()
            except Exception as e:
                log_error("Error in auto-start after intro", e)

        asyncio.create_task(_auto_start())

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

    async def _ask_next_main_question(self):
        """Ask the next main question from the list or wrap up if finished."""
        try:
            if self.current_question_index >= len(self.all_questions):
                await self._wrap_up_interview()
                return

            question_text = self.all_questions[self.current_question_index]
            self.last_main_question = question_text
            self.per_question_followups_asked = 0

            # Transition phrase (varied but simple)
            transition = "Alright, let's move to the next question." if self.current_question_index > 0 else "Great, let's dive in."
            await self.session.say(f"{transition}")
            await self.session.say(question_text, allow_interruptions=True)

            self.current_question_index += 1
            self.awaiting_main_answer = True
            self.awaiting_followup_answer = False
            self.log_interview_data(
                stage="question_asked",
                data={"question": question_text, "index": self.current_question_index}
            )
        except Exception as e:
            log_error("Error asking next main question", e)

    async def _maybe_ask_followup_or_advance(self):
        """Decide whether to ask a follow-up or move to the next main question."""
        try:
            # If we've hit limits, advance
            if (self.per_question_followups_asked >= self.max_followups_per_question) or (
                self.total_followups_asked >= self.max_total_followups
            ):
                await self._ask_next_main_question()
                return

            # Ask a concise follow-up using the LLM to keep it natural
            followup_instruction = (
                "Ask exactly one concise follow-up (one sentence) based on the candidate's last answer, "
                "focused on the same topic as the last question. Keep it friendly and professional."
            )

            # Use session to generate and speak the follow-up
            await self.session.generate_reply(
                instructions=(
                    f"Last main question: '{self.last_main_question or ''}'.\n"
                    f"Candidate answer: '{self.last_user_answer or ''}'.\n"
                    f"{followup_instruction}"
                )
            )

            self.per_question_followups_asked += 1
            self.total_followups_asked += 1
            self.awaiting_followup_answer = True
            self.log_interview_data(
                stage="followup_asked",
                data={
                    "for_question": self.last_main_question,
                    "per_question_followups": self.per_question_followups_asked,
                    "total_followups": self.total_followups_asked,
                },
            )
        except Exception as e:
            log_error("Error asking follow-up; advancing to next question", e)
            await self._ask_next_main_question()

    async def _wrap_up_interview(self):
        """Politely wrap up the interview with a closing."""
        try:
            if self.phase == "wrap_up":
                return
            self.phase = "wrap_up"

            first_name = (self.candidate_name or "").split(" ")[0] or self.candidate_name
            await self.session.say(
                f"Before we wrap up, {first_name}, do you have any questions for me about the role or company?",
                allow_interruptions=True,
            )
            # Leave a short pause and then close gracefully
            await asyncio.sleep(2.0)
            await self.session.say(
                "It's been a pleasure talking with you today. Thanks so much for your time. "
                "You can end the call whenever you're ready. Take care!",
                allow_interruptions=True,
            )
            self.log_interview_data(stage="wrap_up", data={})
        except Exception as e:
            log_error("Error during wrap up", e)


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

    try:
        await session.start(
            room=ctx.room,
            agent=interview_agent,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
    finally:
        # Cleanup database connections and resources
        if cleanup_resources:
            try:
                await cleanup_resources()
            except Exception as e:
                log_error(f"Error during cleanup: {str(e)}")

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
