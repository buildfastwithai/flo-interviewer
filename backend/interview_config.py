"""
Interview Configuration Module
Contains role-specific competencies, question banks, and evaluation rubrics
"""

import json
import os
import aiohttp
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum

# Setup logging
logger = logging.getLogger("interview-config")

class SkillLevel(Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"

@dataclass
class Competency:
    name: str
    weight: float  # percentage of total interview score
    time_allocation: int  # minutes
    description: str
    questions: Dict[SkillLevel, List[str]]
    evaluation_criteria: List[str]

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
class InterviewTemplate:
    role: str
    duration_minutes: int
    competencies: List[Competency]
    introduction_script: str
    closing_script: str

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
            Welcome! I'm excited to speak with you today about the {self.jobTitle} position. 
            This interview will focus on your technical skills and experience.
            Please feel free to ask clarifying questions, and let me know if you need a moment to think.
            Do you have any questions before we begin?
            """
        
        if not self.closing_script:
            self.closing_script = """
            That concludes our technical portion. Do you have any questions about the role, team, or company?
            Thank you for your time today!
            """

# Software Engineer Interview Template
SOFTWARE_ENGINEER_TEMPLATE = InterviewTemplate(
    role="Software Engineer",
    duration_minutes=60,
    introduction_script="""
    Welcome! I'm excited to speak with you today about the Software Engineer position. 
    This interview will take about 60 minutes and will cover several key areas:
    - Data Structures & Algorithms (15 min)
    - System Design (15 min)  
    - Code Quality & Practices (10 min)
    - Problem Solving (10 min)
    - Behavioral & Culture Fit (10 min)
    
    Please feel free to ask clarifying questions, and let me know if you need a moment to think.
    Do you have any questions before we begin?
    """,
    closing_script="""
    That concludes our technical portion. Do you have any questions about the role, team, or company?
    We'll follow up within 5 business days. Thank you for your time today!
    """,
    competencies=[
        Competency(
            name="Data Structures & Algorithms",
            weight=0.30,
            time_allocation=15,
            description="Ability to choose appropriate data structures and implement efficient algorithms",
            questions={
                SkillLevel.JUNIOR: [
                    "Implement a function to reverse a string. What's the time complexity?",
                    "Find the maximum element in an array. Can you do it in one pass?",
                    "Check if a string is a palindrome. Walk me through your approach.",
                    "Implement a simple stack using an array. What operations would you include?"
                ],
                SkillLevel.MID: [
                    "Find the second largest element in an array. Handle edge cases.",
                    "Implement a function to detect cycles in a linked list.",
                    "Given two sorted arrays, merge them into one sorted array.",
                    "Implement a binary search algorithm. What's the time complexity?"
                ],
                SkillLevel.SENIOR: [
                    "Design and implement a LRU cache with O(1) operations.",
                    "Find the longest palindromic substring in a string.",
                    "Implement a trie data structure with search and prefix operations.",
                    "Solve the maximum subarray problem (Kadane's algorithm)."
                ],
                SkillLevel.STAFF: [
                    "Design a distributed consistent hashing algorithm.",
                    "Implement a skip list with search, insert, and delete operations.",
                    "Solve the sliding window maximum problem efficiently.",
                    "Design a memory-efficient solution for finding anagrams in a large text."
                ]
            },
            evaluation_criteria=[
                "Correctness of algorithm",
                "Time and space complexity analysis", 
                "Code clarity and structure",
                "Edge case handling",
                "Optimization awareness"
            ]
        ),
        
        Competency(
            name="System Design",
            weight=0.25,
            time_allocation=15,
            description="Ability to design scalable, maintainable systems",
            questions={
                SkillLevel.JUNIOR: [
                    "How would you design a simple blog application? What components would you need?",
                    "Explain the difference between SQL and NoSQL databases. When would you use each?",
                    "How does HTTP work? Walk me through what happens when you visit a website."
                ],
                SkillLevel.MID: [
                    "Design a URL shortening service like bit.ly. How would you handle millions of URLs?",
                    "How would you design a chat application? Consider real-time messaging.",
                    "Design a file storage service. How would you handle large files and ensure availability?"
                ],
                SkillLevel.SENIOR: [
                    "Design a social media feed system that handles millions of users.",
                    "How would you design a distributed cache? Consider consistency and partitioning.",
                    "Design a video streaming service. How would you handle global content delivery?"
                ],
                SkillLevel.STAFF: [
                    "Design a global payment processing system with fraud detection.",
                    "How would you design a real-time analytics platform for billions of events?",
                    "Design a distributed search engine. Consider indexing, ranking, and fault tolerance."
                ]
            },
            evaluation_criteria=[
                "System architecture understanding",
                "Scalability considerations",
                "Data storage decisions",
                "API design",
                "Trade-off analysis"
            ]
        ),
        
        Competency(
            name="Code Quality & Best Practices",
            weight=0.20,
            time_allocation=10,
            description="Understanding of clean code, testing, and software engineering practices",
            questions={
                SkillLevel.JUNIOR: [
                    "What makes code 'clean' or readable? Give me some examples.",
                    "How do you approach debugging when your code isn't working?",
                    "What's the purpose of version control? How do you use Git?"
                ],
                SkillLevel.MID: [
                    "Explain the SOLID principles. Give examples of how you've applied them.",
                    "How do you approach testing your code? What types of tests do you write?",
                    "Describe a time when you refactored legacy code. What was your approach?"
                ],
                SkillLevel.SENIOR: [
                    "How do you ensure code quality in a team environment? What processes do you use?",
                    "Explain different software architecture patterns you've used.",
                    "How do you approach performance optimization? Give me a specific example."
                ],
                SkillLevel.STAFF: [
                    "How do you establish coding standards and practices across multiple teams?",
                    "Describe your approach to technical debt management.",
                    "How do you balance technical excellence with delivery timelines?"
                ]
            },
            evaluation_criteria=[
                "Code quality awareness",
                "Testing methodology",
                "Architecture understanding",
                "Best practices knowledge",
                "Process improvement mindset"
            ]
        ),
        
        Competency(
            name="Problem Solving & Communication",
            weight=0.15,
            time_allocation=10,
            description="Ability to break down problems and communicate technical concepts",
            questions={
                SkillLevel.JUNIOR: [
                    "Walk me through how you would approach learning a new programming language.",
                    "Describe a challenging bug you encountered and how you solved it.",
                    "How do you stay updated with new technologies and trends?"
                ],
                SkillLevel.MID: [
                    "Tell me about a complex problem you solved. What was your methodology?",
                    "How do you approach performance debugging in a web application?",
                    "Describe a time when you had to explain a technical concept to a non-technical person."
                ],
                SkillLevel.SENIOR: [
                    "Describe a system you designed that had to handle unexpected scale. How did you adapt?",
                    "Tell me about a time when you had to make a technical decision with incomplete information.",
                    "How do you approach technical decision-making in a team environment?"
                ],
                SkillLevel.STAFF: [
                    "Describe how you've influenced technical direction across your organization.",
                    "Tell me about a time when you had to champion a technically challenging but necessary change.",
                    "How do you balance innovation with stability in your technical decisions?"
                ]
            },
            evaluation_criteria=[
                "Problem decomposition",
                "Communication clarity",
                "Learning approach",
                "Decision-making process",
                "Technical reasoning"
            ]
        ),
        
        Competency(
            name="Behavioral & Culture Fit",
            weight=0.10,
            time_allocation=10,
            description="Values alignment, teamwork, and growth mindset",
            questions={
                SkillLevel.JUNIOR: [
                    "Tell me about a project you're particularly proud of.",
                    "How do you handle feedback and criticism?",
                    "Describe a time when you had to work with someone you disagreed with."
                ],
                SkillLevel.MID: [
                    "Tell me about a time when you had to learn something completely new for a project.",
                    "Describe a situation where you had to balance competing priorities.",
                    "How do you approach mentoring junior developers?"
                ],
                SkillLevel.SENIOR: [
                    "Tell me about a time when you had to make a difficult technical decision that affected your team.",
                    "Describe how you've contributed to improving team processes or culture.",
                    "How do you handle situations where you disagree with your manager's technical direction?"
                ],
                SkillLevel.STAFF: [
                    "Describe how you've influenced the technical culture of your organization.",
                    "Tell me about a time when you had to drive consensus on a controversial technical decision.",
                    "How do you balance individual contributor work with broader organizational impact?"
                ]
            },
            evaluation_criteria=[
                "Values alignment",
                "Growth mindset",
                "Collaboration skills",
                "Leadership potential",
                "Cultural contribution"
            ]
        )
    ]
)

# Additional role templates can be added here
ROLE_TEMPLATES = {
    "Software Engineer": SOFTWARE_ENGINEER_TEMPLATE,
    # "Frontend Developer": FRONTEND_TEMPLATE,
    # "Backend Developer": BACKEND_TEMPLATE,
    # "DevOps Engineer": DEVOPS_TEMPLATE,
    # "Data Scientist": DATA_SCIENTIST_TEMPLATE,
}

# Scoring rubric
SCORING_RUBRIC = {
    1: {
        "label": "Does not meet expectations",
        "description": "Significant gaps in knowledge or skills; unable to complete basic tasks"
    },
    2: {
        "label": "Partially meets expectations", 
        "description": "Some knowledge gaps; can complete tasks with significant guidance"
    },
    3: {
        "label": "Meets expectations",
        "description": "Solid understanding; can complete tasks independently"
    },
    4: {
        "label": "Exceeds expectations",
        "description": "Strong skills; demonstrates depth and can handle complex scenarios"
    },
    5: {
        "label": "Significantly exceeds expectations",
        "description": "Expert level; demonstrates mastery and can teach others"
    }
}

# Dictionary to cache dynamic interview templates
DYNAMIC_TEMPLATES = {}

async def fetch_interview_template(record_id: str, room_name: str = None) -> Optional[DynamicInterviewTemplate]:
    """
    Fetch interview questions and configuration from the API for a specific record ID
    """
    # Check if template is already cached
    if record_id in DYNAMIC_TEMPLATES:
        logger.info(f"Using cached template for record {record_id}")
        return DYNAMIC_TEMPLATES[record_id]
    
    # API endpoint to fetch record data
    api_url = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')
    endpoint = f"{api_url}/api/interview-template"
    
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

def get_questions_for_role_and_level(role: str, level: SkillLevel) -> Dict[str, List[str]]:
    """Get questions organized by competency for a specific role and level"""
    if role not in ROLE_TEMPLATES:
        return {}
    
    template = ROLE_TEMPLATES[role]
    questions_by_competency = {}
    
    for competency in template.competencies:
        questions_by_competency[competency.name] = competency.questions.get(level, [])
    
    return questions_by_competency

def get_evaluation_criteria(role: str) -> Dict[str, List[str]]:
    """Get evaluation criteria for each competency"""
    if role not in ROLE_TEMPLATES:
        return {}
    
    template = ROLE_TEMPLATES[role]
    criteria_by_competency = {}
    
    for competency in template.competencies:
        criteria_by_competency[competency.name] = competency.evaluation_criteria
    
    return criteria_by_competency

def get_dynamic_interview_instructions(template: DynamicInterviewTemplate, candidate_name: str) -> str:
    """
    Generate interview instructions from a dynamic template for responsive, conversational behavior
    """
    # Create the skills section for the interview instructions
    skills_section = ""
    questions_section = ""
    
    for skill in template.skills:
        skills_section += f"- {skill.name} ({len(skill.questions)} questions)\n"
        
        # Add specific questions for this skill
        if skill.questions:
            questions_section += f"\nQUESTIONS FOR {skill.name.upper()}:\n"
            for i, question in enumerate(skill.questions, 1):
                questions_section += f"{i}. {question}\n"
    
    return f"""
You are an INTERVIEWER conducting a technical interview for a {template.jobTitle} position. {candidate_name} is the CANDIDATE you are evaluating.

INTERVIEW FLOW (3 STAGES):
1. INTRODUCTION STAGE: Ask candidate to introduce themselves and their background
2. SKILLS ASSESSMENT: Assess the candidate on the following skills:
{skills_section}
3. WRAP-UP: Thank the candidate and ask if they have any questions

IMPORTANT: YOU MUST ONLY ASK THE SPECIFIC QUESTIONS LISTED BELOW:
{questions_section}

CRITICAL BEHAVIOR RULES:
- You are the interviewer, NOT the candidate
- ALWAYS respond to what the candidate just said before asking the next question
- Be conversational and natural - acknowledge their answers
- NEVER speak ratings or scores out loud
- Keep all evaluation completely silent and internal
- ONLY ask questions from the provided question list - do not make up your own questions

MOST IMPORTANT RULE: ASK ONLY ONE QUESTION AT A TIME
- Never ask multiple questions in a single response
- Wait for the candidate to answer before moving to the next question
- Only introduce a new question after the candidate has responded to the previous one

CONVERSATIONAL FLOW:
1. LISTEN to {candidate_name}'s answer
2. ACKNOWLEDGE their response (brief comment on their answer)
3. ASK ONE follow-up question or move to next topic/skill

YOUR INTERVIEWING STYLE:
- Be responsive and adaptive to their answers
- Ask follow-up questions based on their responses when appropriate
- Show you're listening by referencing what they said
- Keep questions concise but be conversational
- Help them if they're struggling, then move to next topic
- Connect technical questions to their mentioned projects when possible

EVALUATION (SILENT - NEVER SPEAK RATINGS):
- Rate each skill 1-5 based on {candidate_name}'s answers
- NEVER say ratings out loud to the candidate
- Keep all scoring completely silent and internal

EXAMPLE OF GOOD FLOW:
Interviewer: "Can you explain the concept of dependency injection?"
Candidate: [gives answer]
Interviewer: "That's a good explanation of how DI works. Now, let's move to the next question. [Ask next question from the list]"

REMEMBER: Ask ONE question, wait for an answer, acknowledge the answer, then ask your next question. Be a human interviewer, not a question robot.
""" 
