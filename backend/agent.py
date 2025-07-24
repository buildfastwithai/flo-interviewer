import json
import os
import aiohttp
import asyncio
from datetime import datetime, date
from typing import Dict, List, Optional
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
    RoomInputOptions,
    function_tool,
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

# Import system prompt functions
from system_prompt import get_interview_system_prompt, get_fallback_system_prompt
# import random

load_dotenv(dotenv_path=".env.local")   
# session_id=random.randint(100000, 999999)

def format_question_for_speech(question: str) -> str:
    """Format question for natural speech, handling numbers and structure"""
    import re
    
    # Convert numbers to natural speech
    def replace_numbers(match):
        number = match.group()
        
        # Handle various currency symbols
        currency_symbols = {'₹': 'rupees', '$': 'dollars', '€': 'euros', '£': 'pounds'}
        for symbol, word in currency_symbols.items():
            if symbol in number:
                num_str = number.replace(symbol, '')
                try:
                    num_val = int(num_str.replace(',', ''))
                    return f"{number_to_words(num_val)} {word}"
                except:
                    return number
        
        # Handle regular numbers
        try:
            num_val = int(number.replace(',', ''))
            return number_to_words(num_val)
        except:
            return number
    
    # Replace currency and numbers
    question = re.sub(r'[₹$€£][\d,]+', replace_numbers, question)
    question = re.sub(r'\b\d+(?:,\d{3})*\b', replace_numbers, question)
    
    # Handle percentages
    question = re.sub(r'(\d+)%', lambda m: f"{number_to_words(int(m.group(1)))} percent", question)
    
    return question

