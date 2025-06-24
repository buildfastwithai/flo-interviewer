from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Literal, List, Dict, Union
import os
import re
import tempfile
import shutil
import math
from dotenv import load_dotenv
import openai
import google.generativeai as genai
import requests
import json
import yt_dlp
import ffmpeg
from enum import Enum
import PyPDF2
import io

# Load environment variables
load_dotenv(".env.local")

app = FastAPI(
    title="AI Interview Analysis API",
    description="Comprehensive AI-powered interview analysis with skill assessment and insights",
    version="2.0.0"
)

# CORS middleware for web applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums for structured responses
class SkillLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"
    NOT_DEMONSTRATED = "Not Demonstrated"

class GradeLevel(str, Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    AVERAGE = "Average"
    BELOW_AVERAGE = "Below Average"
    POOR = "Poor"

# Enhanced Pydantic models
class SkillAssessment(BaseModel):
    skill: str
    level: SkillLevel
    confidence_score: float = Field(..., ge=0, le=100, description="Confidence score from 0-100")
    evidence: str = Field(..., description="Evidence from transcript supporting this assessment")
    recommendations: str = Field(..., description="Recommendations for improvement")

class QuestionAnswer(BaseModel):
    question: str
    answer: str
    grade: GradeLevel
    score: float = Field(..., ge=0, le=100, description="Numerical score from 0-100")
    feedback: str = Field(..., description="Detailed feedback on the answer")
    key_points_covered: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)

class InterviewInsights(BaseModel):
    overall_performance_score: float = Field(..., ge=0, le=100)
    communication_clarity: float = Field(..., ge=0, le=100)
    technical_depth: float = Field(..., ge=0, le=100)
    problem_solving_ability: float = Field(..., ge=0, le=100)
    confidence_level: float = Field(..., ge=0, le=100)
    
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    key_achievements_mentioned: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    
    interview_duration_analysis: str
    speech_patterns: str
    engagement_level: str
    cultural_fit_indicators: List[str] = Field(default_factory=list)
    
    hiring_recommendation: str
    next_steps: List[str] = Field(default_factory=list)

class TranscriptRequest(BaseModel):
    video_url: str
    ai_provider: Literal["openai", "gemini"] = "openai"
    format_prompt: Optional[str] = "Please format this transcript into a clear, well-structured summary with key points and main topics."

class InterviewAnalysisRequest(BaseModel):
    skills_to_assess: List[str] = Field(..., description="Comma-separated skills to assess")
    job_role: Optional[str] = "Software Developer"
    company_name: Optional[str] = "Company"
    ai_provider: Literal["openai", "gemini"] = "openai"

class ComprehensiveAnalysisResponse(BaseModel):
    video_id: Optional[str] = None
    filename: Optional[str] = None
    raw_transcript: str
    formatted_transcript: str
    ai_provider: str
    file_chunks: Optional[int] = None
    
    # Enhanced analysis
    skill_assessments: List[SkillAssessment]
    questions_and_answers: List[QuestionAnswer]
    interview_insights: InterviewInsights
    analysis_summary: str

class TranscriptResponse(BaseModel):
    video_id: Optional[str] = None
    filename: Optional[str] = None
    raw_transcript: str
    formatted_response: str
    ai_provider: str
    file_chunks: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    message: str

# New models for PDF comparison
class ComparisonRequest(BaseModel):
    original_analysis_url: HttpUrl
    ai_analysis_url: HttpUrl

class ComparisonSummary(BaseModel):
    overall_comparison: str
    agreement_score: float = Field(..., ge=0, le=100, description="Agreement score from 0-100")
    key_similarities: List[str]
    key_differences: List[str]

class DetailedComparison(BaseModel):
    category: str
    original: str
    ai_generated: str
    comparison: str

class ComparisonRecommendations(BaseModel):
    overall: str
    original_strengths: List[str]
    ai_strengths: List[str]
    improvement_suggestions: List[str]

class ComparisonResponse(BaseModel):
    summary: ComparisonSummary
    detailed_comparison: List[DetailedComparison]
    recommendations: ComparisonRecommendations

