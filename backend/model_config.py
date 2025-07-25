"""
Model Configuration Module
Centralized configuration for STT, LLM, and TTS models used across all agents
"""

from livekit.plugins import (
    openai,
    silero,
    cartesia,
    assemblyai,
    sarvam,
    groq
)
import os

class ModelConfig:
    """Centralized model configuration for all interview agents"""
    
    @staticmethod
    def get_stt():
        """Get Speech-to-Text configuration"""
        return sarvam.STT(
                language="en-IN",
                model="saarika:v2.5",
            )
    
    @staticmethod
    def get_llm():
        """Get Large Language Model configuration"""
        return openai.LLM(
            model="gpt-4.1-mini",
            temperature=0.7,
        )
    
    @staticmethod
    def get_tts():
        """Get Text-to-Speech configuration"""
        return openai.TTS(
                base_url="https://api.deepinfra.com/v1/openai",
                api_key=os.getenv("DEEPINFRA_API_KEY") or "",
                model="hexgrad/Kokoro-82M",
                voice="am_echo",
            )
    
    @staticmethod
    def get_vad():
        """Get Voice Activity Detection configuration"""
        return silero.VAD.load()

# Alternative configurations for easy switching
class AlternativeModelConfigs:
    """Alternative model configurations for different use cases"""
    
    @staticmethod
    def get_faster_llm():
        """Faster but less capable LLM for development/testing"""
        return openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,
        )
    
    @staticmethod
    def get_groq_llm():
        """Groq LLM alternative"""
        return groq.LLM(
            model="llama3-70b-8192",
            temperature=0.7,
        )
    
    @staticmethod
    def get_assemblyai_stt():
        """AssemblyAI STT alternative"""
        return assemblyai.STT(
            end_of_turn_confidence_threshold=0.5,
            min_end_of_turn_silence_when_confident=160,
            max_turn_silence=3000,
        )
    
    @staticmethod
    def get_cartesia_tts():
        """Cartesia TTS alternative"""
        return cartesia.TTS(
            model="sonic-2",
            voice="1259b7e3-cb8a-43df-9446-30971a46b8b0",
        )

# Easy way to switch configurations globally
def get_interview_models():
    """
    Get the current model configuration for interviews.
    Change this function to switch models globally.
    """
    return {
        'stt': ModelConfig.get_stt(),
        'llm': ModelConfig.get_llm(),  # Change to AlternativeModelConfigs.get_faster_llm() for development
        'tts': ModelConfig.get_tts(),
        'vad': ModelConfig.get_vad()
    }