def number_to_words(num: int) -> str:
    """Convert number to words for natural speech"""
    if num == 0:
        return "zero"
    
    # Basic conversion for all numbers
    ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
    teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
    tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
    
    if num < 0:
        return "negative " + number_to_words(-num)
    elif num < 10:
        return ones[num]
    elif num < 20:
        return teens[num - 10]
    elif num < 100:
        return tens[num // 10] + ("" if num % 10 == 0 else " " + ones[num % 10])
    elif num < 1000:
        return ones[num // 100] + " hundred" + ("" if num % 100 == 0 else " " + number_to_words(num % 100))
    elif num < 1000000:
        return number_to_words(num // 1000) + " thousand" + ("" if num % 1000 == 0 else " " + number_to_words(num % 1000))
    elif num < 1000000000:
        return number_to_words(num // 1000000) + " million" + ("" if num % 1000000 == 0 else " " + number_to_words(num % 1000000))
    else:
        return str(num)  # Fallback for very large numbers

def extract_main_scenario_and_tasks(question: str) -> tuple:
    """Extract main scenario and individual tasks from a multi-part question"""
    import re
    
    main_scenario = question
    tasks = []
    
    # Try to find numbered tasks (supports various formats)
    numbered_patterns = [
        r'\d+\.\s+([^?]+\??)',  # 1. Task content
        r'\d+\)\s+([^?]+\??)',  # 1) Task content
        r'[a-zA-Z]\.\s+([^?]+\??)',  # a. Task content
        r'[a-zA-Z]\)\s+([^?]+\??)'   # a) Task content
    ]
    
    for pattern in numbered_patterns:
        found_tasks = re.findall(pattern, question, re.MULTILINE | re.DOTALL)
        if found_tasks and len(found_tasks) > 1:  # Only consider if multiple tasks found
            # Extract everything before the first numbered task as scenario
            first_task_match = re.search(pattern.replace('([^?]+\??)', ''), question)
            if first_task_match:
                main_scenario = question[:first_task_match.start()].strip()
                tasks = [task.strip() for task in found_tasks]
            break
    
    # Also check for other common task separators
    if not tasks:
        # Look for bullet points or other separators
        bullet_patterns = [
            r'[•\-\*]\s+([^?]+\??)',  # Bullet points
            r'(?:Part|Question|Task)\s*\d+[:\.]?\s*([^?]+\??)'  # Part 1:, Question 1., etc.
        ]
        
        for pattern in bullet_patterns:
            found_tasks = re.findall(pattern, question, re.MULTILINE | re.DOTALL)
            if found_tasks and len(found_tasks) > 1:
                tasks = [task.strip() for task in found_tasks]
                # For bullet points, keep more of the original text as scenario
                main_scenario = re.split(r'[•\-\*]|\b(?:Part|Question|Task)\s*\d+', question)[0].strip()
                break
    
    # Clean up the main scenario - remove common prefixes
    cleanup_patterns = [
        r'Problem Statement:\s*',
        r'Task for Candidates?:\s*.*',
        r'Background:\s*',
        r'Context:\s*',
        r'Scenario:\s*'
    ]
    
    for pattern in cleanup_patterns:
        main_scenario = re.sub(pattern, '', main_scenario, flags=re.DOTALL)
    
    main_scenario = main_scenario.strip()
    
    return main_scenario, tasks

def are_tasks_dependent(tasks: List[str]) -> bool:
    """Check if tasks are dependent on each other (requires previous answers)"""
    if not tasks or len(tasks) <= 1:
        return False
    
    # Keywords that indicate dependency on previous answers
    dependency_keywords = [
        'based on', 'using the', 'from the above', 'given the result',
        'should the', 'justify your answer', 'considering', 'given your',
        'using your calculation', 'based on your', 'from your answer',
        'in light of', 'taking into account', 'building on', 'following from',
        'with reference to', 'according to your', 'as per your'
    ]
    
    # Check if any task (except the first) contains dependency keywords
    for i, task in enumerate(tasks[1:], 1):  # Start from second task
        task_lower = task.lower()
        for keyword in dependency_keywords:
            if keyword in task_lower:
                return True
    
    # Check for various types of calculations or analysis in first task
    calculation_keywords = [
        'calculate', 'result', 'answer', 'solve', 'determine', 'find',
        'compute', 'evaluate', 'analyze', 'assess', 'estimate'
    ]
    
    # Business/financial keywords
    business_keywords = ['revenue', 'price', 'cost', 'profit', 'sales', 'budget']
    
    # Technical/programming keywords  
    technical_keywords = ['algorithm', 'function', 'code', 'implement', 'design']
    
    # General analysis keywords
    analysis_keywords = ['compare', 'contrast', 'examine', 'investigate', 'study']
    
    all_analysis_keywords = calculation_keywords + business_keywords + technical_keywords + analysis_keywords
    
    first_task_lower = tasks[0].lower()
    has_analysis = any(keyword in first_task_lower for keyword in all_analysis_keywords)
    
    if has_analysis:
        # If first task involves analysis/calculation, check if later tasks reference decisions/recommendations
        decision_keywords = [
            'should', 'recommend', 'suggest', 'justify', 'explain why',
            'what would you', 'how would you', 'do you think', 'advise',
            'propose', 'conclude', 'decide', 'choose'
        ]
        
        for task in tasks[1:]:
            task_lower = task.lower()
            if any(keyword in task_lower for keyword in decision_keywords):
                return True
    
    return False


class InterviewStage(Enum):
    INTRODUCTION = "introduction"
    QUESTION = "question"
    FOLLOW_UP = "follow_up"
    MOVING_ON = "moving_on"
    FINAL_QUESTIONS = "final_questions"
    COMPLETED = "completed"

@dataclass
class InterviewState:
    """Shared state across workflow agents"""
    candidate_name: str
    role: str
    current_question_index: int = 0
    all_questions: List[str] = None
    last_answer_was_unknown: bool = False
    asked_follow_up: bool = False
    stage: InterviewStage = InterviewStage.INTRODUCTION
    interview_started: bool = False
    # For multi-part questions
    current_main_scenario: str = ""
    current_tasks: List[str] = None
    current_task_index: int = 0
    is_multi_part_question: bool = False
    tasks_are_dependent: bool = False
    skip_remaining_tasks: bool = False


class IntroductionAgent(Agent):
    """Agent for handling interview introduction and readiness check"""
    
    def __init__(self, state: InterviewState):
        super().__init__(
            instructions=f"""You are an interviewer for the {state.role} position. 
Your role is to welcome the candidate and check if they're ready to begin.

Say: "Welcome {state.candidate_name}, I am an interviewer for the {state.role} position. I will be conducting your interview today. Are you ready to begin the interview?"

If they say they're ready, use the start_interview tool.
If they're not ready, be supportive and wait for them to indicate readiness.""",
            stt=assemblyai.STT(
                end_of_turn_confidence_threshold=0.5,
                min_end_of_turn_silence_when_confident=160,
                max_turn_silence=3000,
            ),
            llm=openai.LLM(
                model="gpt-4.1-mini",
                temperature=0.7,
            ),
            tts=cartesia.TTS(
                model="sonic-2",
                voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
            ),
            vad=silero.VAD.load(),
        )
        self.state = state
    
    async def on_enter(self):
        """Start the introduction when agent enters"""
        intro_message = f"Welcome {self.state.candidate_name}, I am an interviewer for the {self.state.role} position. I will be conducting your interview today. Are you ready to begin the interview?"
        log_info(f"IntroductionAgent starting with message: {intro_message}")
        await self.session.say(intro_message, allow_interruptions=True)
    
    @function_tool()
    async def start_interview(self):
        """Start the main interview when candidate is ready"""
        self.state.interview_started = True
        self.state.stage = InterviewStage.QUESTION
        return QuestionAgent(self.state)

class QuestionAgent(Agent):
    """Agent for asking interview questions and managing flow"""
    
    def __init__(self, state: InterviewState):
        # Determine what to ask based on current state
        if state.is_multi_part_question and state.current_tasks and state.current_task_index < len(state.current_tasks):
            # We're in a multi-part question, ask the current task
            current_content = state.current_tasks[state.current_task_index]
            context = "multi-part question task"
        elif state.all_questions and state.current_question_index < len(state.all_questions):
            # Regular question or new multi-part question
            current_content = state.all_questions[state.current_question_index]
            context = "interview question"
        else:
            current_content = ""
            context = "no question"
        
        super().__init__(
            instructions=f"""You are conducting an interview for the {state.role} position. 
Your current task: {context}

After the candidate answers:
- If they say "I don't know", "I'm not sure", "I have no idea", or similar, use handle_unknown_answer tool
- If they provide a complete answer, use move_to_next_part tool
- If they provide a partial answer, you MAY ask ONE follow-up using ask_follow_up tool
- If you've already asked a follow-up, use move_to_next_part tool

CRITICAL: When moving on, do NOT use transition phrases - just acknowledge briefly.
IMPORTANT: Never create your own questions. Stick to the provided content.""",
            stt=assemblyai.STT(
                end_of_turn_confidence_threshold=0.5,
                min_end_of_turn_silence_when_confident=160,
                max_turn_silence=3000,
            ),
            llm=openai.LLM(
                model="gpt-4.1-mini",
                temperature=0.7,
            ),
            tts=cartesia.TTS(
                model="sonic-2",
                voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
            ),
            vad=silero.VAD.load(),
        )
        self.state = state
    
    async def on_enter(self):
        log_info(f"QuestionAgent entered. Questions available: {len(self.state.all_questions) if self.state.all_questions else 0}")
        
        if self.state.is_multi_part_question and self.state.current_tasks and self.state.current_task_index < len(self.state.current_tasks):
            # We're continuing with a multi-part question
            task = self.state.current_tasks[self.state.current_task_index]
            formatted_task = format_question_for_speech(task)
            log_info(f"Asking task {self.state.current_task_index + 1}: {task}")
            await self.session.say(formatted_task, allow_interruptions=True)
            
        elif (self.state.all_questions and 
              self.state.current_question_index < len(self.state.all_questions)):
            # New question - check if it's multi-part
            question = self.state.all_questions[self.state.current_question_index]
            main_scenario, tasks = extract_main_scenario_and_tasks(question)
            
            if tasks and len(tasks) > 1:
                # This is a multi-part question
                self.state.is_multi_part_question = True
                self.state.current_main_scenario = main_scenario
                self.state.current_tasks = tasks
                self.state.current_task_index = 0
                self.state.tasks_are_dependent = are_tasks_dependent(tasks)
                self.state.skip_remaining_tasks = False
                
                log_info(f"Multi-part question detected. Tasks are {'dependent' if self.state.tasks_are_dependent else 'independent'}")
                
                # Present the main scenario first
                formatted_scenario = format_question_for_speech(main_scenario)
                log_info(f"Presenting scenario for question {self.state.current_question_index + 1}: {main_scenario}")
                await self.session.say(f"{formatted_scenario}. Let me ask you the first part.", allow_interruptions=True)
                
                # Then ask the first task
                first_task = format_question_for_speech(tasks[0])
                await self.session.say(first_task, allow_interruptions=True)
            else:
                # Regular single question
                formatted_question = format_question_for_speech(question)
                log_info(f"Asking question {self.state.current_question_index + 1}: {question}")
                await self.session.say(formatted_question, allow_interruptions=True)
        else:
            # Fallback if no questions available
            log_warning("No questions available or index out of range")
            await self.session.say("I don't have any questions to ask at the moment.", allow_interruptions=True)
    
    @function_tool()
    async def handle_unknown_answer(self):
        """Handle when candidate says they don't know the answer"""
        self.state.last_answer_was_unknown = True
        
        if self.state.is_multi_part_question and self.state.tasks_are_dependent:
            # If tasks are dependent and they don't know the first part, skip remaining parts
            if self.state.current_task_index == 0:
                log_info("Candidate doesn't know first part of dependent question - skipping remaining tasks")
                self.state.skip_remaining_tasks = True
                await self.session.say("That's alright.", allow_interruptions=False)
                # Move to next complete question
                return self._move_to_next_complete_question()
            else:
                # Continue with remaining tasks even if they don't know a middle part
                return self.move_to_next_part()
        else:
            # For independent tasks or single questions, just move to next part
            return self.move_to_next_part()
    
    @function_tool()
    async def ask_follow_up(self, follow_up_question: str):
        """Ask a relevant follow-up question based on the candidate's answer"""
        if not self.state.asked_follow_up:
            self.state.asked_follow_up = True
            self.state.stage = InterviewStage.FOLLOW_UP
            return FollowUpAgent(self.state, follow_up_question)
        else:
            # Already asked follow-up, move to next part
            return self.move_to_next_part()
    
    def _move_to_next_complete_question(self):
        """Helper method to move to the next complete question, skipping remaining parts"""
        # Reset multi-part question state
        self.state.is_multi_part_question = False
        self.state.current_tasks = None
        self.state.current_task_index = 0
        self.state.current_main_scenario = ""
        self.state.tasks_are_dependent = False
        self.state.skip_remaining_tasks = False
        self.state.current_question_index += 1
        
        # Check if we've finished all questions
        if self.state.current_question_index >= len(self.state.all_questions):
            # All questions completed, move to final questions
            self.state.stage = InterviewStage.FINAL_QUESTIONS
            return FinalQuestionsAgent(self.state)
        else:
            # More questions to ask
            self.state.stage = InterviewStage.QUESTION
            return QuestionAgent(self.state)

    @function_tool()
    async def move_to_next_part(self):
        """Move to the next part of the question or next question"""
        self.state.asked_follow_up = False
        self.state.last_answer_was_unknown = False
        
        if self.state.is_multi_part_question and self.state.current_tasks and not self.state.skip_remaining_tasks:
            # Check if there are more tasks in the current question
            self.state.current_task_index += 1
            
            if self.state.current_task_index < len(self.state.current_tasks):
                # More tasks in this question
                log_info(f"Moving to task {self.state.current_task_index + 1} of current question")
                return QuestionAgent(self.state)
            else:
                # Done with all tasks, move to next question
                return self._move_to_next_complete_question()
        else:
            # Regular question or skipping remaining tasks, move to next complete question
            return self._move_to_next_complete_question()

class FollowUpAgent(Agent):
    """Agent for handling follow-up questions"""
    
    def __init__(self, state: InterviewState, follow_up_question: str):
        super().__init__(
            instructions=f"""You just asked a follow-up question: "{follow_up_question}"
Listen to the candidate's response and then:
- If they say "I don't know" or similar, use handle_unknown_answer tool
- Otherwise use move_to_next_part to continue the interview
Keep your acknowledgments brief like "I see" or "Thank you".""",
            stt=assemblyai.STT(
                end_of_turn_confidence_threshold=0.5,
                min_end_of_turn_silence_when_confident=160,
                max_turn_silence=3000,
            ),
            llm=openai.LLM(
                model="gpt-4.1-mini",
                temperature=0.7,
            ),
            tts=cartesia.TTS(
                model="sonic-2",
                voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
            ),
            vad=silero.VAD.load(),
        )
        self.state = state
        self.follow_up_question = follow_up_question
    
    async def on_enter(self):
        if self.follow_up_question:
            await self.session.say(self.follow_up_question, allow_interruptions=True)
        else:
            await self.session.say("I have a follow-up question for you.", allow_interruptions=True)
    
    @function_tool()
    async def handle_unknown_answer(self):
        """Handle when candidate says they don't know the follow-up answer"""
        self.state.last_answer_was_unknown = True
        
        if self.state.is_multi_part_question and self.state.tasks_are_dependent:
            # If tasks are dependent and they don't know, we might need to skip remaining
            log_info("Candidate doesn't know follow-up answer for dependent question")
            await self.session.say("That's alright.", allow_interruptions=False)
            # For now, just move to next part - could be enhanced to skip more intelligently
            return self.move_to_next_part()
        else:
            # For independent tasks or single questions, just move to next part
            return self.move_to_next_part()
    
    def _move_to_next_complete_question(self):
        """Helper method to move to the next complete question, skipping remaining parts"""
        # Reset multi-part question state
        self.state.is_multi_part_question = False
        self.state.current_tasks = None
        self.state.current_task_index = 0
        self.state.current_main_scenario = ""
        self.state.tasks_are_dependent = False
        self.state.skip_remaining_tasks = False
        self.state.current_question_index += 1
        
        # Check if we've finished all questions
        if self.state.current_question_index >= len(self.state.all_questions):
            # All questions completed, move to final questions
            self.state.stage = InterviewStage.FINAL_QUESTIONS
            return FinalQuestionsAgent(self.state)
        else:
            # More questions to ask
            self.state.stage = InterviewStage.QUESTION
            return QuestionAgent(self.state)

    @function_tool()
    async def move_to_next_part(self):
        """Move to the next part after follow-up"""
        self.state.asked_follow_up = False
        
        if self.state.is_multi_part_question and self.state.current_tasks and not self.state.skip_remaining_tasks:
            # Check if there are more tasks in the current question
            self.state.current_task_index += 1
            
            if self.state.current_task_index < len(self.state.current_tasks):
                # More tasks in this question
                log_info(f"Moving to task {self.state.current_task_index + 1} of current question")
                return QuestionAgent(self.state)
            else:
                # Done with all tasks, move to next question
                return self._move_to_next_complete_question()
        else:
            # Regular question or skipping remaining tasks, move to next complete question
            return self._move_to_next_complete_question()

class FinalQuestionsAgent(Agent):
    """Agent for handling final questions from the candidate"""
    
    def __init__(self, state: InterviewState):
        super().__init__(
            instructions=f"""The interview questions have been completed. 
Ask: "Do you have any questions for me about the {state.role} role or the company?"

Listen to their questions and answer them appropriately based on general knowledge about the role.
When they indicate they have no more questions or are finished, use end_interview tool.

IMPORTANT: Do NOT use transition phrases like "Let's move on" or "Let me ask" - this is the final part of the interview.""",
            stt=assemblyai.STT(
                end_of_turn_confidence_threshold=0.5,
                min_end_of_turn_silence_when_confident=160,
                max_turn_silence=3000,
            ),
            llm=openai.LLM(
                model="gpt-4.1-mini",
                temperature=0.7,
            ),
            tts=cartesia.TTS(
                model="sonic-2",
                voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
            ),
            vad=silero.VAD.load(),
        )
        self.state = state
    
    async def on_enter(self):
        await self.session.say("Do you have any questions for me about the role or company?", allow_interruptions=True)
    
    @function_tool()
    async def end_interview(self):
        """End the interview"""
        self.state.stage = InterviewStage.COMPLETED
        closing_message = f"Thank you for your time today, {self.state.candidate_name}. This concludes our interview. Have a great day!"
        await self.session.say(closing_message, allow_interruptions=False)
        return None  # End the session

class InterviewAgent(Agent):
    """Legacy agent kept for compatibility - now uses workflow system"""
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
        
        super().__init__(
            instructions="This is a workflow-based interview agent. Workflow will be managed externally.",
            stt=assemblyai.STT(
                end_of_turn_confidence_threshold=0.5,
                min_end_of_turn_silence_when_confident=160,
                max_turn_silence=3000,
            ),
            llm=openai.LLM(
                model="gpt-4.1-mini",
                temperature=0.7,
            ),
            tts=cartesia.TTS(
                model="sonic-2",
                voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
            ),
            vad=silero.VAD.load(),
        )
        
        # Store configuration for workflow setup
        self.role = role
        self.candidate_name = candidate_name
        self.skill_level = skill_level
        self.record_id = record_id
        self.room_name = room_name
        self.room_id = room_id
        self.interview_id = interview_id
        self.all_questions = all_questions or []
        self.questions_list = questions_list
        
        # Initialize metrics collector
        self.metrics_collector = MetricsCollector()
        
        # Interview data storage
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
        self._setup_metrics_collectors()

    def _setup_metrics_collectors(self):
        """Set up metrics collection listeners"""
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

    # Create the shared interview state
    interview_state = InterviewState(
        candidate_name=candidate_name,
        role=role,
        all_questions=all_questions
    )
    
    log_info(f"Created interview state - Candidate: {candidate_name}, Role: {role}, Questions: {len(all_questions) if all_questions else 0}")

    # Start with the introduction agent
    initial_agent = IntroductionAgent(interview_state)
    log_info("Starting with IntroductionAgent")

    await session.start(
        room=ctx.room,
        agent=initial_agent,
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