# Utility functions
def extract_video_id_from_url(url: str) -> Optional[str]:
    """Extract video ID from URL for reference (optional)"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def download_audio_from_url(video_url: str) -> str:
    """Download audio from video URL using yt-dlp"""
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        
        # Configure yt-dlp options with error handling
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(temp_dir, 'audio.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(video_url, download=True)
            except Exception as download_error:
                raise Exception(f"Download failed: {str(download_error)}")
            
        # Find the downloaded file
        audio_files = []
        for file in os.listdir(temp_dir):
            if file.endswith(('.mp3', '.m4a', '.webm', '.ogg')):
                audio_files.append(os.path.join(temp_dir, file))
                
        if not audio_files:
            raise Exception("No audio file found after download. The video might not be available or accessible.")
            
        return audio_files[0]  # Return the first audio file found
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not download audio from {video_url}. Error: {str(e)}")

def split_audio_file(audio_file_path: str, max_size_mb: int = 25) -> List[str]:
    """Split audio file into chunks if it's larger than max_size_mb"""
    file_size = os.path.getsize(audio_file_path)
    max_size_bytes = max_size_mb * 1024 * 1024
    
    if file_size <= max_size_bytes:
        return [audio_file_path]  # No need to split
    
    # Calculate number of chunks needed
    num_chunks = math.ceil(file_size / max_size_bytes)
    
    # Get audio duration using ffmpeg
    try:
        probe = ffmpeg.probe(audio_file_path)
        duration = float(probe['streams'][0]['duration'])
    except:
        # Fallback: estimate based on file size
        duration = file_size / (128 * 1024 / 8)  # Assume 128kbps
    
    chunk_duration = duration / num_chunks
    
    # Split the audio file
    chunk_files = []
    temp_dir = os.path.dirname(audio_file_path)
    base_name = os.path.splitext(os.path.basename(audio_file_path))[0]
    
    for i in range(num_chunks):
        start_time = i * chunk_duration
        chunk_file = os.path.join(temp_dir, f"{base_name}_chunk_{i+1}.mp3")
        
        try:
            (
                ffmpeg
                .input(audio_file_path, ss=start_time, t=chunk_duration)
                .output(chunk_file, acodec='mp3', audio_bitrate='128k')
                .overwrite_output()
                .run(quiet=True)
            )
            chunk_files.append(chunk_file)
        except Exception as e:
            # Clean up on error
            for cf in chunk_files:
                if os.path.exists(cf):
                    os.remove(cf)
            raise Exception(f"Failed to split audio file: {str(e)}")
    
    return chunk_files

def transcribe_with_whisper(audio_file_path: str) -> tuple[str, int]:
    """Transcribe audio file using OpenAI Whisper API, handling large files"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    try:
        # Split file if needed
        chunk_files = split_audio_file(audio_file_path)
        transcriptions = []
        
        for i, chunk_file in enumerate(chunk_files):
            print(f"Transcribing chunk {i+1}/{len(chunk_files)}...")
            
            with open(chunk_file, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
                transcriptions.append(response)
        
        # Combine all transcriptions
        full_transcript = " ".join(transcriptions)
        
        return full_transcript, len(chunk_files)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper transcription error: {str(e)}")
    finally:
        # Clean up all files
        try:
            if audio_file_path and os.path.exists(audio_file_path):
                os.remove(audio_file_path)
            
            # Clean up chunk files if they exist
            temp_dir = os.path.dirname(audio_file_path) if audio_file_path else None
            if temp_dir and os.path.exists(temp_dir):
                for file in os.listdir(temp_dir):
                    if file.endswith('_chunk_') and file.endswith('.mp3'):
                        chunk_path = os.path.join(temp_dir, file)
                        if os.path.exists(chunk_path):
                            os.remove(chunk_path)
                
                # Clean up temp directory if empty
                try:
                    os.rmdir(temp_dir)
                except:
                    pass
        except Exception as cleanup_error:
            print(f"Warning: Cleanup failed: {cleanup_error}")

def format_with_openai(transcript: str, prompt: str) -> str:
    """Format transcript using OpenAI API"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    # Check if transcript is already in a dialog format
    is_dialog_format = any(line.strip().startswith(("Interviewer:", "Candidate:")) for line in transcript.split("\n"))
    
    try:
        # If already in dialog format, use a modified prompt
        if is_dialog_format:
            system_message = "You are a helpful assistant that formats interview transcripts while preserving the dialog structure."
            modified_prompt = f"Format this interview transcript maintaining the Interviewer/Candidate structure. Keep all content, just improve the formatting for readability:\n\n{transcript}"
        else:
            system_message = "You are a helpful assistant that formats and summarizes video transcripts."
            modified_prompt = f"{prompt}\n\nTranscript:\n{transcript}"
        
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": modified_prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

