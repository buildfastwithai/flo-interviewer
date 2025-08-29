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
# Alternative: Basic turn detector (env-guarded; safer default)
# Note: We only enable this via TURN_DETECTION env to avoid altering
# existing behavior by default. If unavailable or init fails, we fall back to None.
try:
    from livekit.plugins.turn_detector import BasicTurnDetector  # type: ignore
except Exception:  # pragma: no cover
    BasicTurnDetector = None  # type: ignore
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
    function_tool,
    RunContext
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

# Enhanced audio helpers (tuned VAD/STT). Safe defaults if unavailable.
# These allow swapping STT/VAD via env without changing the interview format.
try:
    from audio import get_vad, get_enhanced_audio
except Exception:
    get_vad = None  # type: ignore
    get_enhanced_audio = None  # type: ignore

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
                 questions_list: str = "",
                 practice_mode: bool = False,
                 questions_count:int =0) -> None:
        
        # Capture interview start time for time-aware responses
        start_time_dt = datetime.now()
        start_time_iso = start_time_dt.isoformat()
        start_time_human = start_time_dt.strftime("%B %d, %Y at %I:%M %p")

        # Create specific instructions with all questions if provided
        if practice_mode:
            # Practice mode: override with easy, hard-coded questions
            practice_questions = [
                "What is the difference between hardware and software?",
                "What is the main purpose of an internet browser?",
                "What is the purpose of an input and an output in programming?",
            ]
            all_questions = practice_questions
            questions_list = ""
            for i, q in enumerate(practice_questions):
                questions_list += f"{i+1}. {q}\n\n"

            full_instructions = f"""
You are a warm, friendly interviewer running a short practice session before the real interview. Your goal is to help the candidate get comfortable with the interface and the flow.

INTERVIEW PERSONALITY & COMMUNICATION STYLE:
- Be warm, friendly, and encouraging throughout the practice
- Use natural, conversational phrases and a supportive tone

PRACTICE SESSION:
- This is a brief practice round with 2-3 very easy questions
- Ask the following questions in order, and keep the conversation light
- After practice, ask if they're ready to start the real interview

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. ONLY ask the practice questions shown above, in the exact order (1, 2, 3)
2. You MAY answer questions about the interview structure, what the candidate needs to do, expectations, and basic rules. Keep answers brief and friendly.
3. DO NOT reveal correct answers or provide hints for technical questions.
4. Guardrails: If asked about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about performance, DO NOT answer. Reply exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
5. After each answer, acknowledge it naturally before moving to the next question.
6. At the end of practice, say: "We can wrap up practice here. Are you ready to start the real interview?"
7. If the candidate says yes he/she is ready for real interview and ask them to clcik on end interview and click on start new interview button to get back to interview form
8. If the candidate says no he/she is not ready for real interview and ask them if he/she has any doubts or questions about the practice session or real interview
9. If the candidate says they don't know, respond supportively with something like "That's completely fine, these can be tricky"

IMPORTANT:
- Use the candidate's name sparingly (2-3 times)
- Remove any markdown formatting symbols when speaking
- Speak naturally with human-like variations and small pauses

The candidate's name is {candidate_name}.
The role is {role}.
"""
        elif all_questions and questions_list:
            # Create direct instructions with the FULL list of questions
            full_instructions = f"""
You are a warm, professional, and genuinely human interviewer conducting a technical interview. Your goal is to create a comfortable, conversational atmosphere while maintaining the structure of the interview.

INTERVIEW PERSONALITY & COMMUNICATION STYLE:
- Be warm, friendly, and encouraging throughout the interview
- Use natural conversational phrases like "That's great to hear," "I really like that approach," "Thanks for sharing that perspective"
- Add natural human pauses and thinking moments - "Let me think about that..." "Hmm, interesting point..." "You know what, that's a good way to look at it"
- Use the candidate's first name occasionally in a natural way
- Speak with varied pacing and tone - sometimes slower, sometimes more energetic
- Show genuine interest with follow-ups like "That's fascinating - can you tell me more about why you chose that approach?"
- Use natural transitions like "So that brings us to our next topic..." or "Let's shift gears a bit..."
- Occasionally make small thinking sounds like "hmm" or "mmm" when processing information

TIME AWARENESS:
- Today's date and interview start: {start_time_human} (local time)
- If the candidate asks how much time has passed since we started, calculate the elapsed time from the current local time to the start time and answer briefly (e.g., "It's been about 12 minutes"). Share the exact start time if they ask for it.

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. ONLY ask the exact questions shown above, in the exact order (1, 2, 3, 4...)
2. NEVER create your own questions or substitute different questions
3. Present each question conversationally as a human would, but preserve the core content
4. After each answer, acknowledge it naturally before moving to the next question
5. If the candidate says they don't know, respond supportively with something like "That's completely fine, these can be tricky"
6. DO NOT SKIP QUESTIONS under any circumstances
7. Convert numerical values to natural speech (e.g., "twenty thousand rupees" instead of "20,000")
8. Never answer questions yourself or give hints. Do not reveal correct answers or provide any hints in any situation.
9. Limit follow-up questions to 1-2 per question, maximum 6 total in the interview
10. Occasionally stumble slightly in your speech like a real person - "So, the next thing I wanted to ask about is... actually, let me rephrase that..."
11. Guardrails: If the candidate asks about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about their performance, DO NOT answer. Your response must be exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
12. Do not handle employer branding, provide company information, or discuss compensation/CTC under any circumstances. Politely redirect with the exact response above.

INTERVIEW STRUCTURE:
- Start warmly: "Hey {candidate_name}, welcome! I'm here to interview you for the {role} position. How are you doing today? and are you ready for the interview?"
- If they're not ready: "No rush at all, take the time you need. I'll be right here."
- If they're ready: "Great! Let's dive in then. I will ask a series of questions to get to know you better."
- After answers: Mix up your acknowledgments - "That's a solid approach", "I see what you mean there", "That's helpful context"
- For transitions: "Alright, let's explore another area..." or "That leads nicely into my next question..."
- End the interview: "Before we wrap up, {candidate_name.split(' ')[0]}, do you have any questions for me?" If they ask about the JD, company, role, CTC, next steps, or feedback, reply with: "I don't have that specific information, but the hiring team can provide all the details you need."
- Closing: "It's been a pleasure talking with you today. Thanks so much for your time. You can end the call whenever you're ready. Take care!"

HUMAN SPEECH PATTERNS TO INCORPORATE:
- Occasionally restart sentences: "What I'm trying to ask is... let me put it this way..."
- Use filler words naturally: "you know", "like", "actually", "basically", "sort of"
- Sometimes trail off: "That makes me think about..."
- Vary your sentence length and structure
- Add occasional personal touches: "I've found that approach helpful myself"
- Show natural reactions: "Oh, that's interesting!", "Wow, I hadn't considered that"
- Introduce slight pauses as if thinking: "So... [pause] what would you say about..."

IMPORTANT GUIDELINES:
1. Never mention question numbers when asking questions
2. Remove any markdown formatting symbols when speaking
3. Keep the conversation flowing naturally while following the question order
4. Be encouraging and supportive throughout the interview
5. Use the candidate's name sparingly (2-3 times) to avoid sounding robotic

ADAPTIVE INTERVIEW FLOW:
- Be time-aware. In approximately the first 5 minutes from the start time, if the candidate is clearly under-qualified (roughly below 30% proficiency across the first two core topics you cover) or clearly over-qualified, you may propose shortening the interview. Say: "Based on what we've covered so far, would you like to continue with the full interview, or would you prefer we wrap up early?"
- If the candidate chooses to end early or asks to shorten at any time, confirm politely and move to the closing.
- If continuing, keep the flow efficient and focused on the remaining core questions.

The candidate's name is {candidate_name}.
The role is {role}.

Remember: You're having a genuine conversation with a real person. Be authentic, warm, and professional - just like a human interviewer would be.
"""
        else:
            # Fallback instructions if no questions provided
            full_instructions = (
                f"You are an interviewer for {role}. "
                f"The interview started at {start_time_human} (local time). "
                f"If the candidate asks how much time has passed since the interview began, calculate it from the current time and answer succinctly (e.g., 'about 12 minutes'). "
                f"Guardrails: If asked about the JD, company, role details, compensation/CTC, hiring process/next steps, or feedback about their performance, do not answer and reply exactly: 'I don't have that specific information, but the hiring team can provide all the details you need.' Do not reveal correct answers or give hints. Wait for further instructions."
            )
        
        # Pass FULL instructions to parent class
        # Configure turn detection via env flag with safe fallback.
        # TURN_DETECTION=basic enables BasicTurnDetector; any failure or other
        # value results in turn detection being disabled (None).
        turn_detection_impl = None
        td_mode = os.getenv("TURN_DETECTION", "none").lower().strip()
        if td_mode == "basic" and BasicTurnDetector is not None:
            try:
                turn_detection_impl = BasicTurnDetector()
            except Exception:
                turn_detection_impl = None
        elif td_mode in ("none", "off", "disable"):
            turn_detection_impl = None

        # Important: We preserve the existing STT EOU tuning and LLM/TTS
        # configuration so the interview format does not change. Turn detection
        # is injected from the env-driven variable above.
        self.question_count = questions_count
        
                
                
            
        
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
        ),  
