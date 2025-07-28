"""
Database Client Module
Handles Prisma database connections and operations
"""

import os
import logging
from prisma import Prisma
from prisma.models import SkillRecord, Skill, Question
from typing import Optional

# Setup logging
logger = logging.getLogger("database")

# Global Prisma client instance
_prisma_client: Optional[Prisma] = None

async def get_prisma_client() -> Prisma:
    """
    Get or create a Prisma client instance
    """
    global _prisma_client
    
    if _prisma_client is None:
        _prisma_client = Prisma()
        await _prisma_client.connect()
        logger.info("Connected to database via Prisma")
    
    return _prisma_client

async def close_prisma_client():
    """
    Close the Prisma client connection
    """
    global _prisma_client
    
    if _prisma_client is not None:
        await _prisma_client.disconnect()
        _prisma_client = None
        logger.info("Disconnected from database")

async def fetch_interview_template_data(record_id: str) -> Optional[dict]:
    """
    Fetch interview template data directly from database
    Returns data in the same format as the Next.js API route
    """
    try:
        prisma = await get_prisma_client()
        
        # Fetch the record with skills and questions
        record = await prisma.skillrecord.find_unique(
            where={'id': record_id},
            include={
                'skills': True,
                'questions': True,
            }
        )
        
        if not record:
            logger.error(f"Record not found with ID: {record_id}")
            return None
        
        logger.info(f"Found record: {record.jobTitle} with {len(record.skills)} skills and {len(record.questions)} questions")
        
        # Transform the data into the format expected by the interview agent
        template_data = {
            'id': record.id,
            'jobTitle': record.jobTitle,
            'interviewLength': record.interviewLength or 30,
            'introScript': f"Hello! I'm your interviewer for this {record.jobTitle} position. Thank you for taking the time to interview with us today. This interview will take about {record.interviewLength or 30} minutes and we'll be discussing your experience and technical skills. To start, could you please introduce yourself and tell me a bit about your background?",
            'closingScript': "That concludes our technical portion of the interview. Thank you for your time today! Do you have any questions about the role or company?",
            'skills': [
                {
                    'id': skill.id,
                    'name': skill.name,
                    'level': skill.level,
                    'category': skill.category,
                }
                for skill in record.skills
            ],
            'questions': [
                {
                    'id': question.id,
                    'content': question.content,
                    'skillId': question.skillId,
                }
                for question in record.questions
            ],
        }
        
        logger.info(f"Template prepared with {len(template_data['skills'])} skills and {len(template_data['questions'])} questions")
        
        # Log some sample questions for debugging
        if template_data['questions']:
            logger.info("Sample questions:")
            for i, q in enumerate(template_data['questions'][:3]):
                logger.info(f"Question {i+1}: {q['content'][:50]}... (Skill ID: {q['skillId']})")
        
        return template_data
        
    except Exception as e:
        logger.error(f"Error fetching interview template from database: {str(e)}")
        return None 