def format_with_gemini(transcript: str, prompt: str) -> str:
    """Format transcript using Google Gemini API"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    
    genai.configure(api_key=api_key)
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        full_prompt = f"{prompt}\n\nTranscript:\n{transcript}"
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

def validate_transcript_quality(transcript: str) -> tuple[bool, str]:
    """Validate if transcript is suitable for analysis"""
    if not transcript or len(transcript.strip()) < 50:
        return False, "Transcript too short for meaningful analysis"
    
    # Check for common transcription errors
    error_indicators = ["[inaudible]", "[unclear]", "???", "..." * 3]
    error_count = sum(transcript.lower().count(indicator) for indicator in error_indicators)
    
    if error_count > len(transcript.split()) * 0.1:  # More than 10% errors
        return False, "Transcript quality too poor for reliable analysis"
    
    # Check if it looks like an interview (has questions or dialogue markers)
    question_indicators = ["?", "tell me", "describe", "explain", "what is", "how do", "why", "Interviewer:", "interviewer:", "Candidate:", "candidate:"]
    has_questions = any(indicator in transcript.lower() for indicator in question_indicators)
    
    # Look for conversation patterns - alternating speakers
    lines = transcript.split("\n")
    speaker_pattern = any(
        (i > 0 and 
         ((line.startswith("Interviewer:") and lines[i-1].startswith("Candidate:")) or
          (line.startswith("Candidate:") and lines[i-1].startswith("Interviewer:"))))
        for i, line in enumerate(lines)
    )
    
    # Accept either question indicators or speaker patterns
    if not (has_questions or speaker_pattern):
        return False, "Content does not appear to be an interview format"
    
    return True, "Transcript quality acceptable"

def assess_skills_with_openai(transcript: str, skills: List[str], job_role: str = "Software Developer") -> List[SkillAssessment]:
    """Assess skills from transcript using OpenAI structured response"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    # Validate inputs
    if not skills:
        raise HTTPException(status_code=400, detail="No skills provided for assessment")
    
    if len(skills) > 20:
        raise HTTPException(status_code=400, detail="Too many skills requested. Maximum 20 skills allowed.")
    
    skills_text = ", ".join(skills)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",  # Using GPT-4 for better analysis
            messages=[
                {
                    "role": "system", 
                    "content": f"""You are an expert technical interviewer analyzing a {job_role} interview transcript. 
                    Assess each skill based on evidence in the transcript. Be thorough but fair in your assessment.
                    If a skill is not mentioned or demonstrated, mark it as 'Not Demonstrated'.
                    Provide specific evidence and actionable recommendations."""
                },
                {
                    "role": "user", 
                    "content": f"""Please assess the following skills based on this interview transcript: {skills_text}

For each skill, provide:
1. Skill level (Beginner/Intermediate/Advanced/Expert/Not Demonstrated)
2. Confidence score (0-100)
3. Specific evidence from the transcript
4. Recommendations for improvement

Transcript:
{transcript}"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "skill_assessment",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "assessments": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "skill": {"type": "string"},
                                        "level": {
                                            "type": "string",
                                            "enum": ["Beginner", "Intermediate", "Advanced", "Expert", "Not Demonstrated"]
                                        },
                                        "confidence_score": {"type": "number", "minimum": 0, "maximum": 100},
                                        "evidence": {"type": "string"},
                                        "recommendations": {"type": "string"}
                                    },
                                    "required": ["skill", "level", "confidence_score", "evidence", "recommendations"]
                                }
                            }
                        },
                        "required": ["assessments"]
                    }
                }
            },
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Validate and convert to SkillAssessment objects
        skill_assessments = []
        for assessment in result["assessments"]:
            try:
                skill_assessments.append(SkillAssessment(**assessment))
            except Exception as e:
                print(f"Error parsing skill assessment: {e}")
                continue
        
        return skill_assessments
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill assessment error: {str(e)}")

def extract_qa_with_openai(transcript: str, job_role: str = "Software Developer") -> List[QuestionAnswer]:
    """Extract and grade Q&A pairs from transcript using OpenAI"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": f"""You are an expert technical interviewer analyzing a {job_role} interview transcript.
                    Extract all question-answer pairs and grade each answer objectively.
                    Focus on technical accuracy, communication clarity, and completeness of answers."""
                },
                {
                    "role": "user", 
                    "content": f"""Please extract all interview questions and answers from this transcript and grade each answer.

For each Q&A pair, provide:
1. The exact question asked
2. The candidate's complete answer
3. Grade (Excellent/Good/Average/Below Average/Poor)
4. Numerical score (0-100)
5. Detailed feedback
6. Key points the candidate covered well
7. Areas for improvement

Transcript:
{transcript}"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "qa_extraction",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "qa_pairs": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "question": {"type": "string"},
                                        "answer": {"type": "string"},
                                        "grade": {
                                            "type": "string",
                                            "enum": ["Excellent", "Good", "Average", "Below Average", "Poor"]
                                        },
                                        "score": {"type": "number", "minimum": 0, "maximum": 100},
                                        "feedback": {"type": "string"},
                                        "key_points_covered": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "areas_for_improvement": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        }
                                    },
                                    "required": ["question", "answer", "grade", "score", "feedback", "key_points_covered", "areas_for_improvement"]
                                }
                            }
                        },
                        "required": ["qa_pairs"]
                    }
                }
            },
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Validate and convert to QuestionAnswer objects
        qa_pairs = []
        for qa in result["qa_pairs"]:
            try:
                qa_pairs.append(QuestionAnswer(**qa))
            except Exception as e:
                print(f"Error parsing Q&A pair: {e}")
                continue
        
        return qa_pairs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Q&A extraction error: {str(e)}")

def generate_interview_insights_with_openai(transcript: str, job_role: str = "Software Developer") -> InterviewInsights:
    """Generate comprehensive interview insights using OpenAI"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": f"""You are a senior HR professional and technical interview expert analyzing a {job_role} interview.
                    Provide comprehensive insights covering all aspects of the candidate's performance.
                    Be objective, constructive, and provide actionable feedback."""
                },
                {
                    "role": "user", 
                    "content": f"""Please provide a comprehensive analysis of this interview transcript including:

1. Overall performance metrics (0-100 scores)
2. Strengths and weaknesses
3. Communication and technical analysis
4. Cultural fit indicators
5. Red flags or concerns
6. Hiring recommendation
7. Next steps

Transcript:
{transcript}"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "interview_insights",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "overall_performance_score": {"type": "number", "minimum": 0, "maximum": 100},
                            "communication_clarity": {"type": "number", "minimum": 0, "maximum": 100},
                            "technical_depth": {"type": "number", "minimum": 0, "maximum": 100},
                            "problem_solving_ability": {"type": "number", "minimum": 0, "maximum": 100},
                            "confidence_level": {"type": "number", "minimum": 0, "maximum": 100},
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "weaknesses": {"type": "array", "items": {"type": "string"}},
                            "key_achievements_mentioned": {"type": "array", "items": {"type": "string"}},
                            "red_flags": {"type": "array", "items": {"type": "string"}},
                            "interview_duration_analysis": {"type": "string"},
                            "speech_patterns": {"type": "string"},
                            "engagement_level": {"type": "string"},
                            "cultural_fit_indicators": {"type": "array", "items": {"type": "string"}},
                            "hiring_recommendation": {"type": "string"},
                            "next_steps": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": [
                            "overall_performance_score", "communication_clarity", "technical_depth",
                            "problem_solving_ability", "confidence_level", "strengths", "weaknesses",
                            "key_achievements_mentioned", "red_flags", "interview_duration_analysis",
                            "speech_patterns", "engagement_level", "cultural_fit_indicators",
                            "hiring_recommendation", "next_steps"
                        ]
                    }
                }
            },
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        return InterviewInsights(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview insights generation error: {str(e)}")

def generate_analysis_summary_with_openai(
    skill_assessments: List[SkillAssessment], 
    qa_pairs: List[QuestionAnswer], 
    insights: InterviewInsights,
    job_role: str = "Software Developer"
) -> str:
    """Generate a comprehensive analysis summary"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    # Prepare summary data
    avg_skill_score = sum(sa.confidence_score for sa in skill_assessments) / len(skill_assessments) if skill_assessments else 0
    avg_qa_score = sum(qa.score for qa in qa_pairs) / len(qa_pairs) if qa_pairs else 0
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are an expert HR analyst creating an executive summary for a {job_role} interview analysis."
                },
                {
                    "role": "user", 
                    "content": f"""Create a comprehensive executive summary based on this interview analysis:

Average Skill Assessment Score: {avg_skill_score:.1f}/100
Average Q&A Performance Score: {avg_qa_score:.1f}/100
Overall Performance Score: {insights.overall_performance_score}/100

Key Strengths: {', '.join(insights.strengths[:3])}
Key Weaknesses: {', '.join(insights.weaknesses[:3])}
Hiring Recommendation: {insights.hiring_recommendation}

Please provide a 2-3 paragraph executive summary suitable for hiring managers."""
                }
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        return f"Summary generation failed: {str(e)}"

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from a PDF file using PyPDF2"""
    try:
        # Create a PDF reader object
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        
        # Extract text from all pages
        text = []
        for page in pdf_reader.pages:
            text.append(page.extract_text())
        
        # Join all text together
        full_text = "\n".join(text)
        
        # Basic cleanup
        # Remove excessive newlines
        full_text = re.sub(r'\n{3,}', '\n\n', full_text)
        # Remove excessive whitespace
        full_text = re.sub(r'\s{2,}', ' ', full_text)
        
        return full_text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

# Additional utility functions for PDF comparison
def download_pdf_from_url(url: str) -> bytes:
    """Download PDF file from URL"""
    try:
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Failed to download PDF. Status code: {response.status_code}")
        
        return response.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download PDF: {str(e)}")

def compare_analyses_with_openai(original_text: str, ai_text: str) -> ComparisonResponse:
    """Compare two interview analysis texts using OpenAI"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    client = openai.OpenAI(api_key=api_key)
    
    try:
        # Generate summary comparison
        summary_response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": """You are an expert at comparing interview analyses. 
                    Compare the original human analysis with the AI-generated analysis of the same interview transcript.
                    Provide a fair, objective comparison highlighting similarities, differences, strengths and weaknesses of each approach."""
                },
                {
                    "role": "user", 
                    "content": f"""I have two analyses of the same interview transcript:
                    
                    ORIGINAL HUMAN ANALYSIS:
                    {original_text}
                    
                    AI-GENERATED ANALYSIS:
                    {ai_text}
                    
                    Please provide a summary comparison with:
                    1. Overall comparison
                    2. Agreement score (0-100%)
                    3. Key similarities (list)
                    4. Key differences (list)"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "summary_comparison",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "overall_comparison": {"type": "string"},
                            "agreement_score": {"type": "number", "minimum": 0, "maximum": 100},
                            "key_similarities": {"type": "array", "items": {"type": "string"}},
                            "key_differences": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["overall_comparison", "agreement_score", "key_similarities", "key_differences"]
                    }
                }
            },
            temperature=0.5
        )
        
        summary = json.loads(summary_response.choices[0].message.content)
        
        # Generate detailed category comparisons
        detailed_response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": """You are an expert at comparing interview analyses in detail.
                    Compare the original human analysis with the AI-generated analysis across multiple categories.
                    For each category, extract the relevant sections from each analysis and provide a detailed comparison."""
                },
                {
                    "role": "user", 
                    "content": f"""Compare these two analyses of the same interview transcript:
                    
                    ORIGINAL HUMAN ANALYSIS:
                    {original_text}
                    
                    AI-GENERATED ANALYSIS:
                    {ai_text}
                    
                    Please compare across these categories:
                    1. Technical Skills Assessment
                    2. Communication Skills
                    3. Problem-solving Abilities
                    4. Overall Performance
                    5. Recommendations
                    
                    For each category, provide:
                    - The relevant section from the original analysis
                    - The relevant section from the AI analysis
                    - A detailed comparison between them"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "detailed_comparison",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "detailed_comparison": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "category": {"type": "string"},
                                        "original": {"type": "string"},
                                        "ai_generated": {"type": "string"},
                                        "comparison": {"type": "string"}
                                    },
                                    "required": ["category", "original", "ai_generated", "comparison"]
                                }
                            }
                        },
                        "required": ["detailed_comparison"]
                    }
                }
            },
            temperature=0.5
        )
        
        detailed = json.loads(detailed_response.choices[0].message.content)
        
        # Generate recommendations
        recommendations_response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system", 
                    "content": """You are an expert at evaluating interview analyses.
                    After comparing the original human analysis with the AI-generated analysis, provide recommendations and insights.
                    Be fair, objective, and constructive."""
                },
                {
                    "role": "user", 
                    "content": f"""Based on these two analyses of the same interview transcript:
                    
                    ORIGINAL HUMAN ANALYSIS:
                    {original_text}
                    
                    AI-GENERATED ANALYSIS:
                    {ai_text}
                    
                    Please provide:
                    1. Overall recommendation and insights
                    2. Strengths of the original human analysis
                    3. Strengths of the AI-generated analysis
                    4. Suggestions for improving both approaches"""
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "comparison_recommendations",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "overall": {"type": "string"},
                            "original_strengths": {"type": "array", "items": {"type": "string"}},
                            "ai_strengths": {"type": "array", "items": {"type": "string"}},
                            "improvement_suggestions": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["overall", "original_strengths", "ai_strengths", "improvement_suggestions"]
                    }
                }
            },
            temperature=0.5
        )
        
        recommendations = json.loads(recommendations_response.choices[0].message.content)
        
        return ComparisonResponse(
            summary=ComparisonSummary(**summary),
            detailed_comparison=detailed["detailed_comparison"],
            recommendations=ComparisonRecommendations(**recommendations)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison analysis error: {str(e)}")

# API Endpoints
@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="AI Video Transcript API is running"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check"""
    return HealthResponse(
        status="healthy",
        message="All systems operational"
    )

@app.post("/extract-transcript", response_model=TranscriptResponse)
async def extract_and_format_transcript(request: TranscriptRequest):
    """
    Extract transcript from video URL using Whisper and format it using AI
    
    - **video_url**: Video URL (YouTube, etc.)
    - **ai_provider**: Choose between 'openai' or 'gemini'
    - **format_prompt**: Custom prompt for AI formatting (optional)
    """
    try:
        # Extract video ID for reference (optional)
        video_id = extract_video_id_from_url(request.video_url)
        
        # Use Whisper API for transcription
        print("Using Whisper API for transcription...")
        audio_file_path = download_audio_from_url(request.video_url)
        raw_transcript, num_chunks = transcribe_with_whisper(audio_file_path)
        
        # Format with AI
        if request.ai_provider == "openai":
            formatted_response = format_with_openai(raw_transcript, request.format_prompt)
        elif request.ai_provider == "gemini":
            formatted_response = format_with_gemini(raw_transcript, request.format_prompt)
        else:
            raise HTTPException(status_code=400, detail="Invalid AI provider. Choose 'openai' or 'gemini'")
        
        return TranscriptResponse(
            video_id=video_id,
            raw_transcript=raw_transcript,
            formatted_response=formatted_response,
            ai_provider=request.ai_provider,
            file_chunks=num_chunks
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/upload-audio", response_model=TranscriptResponse)
async def upload_and_transcribe_audio(
    file: UploadFile = File(...),
    ai_provider: Literal["openai", "gemini"] = "openai",
    format_prompt: str = "Please format this transcript into a clear, well-structured summary with key points and main topics."
):
    """
    Upload audio file and transcribe using Whisper, then format with AI
    
    - **file**: Audio file (mp3, wav, m4a, etc.) - Max size: 100MB
    - **ai_provider**: Choose between 'openai' or 'gemini'
    - **format_prompt**: Custom prompt for AI formatting
    """
    try:
        # Validate file type
        allowed_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.webm'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")
        
        # Check file size (100MB limit)
        max_file_size = 100 * 1024 * 1024  # 100MB in bytes
        file_size = 0
        file_content = b""
        
        # Read file in chunks to get size and content
        chunk_size = 1024 * 1024  # 1MB chunks
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)
            if file_size > max_file_size:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Maximum size allowed is 100MB, but file is {file_size / (1024*1024):.1f}MB"
                )
            file_content += chunk
        
        # Reset file position for processing
        await file.seek(0)
        
        # Save uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Transcribe with Whisper
        raw_transcript, num_chunks = transcribe_with_whisper(temp_file_path)
        
        # Format with AI
        if ai_provider == "openai":
            formatted_response = format_with_openai(raw_transcript, format_prompt)
        elif ai_provider == "gemini":
            formatted_response = format_with_gemini(raw_transcript, format_prompt)
        else:
            raise HTTPException(status_code=400, detail="Invalid AI provider. Choose 'openai' or 'gemini'")
        
        return TranscriptResponse(
            filename=file.filename,
            raw_transcript=raw_transcript,
            formatted_response=formatted_response,
            ai_provider=ai_provider,
            file_chunks=num_chunks
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")

@app.post("/analyze-interview", response_model=ComprehensiveAnalysisResponse)
async def analyze_interview_comprehensive(
    file: UploadFile = File(...),
    skills_to_assess: str = Form(..., description="Comma-separated list of skills to assess"),
    job_role: str = Form(default="Software Developer", description="Job role for context"),
    company_name: str = Form(default="Company", description="Company name for context"),
    ai_provider: Literal["openai", "gemini"] = Form(default="openai")
):
    """
    Comprehensive interview analysis with skill assessment, Q&A extraction, and insights
    
    - **file**: Audio/Video file containing the interview
    - **skills_to_assess**: Comma-separated skills to evaluate (e.g., "Python, React, Problem Solving, Communication")
    - **job_role**: Job role for context in analysis
    - **company_name**: Company name for context
    - **ai_provider**: AI provider for analysis (currently only OpenAI supports structured responses)
    """
    try:
        # Validate file type
        allowed_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.webm', '.mkv'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Parse and validate skills
        skills_list = [skill.strip() for skill in skills_to_assess.split(',') if skill.strip()]
        if not skills_list:
            raise HTTPException(status_code=400, detail="At least one skill must be provided")
        
        if len(skills_list) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 skills allowed per analysis")
        
        # Validate AI provider for structured responses
        if ai_provider != "openai":
            raise HTTPException(
                status_code=400, 
                detail="Currently only OpenAI supports comprehensive structured analysis"
            )
        
        # Check file size (100MB limit)
        max_file_size = 100 * 1024 * 1024  # 100MB in bytes
        file_size = 0
        file_content = b""
        
        # Read file in chunks to get size and content
        chunk_size = 1024 * 1024  # 1MB chunks
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)
            if file_size > max_file_size:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Maximum size allowed is 100MB, but file is {file_size / (1024*1024):.1f}MB"
                )
            file_content += chunk
        
        # Reset file position for processing
        await file.seek(0)
        
        # Save uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Step 1: Transcribe with Whisper
        print("Transcribing audio with Whisper...")
        raw_transcript, num_chunks = transcribe_with_whisper(temp_file_path)
        
        # Step 2: Validate transcript quality
        is_valid, validation_message = validate_transcript_quality(raw_transcript)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Transcript validation failed: {validation_message}")
        
        # Step 3: Format transcript
        print("Formatting transcript...")
        formatted_transcript = format_with_openai(
            raw_transcript, 
            f"Please format this {job_role} interview transcript for {company_name} into a clear, well-structured format with proper paragraphs and speaker identification where possible, Dont include any other text in the response, just the formatted transcript. Dont use markdown formatting."
        )
        
        # Step 4: Parallel analysis (can be done concurrently)
        print("Performing comprehensive analysis...")
        
        # Run analyses in parallel for efficiency
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all analysis tasks
            skill_future = executor.submit(assess_skills_with_openai, raw_transcript, skills_list, job_role)
            qa_future = executor.submit(extract_qa_with_openai, raw_transcript, job_role)
            insights_future = executor.submit(generate_interview_insights_with_openai, raw_transcript, job_role)
            
            # Wait for all to complete
            skill_assessments = skill_future.result()
            questions_and_answers = qa_future.result()
            interview_insights = insights_future.result()
        
        # Step 5: Generate executive summary
        print("Generating analysis summary...")
        analysis_summary = generate_analysis_summary_with_openai(
            skill_assessments, questions_and_answers, interview_insights, job_role
        )
        
        # Step 6: Return comprehensive response
        return ComprehensiveAnalysisResponse(
            filename=file.filename,
            raw_transcript=raw_transcript,
            formatted_transcript=formatted_transcript,
            ai_provider=ai_provider,
            file_chunks=num_chunks,
            skill_assessments=skill_assessments,
            questions_and_answers=questions_and_answers,
            interview_insights=interview_insights,
            analysis_summary=analysis_summary
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"Error during comprehensive analysis: {str(e)}")

@app.post("/analyze-interview-url", response_model=ComprehensiveAnalysisResponse)
async def analyze_interview_from_url(
    video_url: str = Form(..., description="Video URL (YouTube, etc.)"),
    skills_to_assess: str = Form(..., description="Comma-separated list of skills to assess"),
    job_role: str = Form(default="Software Developer", description="Job role for context"),
    company_name: str = Form(default="Company", description="Company name for context"),
    ai_provider: Literal["openai", "gemini"] = Form(default="openai")
):
    """
    Comprehensive interview analysis from video URL with skill assessment and insights
    
    - **video_url**: Video URL (YouTube, Vimeo, etc.)
    - **skills_to_assess**: Comma-separated skills to evaluate
    - **job_role**: Job role for context in analysis
    - **company_name**: Company name for context
    - **ai_provider**: AI provider for analysis
    """
    try:
        # Parse and validate skills
        skills_list = [skill.strip() for skill in skills_to_assess.split(',') if skill.strip()]
        if not skills_list:
            raise HTTPException(status_code=400, detail="At least one skill must be provided")
        
        if len(skills_list) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 skills allowed per analysis")
        
        # Validate AI provider
        if ai_provider != "openai":
            raise HTTPException(
                status_code=400, 
                detail="Currently only OpenAI supports comprehensive structured analysis"
            )
        
        # Extract video ID for reference
        video_id = extract_video_id_from_url(video_url)
        
        # Step 1: Download and transcribe
        print("Downloading and transcribing video...")
        audio_file_path = download_audio_from_url(video_url)
        raw_transcript, num_chunks = transcribe_with_whisper(audio_file_path)
        
        # Step 2: Validate transcript quality
        is_valid, validation_message = validate_transcript_quality(raw_transcript)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Transcript validation failed: {validation_message}")
        
        # Step 3: Format transcript
        print("Formatting transcript...")
        formatted_transcript = format_with_openai(
            raw_transcript, 
            f"Please format this {job_role} interview transcript for {company_name} into a clear, well-structured format."
        )
        
        # Step 4: Comprehensive analysis
        print("Performing comprehensive analysis...")
        
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            skill_future = executor.submit(assess_skills_with_openai, raw_transcript, skills_list, job_role)
            qa_future = executor.submit(extract_qa_with_openai, raw_transcript, job_role)
            insights_future = executor.submit(generate_interview_insights_with_openai, raw_transcript, job_role)
            
            skill_assessments = skill_future.result()
            questions_and_answers = qa_future.result()
            interview_insights = insights_future.result()
        
        # Step 5: Generate summary
        analysis_summary = generate_analysis_summary_with_openai(
            skill_assessments, questions_and_answers, interview_insights, job_role
        )
        
        return ComprehensiveAnalysisResponse(
            video_id=video_id,
            raw_transcript=raw_transcript,
            formatted_transcript=formatted_transcript,
            ai_provider=ai_provider,
            file_chunks=num_chunks,
            skill_assessments=skill_assessments,
            questions_and_answers=questions_and_answers,
            interview_insights=interview_insights,
            analysis_summary=analysis_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing video URL: {str(e)}")

@app.post("/analyze-transcript", response_model=ComprehensiveAnalysisResponse)
async def analyze_transcript(
    file: UploadFile = File(...),
    skills_to_assess: str = Form(default="Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership", description="Comma-separated list of skills to assess"),
    job_role: str = Form(default="Software Developer", description="Job role for context"),
    company_name: str = Form(default="Company", description="Company name for context"),
    ai_provider: Literal["openai", "gemini"] = Form(default="openai")
):
    """
    Comprehensive interview analysis from transcript text
    
    - **file**: Text file containing the interview transcript or PDF file (required)
    - **skills_to_assess**: Comma-separated skills to evaluate (optional, has default value)
    - **job_role**: Job role for context in analysis (optional)
    - **company_name**: Company name for context (optional)
    - **ai_provider**: AI provider for analysis (optional)
    """
    try:
        # Parse and validate skills
        skills_list = [skill.strip() for skill in skills_to_assess.split(',') if skill.strip()]
        
        # If no skills provided, use default ones
        if not skills_list:
            default_skills = ["Communication", "Technical Knowledge", "Problem Solving", "Collaboration", "Leadership"]
            print("No skills provided, using defaults:", default_skills)
            skills_list = default_skills
        
        # Limit the number of skills
        if len(skills_list) > 20:
            print("Too many skills provided, limiting to first 20")
            skills_list = skills_list[:20]
        
        # Validate AI provider
        if ai_provider != "openai":
            print("Warning: Only OpenAI is supported, switching to OpenAI")
            ai_provider = "openai"
        
        # Save uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        content = await file.read()
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)
        
        # Read the text or PDF file
        try:
            if file.filename.lower().endswith('.pdf'):
                raw_transcript = extract_text_from_pdf(content)
            else:
                with open(temp_file_path, "r", encoding="utf-8", errors="ignore") as f:
                    raw_transcript = f.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
        
        # Step 1: Validate transcript quality
        is_valid, validation_message = validate_transcript_quality(raw_transcript)
        if not is_valid:
            print(f"Warning: Transcript quality issue: {validation_message}, proceeding anyway")
            # Continue processing instead of raising an exception
        
        # Step 2: Format transcript
        print("Formatting transcript...")
        formatted_transcript = format_with_openai(
            raw_transcript, 
            f"Please format this {job_role} interview transcript for {company_name} into a clear, well-structured format with proper paragraphs and speaker identification where possible, Dont include any other text in the response, just the formatted transcript. Dont use markdown formatting."
        )
        
        # Step 3: Parallel analysis (can be done concurrently)
        print("Performing comprehensive analysis...")
        
        # Run analyses in parallel for efficiency
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all analysis tasks
            skill_future = executor.submit(assess_skills_with_openai, raw_transcript, skills_list, job_role)
            qa_future = executor.submit(extract_qa_with_openai, raw_transcript, job_role)
            insights_future = executor.submit(generate_interview_insights_with_openai, raw_transcript, job_role)
            
            # Wait for all to complete
            skill_assessments = skill_future.result()
            questions_and_answers = qa_future.result()
            interview_insights = insights_future.result()
        
        # Step 4: Generate executive summary
        print("Generating analysis summary...")
        analysis_summary = generate_analysis_summary_with_openai(
            skill_assessments, questions_and_answers, interview_insights, job_role
        )
        
        # Step 5: Return comprehensive response
        return ComprehensiveAnalysisResponse(
            filename=file.filename,
            raw_transcript=raw_transcript,
            formatted_transcript=formatted_transcript,
            ai_provider=ai_provider,
            file_chunks=1,  # Since we're not chunking the transcript
            skill_assessments=skill_assessments,
            questions_and_answers=questions_and_answers,
            interview_insights=interview_insights,
            analysis_summary=analysis_summary
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"Error during transcript analysis: {str(e)}")
    finally:
        # Clean up temporary files
        try:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        except Exception as cleanup_error:
            print(f"Warning: Cleanup failed: {cleanup_error}")

@app.post("/compare-analyses", response_model=ComparisonResponse)
async def compare_pdf_analyses(
    original_analysis: UploadFile = File(...),
    ai_analysis: UploadFile = File(...),
):
    """
    Compare original and AI-generated interview analyses
    
    - **original_analysis**: PDF file with original human analysis
    - **ai_analysis**: PDF file with AI-generated analysis
    """
    try:
        # Read uploaded files
        original_content = await original_analysis.read()
        await original_analysis.seek(0)  # Reset file pointer
        
        ai_content = await ai_analysis.read()
        await ai_analysis.seek(0)  # Reset file pointer
        
        # Extract text from PDFs
        original_text = extract_text_from_pdf(original_content)
        ai_text = extract_text_from_pdf(ai_content)
        
        # Validate extracted text
        if len(original_text) < 100 or len(ai_text) < 100:
            raise HTTPException(
                status_code=400, 
                detail="Failed to extract sufficient text from one or both PDFs"
            )
        
        # Compare analyses using OpenAI
        comparison_result = compare_analyses_with_openai(original_text, ai_text)
        
        return comparison_result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"Error comparing analyses: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 