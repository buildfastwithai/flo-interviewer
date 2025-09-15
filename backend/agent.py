import json
import os
import aiohttp
import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, AsyncIterable
import re
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
# Try to import a multimodal turn detector if available. We will default to this
# when present and fall back safely otherwise.
try:
    from livekit.plugins.turn_detector.multimodal import MultimodalTurnDetector  # type: ignore
except Exception:  # pragma: no cover
    MultimodalTurnDetector = None  # type: ignore

# Alternative: Basic turn detector (env-guarded; safer fallback)
# Note: We control enabling via TURN_DETECTION env and runtime availability.
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
    RunContext,
    ModelSettings
)
from livekit import rtc
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
                 questions_count:int =0,
                 template_skills_info: Optional[List[Dict]] = None,
                 total_duration_minutes: Optional[int] = None,
                 resume_text: Optional[str] = None) -> None:
        
        # Capture interview start time for time-aware responses
        start_time_dt = datetime.now()
        start_time_iso = start_time_dt.isoformat()
        start_time_human = start_time_dt.strftime("%B %d, %Y at %I:%M %p")

        # Build timing plan summary if template information is available
        self.template_skills_info = template_skills_info or []
        self.total_duration_minutes = int(total_duration_minutes) if total_duration_minutes else 30
        timing_plan_summary = ""
        if self.template_skills_info:
            skills_total = len(self.template_skills_info)
            try:
                per_skill_time = max(1, round(self.total_duration_minutes / max(1, skills_total)))
            except Exception:
                per_skill_time = 5
            lines = [
                f"- Overall duration: ~{self.total_duration_minutes} minutes",
                f"- Skills: {skills_total} (approx {per_skill_time} min/skill)",
                "- Follow-ups: at most 1-2 per question, 6 total",
            ]
            for skill in self.template_skills_info:
                nq = max(1, int(skill.get("num_questions", 1)))
                per_q_time = max(1, round(per_skill_time / nq))
                lines.append(f"  • {skill.get('name', 'Skill')}: {nq} questions (~{per_q_time} min/question)")
            timing_plan_summary = "\n".join(lines)

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
3. Do not reveal correct answers. Provide only one short, non-leading hint when the candidate says they don't know or explicitly asks for a hint.
4. Guardrails: If asked about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about performance, DO NOT answer. Reply something like but must not be exact same to this sentence: "I don't have that specific information, but the hiring team can provide all the details you need."
5. After each answer, acknowledge briefly (one short sentence) without repeating or summarizing the candidate's answer.
6. At the end of practice, say: "We can wrap up practice here. Are you ready to start the real interview?"
7. If the candidate says yes he/she is ready for real interview and ask them to clcik on end interview and click on start new interview button to get back to interview form
8. If the candidate says no he/she is not ready for real interview and ask them if he/she has any doubts or questions about the practice session or real interview
9. If the candidate says they don't know, respond supportively and offer one short, non-leading hint to help them get started, then invite them to try.
10. If the candidate asks for a hint, provide only one short, non-leading hint and clarify you won't disclose the answer; mention there may be a penalty for relying on hints.

IMPORTANT:
- Use the candidate's name sparingly (2-3 times)
- Remove any markdown formatting symbols when speaking
- Speak naturally with human-like variations and small pauses

SILENCE HANDLING:
- If the candidate is silent for about 8–10 seconds after you ask something, give a short, gentle nudge like: "Take your time — whenever you're ready, you can start." or "Would you like me to repeat the question?"
- If silence continues for another ~10–15 seconds, repeat the question once, then wait again without adding hints.

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
- Speak with varied pacing and tone - lean slightly slower overall; add a brief pause before moving on
- Show genuine interest with follow-ups like "That's fascinating - can you tell me more about why you chose that approach?"
- Prefer polite prompts to start questions: "Could you please explain...", "Could you walk me through...". Avoid saying "next question" or "now next question".
- Occasionally make small thinking sounds like "hmm" or "mmm" when processing information

