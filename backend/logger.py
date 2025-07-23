import logging
import json
from datetime import datetime
import os

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Create and configure the logger
def setup_logger(name="interview-agent", log_file=None):
    """Set up and configure a logger with the given name and log file"""
    logger = logging.getLogger(name)
    
    # If a log file is specified, create a file handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    logger.setLevel(logging.INFO)
    return logger

# Create the default logger
logger = setup_logger(log_file=f'logs/interview_agent.log')

def log_interview_data(interview_data, stage, data):
    """Log interview progress and data for quality assurance"""
    interview_data["stage"] = stage
    interview_data[stage] = data
    interview_data["duration_minutes"] = (
        datetime.now() - datetime.fromisoformat(interview_data["start_time"])
    ).total_seconds() / 60
    logger.info(f"Interview stage: {stage}, Data: {json.dumps(data, indent=2)}")

def log_metrics(metrics_obj, metrics_type):
    """Log metrics data with proper formatting"""
    logger.info(f"{metrics_type} Metrics: {json.dumps(metrics_obj, indent=2)}")

def log_error(message, error):
    """Log error message and exception"""
    logger.error(f"{message}: {str(error)}")

def log_warning(message):
    """Log warning message"""
    logger.warning(message)

def log_info(message):
    """Log info message"""
    logger.info(message) 