#          tts=hume.TTS(
#       voice=hume.VoiceByName(name="Colton Rivers", provider=hume.VoiceProvider.hume),
#       description="The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest.",
#    ),

        tts=cartesia.TTS(
      model="sonic-2",
    #   voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
    voice="da69d796-4603-4419-8a95-293bfc5679eb",
      speed=0.5,  # Slower speaking speed (0.5 = 50% speed, 1.0 = normal, 2.0 = double speed)
   ),
        vad=silero.VAD.load(),
            turn_detection=turn_detection_impl,
        
        )
        
        self.role = role
        self.candidate_name = candidate_name
        self.skill_level = skill_level
        self.practice_mode = practice_mode
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
            "start_time": start_time_iso,
            "role": role,
            "candidate_name": candidate_name,
            "record_id": record_id,
            "duration_minutes": 0,
            "room_id": room_id or "",
            "interview_id": interview_id or "",
            "metrics": self.metrics_collector.metrics_data
        }
        
        # Set up metrics collectors: forward component metrics into our
        # MetricsCollector so we can compute aggregates on exit.
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
            
       
    # @function_tool()
    # async def update_question_count(self, context: RunContext) -> None:
    #     """Increment the question counter after each interview question complete from the given question list . Does'nt matter if the candidate answered or not but if the question is completed and we move to the next then counter should be incremented"""
    #     self.question_count += 1
    #     # Send updated count to frontend API for live display
    #     try:
    #         if getattr(self, "interview_id", None):
    #             base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    #             url = f"{base_url}/api/interview/{self.interview_id}/question-count"
    #             async with aiohttp.ClientSession() as session:
    #                 await session.post(url, json={"count": self.question_count}, timeout=5)
    #     except Exception as e:
    #         log_warning(f"Failed to POST question count: {e}")
    #     # return None to silence; or return a message if you want the LLM to respond
    #     return None
    
    # @function_tool()
    # async def update_unanaswered_question_coun(self, context: RunContext) -> None:
    #     """Function should be called if the user said he dont know the answer of the question"""

        
    #     with open("question_count2.txt", "w") as f:
    #         f.write("user dont know the answer of the question")
    #     # return None to silence; or return a message if you want the LLM to respond
    #     return None

   

    async def on_enter(self):
        # Get the first question to start with
        first_question = self.all_questions[0] if self.all_questions else ""
        
        # Create warm, human introduction text
        if getattr(self, "practice_mode", False):
            intro_text = f"Hey {self.candidate_name}, welcome! This is a quick practice round to help you get comfortable. How are you doing today? and are you ready to try a couple of easy questions?"
        else:
            intro_text = f"Hey {self.candidate_name}, welcome! I'm here to interview you for the {self.role} position. How are you doing today? and are you ready to begin the interview?"
        log_info(f"Starting with warm introduction: {intro_text}")
        
        # Start with the warm introduction
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
    # Prewarm audio components before sessions start to reduce first-reply
    # latency. Uses tuned VAD/STT from audio.py when available; otherwise
    # falls back to library defaults.
    vad_instance = None
    stt_instance = None
    try:
        if get_vad is not None:
            vad_instance = get_vad()
        else:
            vad_instance = silero.VAD.load()
    except Exception:
        vad_instance = silero.VAD.load()

    try:
        if get_enhanced_audio is not None:
            stt_instance, _vad_unused = get_enhanced_audio()
    except Exception:
        stt_instance = None

    proc.userdata["vad"] = vad_instance
    if stt_instance is not None:
        proc.userdata["stt"] = stt_instance


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
    practice_mode = False
    
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            role = metadata.get('role', role)
            skill_level = metadata.get('skill', skill_level)
            record_id = metadata.get('recordId', record_id)
            candidate_name = metadata.get('candidateName', candidate_name)
            room_id = metadata.get('roomId', room_id)
            interview_id = metadata.get('interviewId', interview_id)
            pm = metadata.get('practiceMode')
            if isinstance(pm, bool):
                practice_mode = pm
            elif isinstance(pm, str):
                practice_mode = pm.lower() in ("1", "true", "yes", "y")
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
        

    # Build session with tuned VAD and optionally STT from prewarm.
    # SESSION_STT_FROM_AUDIO=true opts in to using the prewarmed STT; default
    # keeps current behavior unchanged.
    session_kwargs = {
        "vad": ctx.proc.userdata["vad"],
        # Adjusted for interview context - longer delays for thinking time
        "min_endpointing_delay": 1.0,
        "max_endpointing_delay": 8.0,
    }
    if os.getenv("SESSION_STT_FROM_AUDIO", "false").lower() in ("1", "true", "yes"):  # opt-in to avoid changing current format
        prewarmed_stt = ctx.proc.userdata.get("stt")
        if prewarmed_stt is not None:
            session_kwargs["stt"] = prewarmed_stt

    session = AgentSession(**session_kwargs)
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
        questions_list=questions_list,
        practice_mode=practice_mode
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