TIME AWARENESS:
- Today's date and interview start: {start_time_human} (local time)
- If the candidate asks how much time has passed since we started, calculate the elapsed time from the current local time to the start time and answer briefly (e.g., "It's been about 12 minutes"). Share the exact start time if they ask for it.

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. Ask the questions shown above in the given order (1, 2, 3, 4...), one at a time. If the candidate explicitly requests switching to a closely related skill (e.g., GCP instead of AWS), you may adapt the current and subsequent questions to that requested skill while preserving the core intent and difficulty.
2. Do not invent new topics. You may rephrase a question only to map it to the requested, closely related skill while keeping the same competency focus.
3. Present each question conversationally as a human would, but preserve the core content
4. After each answer, acknowledge briefly (one short sentence) without repeating or summarizing the candidate's answer
5. If the candidate says they don't know or explicitly asks for a hint, respond supportively (e.g., "That's completely fine, these can be tricky"). Offer one short, non-leading hint (7–12 words), then invite them to try. If they prefer to skip, proceed to the next question.
6. DO NOT SKIP QUESTIONS under any circumstances
7. Convert numerical values to natural speech (e.g., "twenty thousand rupees" instead of "20,000")
8. Do not reveal correct answers. Do not give hints except when the candidate explicitly says they don't know or explicitly asks for a hint; provide only one short, non-leading hint and do not disclose the answer.
9. Limit follow-up questions to 1-2 per question, maximum 6 total in the interview. Keep each follow-up to one sentence and do not repeat or summarize the candidate's answer; refer to at most a single key phrase.
10. Occasionally stumble slightly in your speech like a real person - "So, the next thing I wanted to ask about is... actually, let me rephrase that..."
11. Guardrails: If the candidate asks about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about their performance, DO NOT answer. Your response must be exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
12. Do not handle employer branding, provide company information, or discuss compensation/CTC under any circumstances. Politely redirect with the exact response above.

HINTING POLICY:
- Offer at most one short, non-leading hint when the candidate says they don't know or explicitly asks for a hint
- Keep hints concise (7–12 words) and avoid giving away the answer
- Example hints:
  - Virtual DOM: "Compare previous and current UI trees to reduce DOM updates."
  - Class vs functional: "Classes used lifecycle/state; functions use Hooks for state/effects."

RELATED SKILL FLEXIBILITY:
- If the candidate asks to switch to a closely related skill, briefly acknowledge and confirm: e.g., "Sure, we can cover GCP instead of AWS."
- Keep the same sequence and difficulty: treat the rephrased question as equivalent in order and scope.
- Prefer direct substitution within the same family. Examples of related families:
  - Cloud Platforms: AWS ↔ GCP ↔ Azure
  - Frontend Frameworks: React ↔ Angular ↔ Vue
  - Databases (SQL): PostgreSQL ↔ MySQL
  - Containers/Orchestration: Docker ↔ Kubernetes
  - IaC: Terraform ↔ CloudFormation
- If the requested skill is unrelated to the topic or outside these families, politely decline and continue with the original plan.
- Limit switching to at most once unless the candidate insists; always maintain interview flow and timing.

TIMING PLAN:
{timing_plan_summary if timing_plan_summary else '- Keep an efficient pace across topics.'}

INTERVIEW STRUCTURE:
- Start warmly: "Hey {candidate_name}, welcome! I'm here to interview you for the {role} position. How are you doing today? and are you ready for the interview?"
- If they're not ready: "No rush at all, take the time you need. I'll be right here."
- If they're ready: "Great! Let's dive in then. I will ask a series of questions to get to know you better."
- After answers: Mix up your acknowledgments (keep them brief; do not repeat their content) - "That's a solid approach", "I see what you mean there", "That's helpful context"
- For transitions: Use soft prompts like "Could you please explain..." or "Could you walk me through..." instead of saying "next question".
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
6. Acknowledgments must be concise and must not repeat or summarize the candidate's answer.
7. Ask follow up questions to the candidate's answer if they are not clear or if they want to know more about the answer

