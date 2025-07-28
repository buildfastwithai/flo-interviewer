"""
    Interview Configuration Module
    Contains role-specific question banks
    """

import os
import aiohttp
import logging
from dataclasses import dataclass
from typing import List, Optional

# Setup logging
logger = logging.getLogger("interview-config")

@dataclass
class Skill:
    id: str
    name: str
    level: str
    category: Optional[str] = None
    questions: List[str] = None
    
    def __post_init__(self):
        if self.questions is None:
            self.questions = []

@dataclass
class DynamicInterviewTemplate:
    id: str
    jobTitle: str
    duration_minutes: int = 30
    skills: List[Skill] = None
    introduction_script: str = ""
    closing_script: str = ""
    
    def __post_init__(self):
        if self.skills is None:
            self.skills = []
        
        if not self.introduction_script:
            self.introduction_script = f"""
            Welcome candidate, I am an interviewer for the {self.role} and I will be taking your interview. Are you ready to begin the interview?
            """
        
        if not self.closing_script:
            self.closing_script = """
            Thank you for your time. Do you have any questions for me?
            If they have questions, answer them
            If they don't have questions, thank them for their time and ask them to end the interview and say goodbye and don't speak any more
            """

# Dictionary to cache dynamic interview templates
DYNAMIC_TEMPLATES = {}

async def fetch_interview_template(record_id: str, room_name: str = None) -> Optional[DynamicInterviewTemplate]:
    """
    Fetch interview questions and configuration from the API for a specific record ID
    """
    # Check if template is already cached
    # if record_id in DYNAMIC_TEMPLATES:
    #     logger.info(f"Using cached template for record {record_id}")
    #     return DYNAMIC_TEMPLATES[record_id]
    
    # API endpoint to fetch record data
    api_url = os.getenv('NEXTJS_API_URL')
    endpoint = f"{api_url}/api/interview-template"

    print(f"Fetching interview template for record {record_id} wiyh api url {endpoint}")
    logger.info(f"Fetching interview template for record {record_id} wiyh api url {endpoint}")
    
    try:
        async with aiohttp.ClientSession() as session:
            params = {'recordId': record_id}
            if room_name:
                params['roomName'] = room_name
                
            async with session.get(
                endpoint,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)  # Increased timeout
            ) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch interview template: {await response.text()}")
                    return None
                
                data = await response.json()
                logger.info(f"Received template data with {len(data.get('skills', []))} skills and {len(data.get('questions', []))} questions")
                
                template = DynamicInterviewTemplate(
                    id=data.get('id'),
                    jobTitle=data.get('jobTitle', 'Technical Role'),
                    duration_minutes=data.get('interviewLength', 30),
                    introduction_script=data.get('introScript', ''),
                    closing_script=data.get('closingScript', '')
                )
                
                # Parse skills and questions
                skills = []
                for skill_data in data.get('skills', []):
                    skill = Skill(
                        id=skill_data.get('id'),
                        name=skill_data.get('name', 'Unknown Skill'),
                        level=skill_data.get('level', 'mid'),
                        category=skill_data.get('category')
                    )
                    
                    # Find questions associated with this skill
                    skill_questions = []
                    for q in data.get('questions', []):
                        # Check if this question is for the current skill
                        if q.get('skillId') == skill.id:
                            skill_questions.append(q.get('content', ''))
                    
                    skill.questions = skill_questions
                    logger.info(f"Added skill {skill.name} with {len(skill_questions)} questions")
                    skills.append(skill)
                
                template.skills = skills
                
                # Cache the template
                DYNAMIC_TEMPLATES[record_id] = template
                
                logger.info(f"Successfully fetched interview template for record {record_id}")
                return template
    
    except Exception as e:
        logger.error(f"Error fetching interview template: {str(e)}")
        return None
