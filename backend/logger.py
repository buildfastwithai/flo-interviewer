# Built-in
import logging
import json
from datetime import datetime
import os
import sys
import io

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Create and configure the logger
def setup_logger(name: str = "interview-agent", log_file: str | None = None):
    """Return a UTF-8 safe logger.

    * Prevent messages from propagating to the *root* logger so that Python's
      default ``StreamHandler`` (which uses the current code-page on Windows)
      does not attempt to write Unicode characters that the console cannot
      encode.
    * Add our own handlers only **once** (function can be called multiple
      times safely).
    * Force UTF-8 encoding for both file and console output.
    """

    logger = logging.getLogger(name)

    # If handlers are already configured, just return the logger to avoid
    # adding duplicate handlers every time this function is called.
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # Do **not** pass log records to the root logger. This avoids the default
    # StreamHandler that writes using the active Windows code-page, which can
    # raise ``UnicodeEncodeError`` for characters like the Rupee symbol (₹).
    logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # File handler (always UTF-8)
    if log_file is None:
        log_file = "logs/interview_agent.log"

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Console handler with UTF-8; wrap sys.stderr in a UTF-8 TextIOWrapper so
    # that the stream can safely handle any Unicode character.
    utf8_stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    stream_handler = logging.StreamHandler(utf8_stderr)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

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