SILENCE HANDLING:
- If the candidate is silent for ~8–10 seconds after you ask something, provide a brief, natural prompt such as: "No rush — when you're ready, you can go ahead." or "Would you like me to repeat the question?"
- If silence persists for another ~10–15 seconds, repeat the question once and then wait.

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
                f"Guardrails: If asked about the JD, company, role details, compensation/CTC, hiring process/next steps, or feedback about their performance, do not answer and reply exactly: 'I don't have that specific information, but the hiring team can provide all the details you need.' Wait for further instructions. "
                f"If the candidate is silent for ~8–10 seconds after you ask something, gently prompt them to continue or offer to repeat the question; if silence continues, briefly repeat the question once and wait again."
            )
        
        # If resume text is provided (and not practice mode), augment instructions to include resume-driven questions
        if (resume_text or "") and not practice_mode:
            try:
                clipped_resume = (resume_text or "")[:8000]
            except Exception:
                clipped_resume = resume_text or ""
            resume_block = f"""

RESUME CONTEXT:
Below is the candidate's resume text. Use it to ask 3–4 targeted questions about their experience, projects, responsibilities, and claimed skills. Interleave these with the planned questions from the record while maintaining flow and timing. Avoid trivia; focus on depth and authenticity.

RESUME (TEXT):
{clipped_resume}

RESUME QUESTION POLICY:
- Ask 3–4 resume-based questions across the interview.
- Keep them relevant to the resume and the role.
- Use polite prompts ("Could you please explain...", "Could you walk me through...").
- Do not disclose answers or provide hints unless the candidate explicitly asks or says they don't know (then one short, non‑leading hint max).
"""
            full_instructions = full_instructions + resume_block

        # Pass FULL instructions to parent class
        # Configure turn detection via env flag with safe fallback.
        # Default is multimodal (if available), then basic, else none.
        turn_detection_impl = None
        td_mode = os.getenv("TURN_DETECTION", "multimodal").lower().strip()

        if td_mode in ("multimodal", "multi"):
            if MultimodalTurnDetector is not None:
                try:
                    turn_detection_impl = MultimodalTurnDetector()
                except Exception:
                    turn_detection_impl = None
            # If multimodal is requested but unavailable, try basic as a fallback
            if turn_detection_impl is None and BasicTurnDetector is not None:
                try:
                    turn_detection_impl = BasicTurnDetector()
                except Exception:
                    turn_detection_impl = None
        elif td_mode == "basic":
            if BasicTurnDetector is not None:
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
             end_of_turn_confidence_threshold=0.7,
      min_end_of_turn_silence_when_confident=160,
      max_turn_silence=2400,
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
      speed=0.5,  # Slightly slower speaking speed for more relaxed pacing
   ),
        vad=silero.VAD.load(),
            turn_detection=turn_detection_impl,
        
        )
        
        self.role = role
        self.candidate_name = candidate_name
        self.skill_level = skill_level
        self.practice_mode = practice_mode
        self.resume_text = resume_text
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
        
        # Precompute a machine-readable timing plan with planned timestamps
        self.timing_plan = None
        try:
            if self.template_skills_info:
                plan = {
                    "skills_total": len(self.template_skills_info),
                    "questions_total": len(all_questions or []),
                    "follow_up_policy": {"per_question_max": 2, "total_max": 6},
                    "total_duration_minutes": self.total_duration_minutes,
                    "start_time": start_time_iso,
                    "skills": [],
                }
                remaining_minutes = self.total_duration_minutes
                skills_count = max(1, len(self.template_skills_info))
                # Allocate roughly equal minutes to each skill, last skill gets remainder
                base_per_skill = max(1, self.total_duration_minutes // skills_count)
                allocated = 0
                for idx, skill in enumerate(self.template_skills_info):
                    if idx < skills_count - 1:
                        skill_minutes = base_per_skill
                    else:
                        skill_minutes = max(1, self.total_duration_minutes - allocated)
                    allocated += skill_minutes
                    num_questions = max(1, int(skill.get("num_questions", 1)))
                    base_per_q = max(1, skill_minutes // num_questions)
                    # Build questions with planned timestamps
                    skill_block = {
                        "name": skill.get("name", f"Skill {idx+1}"),
                        "planned_minutes": skill_minutes,
                        "questions": [],
                    }
                    # Compute absolute planned timestamps
                    cumulative_min = sum(s.get("planned_minutes", 0) for s in plan["skills"]) if plan["skills"] else 0
                    current_dt = datetime.fromisoformat(start_time_iso)
                    current_dt = current_dt.replace(microsecond=0)
                    # Advance to start of this skill
                    current_dt = current_dt + timedelta(minutes=cumulative_min)
                    for q_idx in range(num_questions):
                        q_minutes = base_per_q if q_idx < num_questions - 1 else max(1, skill_minutes - base_per_q * (num_questions - 1))
                        q_start = current_dt
                        q_end = q_start + timedelta(minutes=q_minutes)
                        skill_block["questions"].append({
                            "index": q_idx + 1,
                            "planned_minutes": q_minutes,
                            "planned_start": q_start.isoformat(),
                            "planned_end": q_end.isoformat(),
                        })
                        current_dt = q_end
                    plan["skills"].append(skill_block)
                self.timing_plan = plan
        except Exception as e:
            log_warning(f"Failed to build timing plan: {e}")
        
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
            
       
    async def tts_node(self, text: AsyncIterable[str], model_settings: ModelSettings) -> AsyncIterable[rtc.AudioFrame]:
        """Customize TTS pronunciation for common technical terms before synthesizing.

        This wraps the default implementation to adjust pronunciations (e.g., "Next.js" → "Next J S").
        """
        # Base pronunciation replacements for simple words/abbreviations
        simple_pronunciations: Dict[str, str] = {
            # Acronyms & abbreviations
            "API": "A P I",
            "REST": "rest",
            "SQL": "sequel",
            "GraphQL": "Graph Q L",
            "NoSQL": "No S Q L",
            "JSON": "Jay sawn",
            "YAML": "Yam ell",
            "HTML": "H T M L",
            "CSS": "C S S",
            "JSX": "J S X",
            "TSX": "T S X",
            "URL": "U R L",
            "URI": "U R I",
            "HTTP": "H T T P",
            "HTTPS": "H T T P S",
            "IDE": "I D E",
            "GUI": "gooey",
            "JS": "Jayess",
            "npm": "N P M",
            "npx": "N P X",
            "AWS": "A W S",
            "GCP": "G C P",
            "S3": "S three",
            "EC2": "E C two",
            "RDS": "R D S",
            "IAM": "I A M",
            "DynamoDB": "Dynamo D B",
            "SNS": "S N S",
            "SQS": "S Q S",
            "GPU": "G P U",
            "SSD": "S S D",
            "UI": "U I",
            "UX": "U X",

            # Common product/tech names
            "NGINX": "engine x",
            "nginx": "engine x",
            "GNU": "guh new",
            "kubectl": "kube control",
            "Linux": "Lin ucks",
            "Regex": "Rej ex",
            "regex": "Rej ex",
            "Cache": "Cash",
            "cache": "Cash",
            "Epoch": "Eh pock",
            "epoch": "Eh pock",
            "LaTeX": "Lay tek",
            "Python": "Pie thon",
            "Django": "Jango",
            "GIF": "Jif",
            "PyPI": "Pie P I",

            # Company / product names
            "Asus": "Ay soos",
            "Huawei": "Hwah way",
            "Xiaomi": "Shau mee",
            "Oracle": "Or uh kull",
        }

        # Frameworks and terms with punctuation or special casing
        complex_patterns: Dict[str, str] = {
            r"\bnext\.js\b": "Next Jayess",
            r"\bnextjs\b": "Next Jayess",
            r"\bnext\s*js\b": "Next Jayess",
            r"\bnode\.js\b": "Node Jayess",
            r"\bnodejs\b": "Node Jayess",
            r"\bnode\s*js\b": "Node Jayess",
            r"\bexpress\.js\b": "Express Jayess",
            r"\bexpress\s*js\b": "Express Jayess",
            r"\breact\.js\b": "React Jayess",
            r"\breact\s*js\b": "React Jayess",
            r"\bvue\.js\b": "View Jayess",
            r"\bvue\s*js\b": "View Jayess",
            r"\bnuxt\.js\b": "Nuxt Jayess",
            r"\bnuxt\s*js\b": "Nuxt Jayess",
            r"\bsveltekit\b": "Svelte Kit",
            r"\btypescript\b": "Type Script",
            r"\bjavascript\b": "Java Script",
            r"\bpostgresql\b": "Postgres Q L",
            r"\bpostgres\b": "Post gres",
            r"\bkubernetes\b": "Koo ber net ees",
            r"\blivekit\b": "Live Kit",
            r"\bc\#\b": "C sharp",
            r"\bwi[\s-]?fi\b": "Why Fy",
        }

        async def adjust_pronunciation(input_text: AsyncIterable[str]) -> AsyncIterable[str]:
            async for chunk in input_text:
                modified_chunk = chunk

                # Apply complex regex-based substitutions first
                for pattern, replacement in complex_patterns.items():
                    modified_chunk = re.sub(pattern, replacement, modified_chunk, flags=re.IGNORECASE)

                # Apply simple word-boundary substitutions
                for term, pronunciation in simple_pronunciations.items():
                    modified_chunk = re.sub(rf"\b{re.escape(term)}\b", pronunciation, modified_chunk, flags=re.IGNORECASE)

                yield modified_chunk

        async for frame in Agent.default.tts_node(self, adjust_pronunciation(text), model_settings):
            yield frame

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
        await self.session.say(intro_text, allow_interruptions=False)

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
        
        # Print structured JSON summary of timing plan and counts
        try:
            summary = {
                "role": self.role,
                "candidate_name": self.candidate_name,
                "interview_id": self.interview_id,
                "room_id": self.room_id,
                "start_time": self.interview_data.get("start_time"),
                "end_time": self.interview_data.get("end_time"),
                "duration_minutes": round(self.interview_data.get("duration_minutes", 0), 2),
                "skills_total": len(self.template_skills_info) if getattr(self, "template_skills_info", None) else None,
                "questions_total_planned": len(self.all_questions or []),
                "follow_up_policy": {"per_question_max": 2, "total_max": 6},
                "timing_plan": self.timing_plan,
                "metrics_summary": self.interview_data.get("metrics", {}).get("averages", {}),
            }
            pretty = json.dumps(summary, indent=2)
            print(pretty)
            log_info(f"Interview timing summary JSON: {pretty}")
        except Exception as e:
            log_warning(f"Failed to print interview timing summary: {e}")
        
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
    skills_info = []
    total_duration_minutes = 30
    
    try:
        # Fetch the template
        dynamic_template = await fetch_interview_template(record_id, room_name)
        if dynamic_template:
            role_title = dynamic_template.jobTitle
            try:
                total_duration_minutes = int(dynamic_template.duration_minutes)
            except Exception:
                total_duration_minutes = 30
            
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
            
            # Build skills info (name and question count)
            try:
                for skill in dynamic_template.skills:
                    skills_info.append({
                        "id": getattr(skill, "id", ""),
                        "name": getattr(skill, "name", "Unknown Skill"),
                        "num_questions": len(skill.questions or []),
                    })
            except Exception:
                pass

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
        
    return all_questions, questions_list, role_title, skills_info, total_duration_minutes


async def entrypoint(ctx: JobContext):
    log_info(f"connecting to room {ctx.room.name}")
    # Subscribe to both audio and video to support multimodal turn detection by default
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

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
    resume_text = None
    
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
            try:
                rt = metadata.get('resumeText')
                if isinstance(rt, str) and rt:
                    resume_text = rt
            except Exception:
                resume_text = None
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
        all_questions, questions_list, fetched_role, skills_info, total_duration_minutes = await extract_questions_from_template(record_id, ctx.room.name)
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
        # Slightly higher min_endpointing_delay to avoid false barge-in from short noises
        "min_endpointing_delay": 1.5,
        "max_endpointing_delay": 6.0,
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
        practice_mode=practice_mode,
        template_skills_info=(skills_info if record_id else None),
        total_duration_minutes=(total_duration_minutes if record_id else None),
        resume_text=resume_text,
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