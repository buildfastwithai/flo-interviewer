"""
Audio configuration helpers for the interviewer agent.

Provides tuned VAD and STT instances suitable for interview scenarios
without altering the rest of the interview format or flow.
"""

from __future__ import annotations

import os
from typing import Tuple

from livekit.plugins import silero, assemblyai, deepgram


def get_vad() -> silero.VAD:
    """Return a Silero VAD tuned for interview pacing.

    Uses longer minimum silence to allow thinking pauses.
    """
    # Falls back to library defaults if parameters are unsupported
    try:
        return silero.VAD.load(
            min_speech_duration=0.3,
            min_silence_duration=1.2,
            threshold=0.5,
        )
    except Exception:
        return silero.VAD.load()


def get_enhanced_audio() -> Tuple[object, silero.VAD]:
    """Return (stt, vad) with sensible defaults.

    STT backend is chosen by env STT_BACKEND in {"assemblyai", "deepgram"}.
    Defaults to AssemblyAI with conservative EOU tuning already used by agent.
    """
    backend = os.getenv("STT_BACKEND", "assemblyai").lower()

    vad = get_vad()

    if backend == "deepgram":
        # High-accuracy Deepgram config
        stt = deepgram.STT(
            model="nova-3-general",
            language="en",
            smart_format=True,
            punctuate=True,
            profanity_filter=False,
        )
        return stt, vad

    # Default: AssemblyAI with conservative EOU parameters similar to agent
    stt = assemblyai.STT(
        end_of_turn_confidence_threshold=0.7,
        min_end_of_turn_silence_when_confident=300,
        max_turn_silence=5000,
    )
    return stt, vad


