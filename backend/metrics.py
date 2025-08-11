import json
from datetime import datetime
from typing import Dict, List
from livekit.agents.metrics import LLMMetrics, STTMetrics, TTSMetrics, EOUMetrics

from logger import logger, log_metrics

class MetricsCollector:
    def __init__(self):
        # Initialize metrics storage; individual events are appended during run
        self.metrics_data = {
            "llm": [],
            "stt": [],
            "tts": [],
            "eou": []
        }

    async def on_llm_metrics_collected(self, metrics: LLMMetrics) -> None:
        """Collect and store LLM metrics (tokens, speed, ttft)."""
        metrics_obj = {
            "prompt_tokens": metrics.prompt_tokens,
            "completion_tokens": metrics.completion_tokens,
            "tokens_per_second": round(metrics.tokens_per_second, 4),
            "ttft": round(metrics.ttft, 4),
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["llm"].append(metrics_obj)
        log_metrics(metrics_obj, "LLM")

    async def on_stt_metrics_collected(self, metrics: STTMetrics) -> None:
        """Collect and store STT metrics (durations, streaming)."""
        metrics_obj = {
            "duration": round(metrics.duration, 4),
            "audio_duration": round(metrics.audio_duration, 4),
            "streamed": metrics.streamed,
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["stt"].append(metrics_obj)
        log_metrics(metrics_obj, "STT")

    async def on_eou_metrics_collected(self, metrics: EOUMetrics) -> None:
        """Collect and store End-Of-Utterance metrics (timings)."""
        metrics_obj = {
            "end_of_utterance_delay": round(metrics.end_of_utterance_delay, 4),
            "transcription_delay": round(metrics.transcription_delay, 4),
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["eou"].append(metrics_obj)
        log_metrics(metrics_obj, "EOU")

    async def on_tts_metrics_collected(self, metrics: TTSMetrics) -> None:
        """Collect and store TTS metrics (latency, durations)."""
        metrics_obj = {
            "ttfb": round(metrics.ttfb, 4),
            "duration": round(metrics.duration, 4),
            "audio_duration": round(metrics.audio_duration, 4),
            "streamed": metrics.streamed,
            "timestamp": datetime.now().isoformat()
        }
        self.metrics_data["tts"].append(metrics_obj)
        log_metrics(metrics_obj, "TTS")

    def calculate_avg_metrics(self) -> Dict:
        """Calculate category-wise averages for dashboarding/reporting."""
        avg_metrics = {
            "llm": self._calculate_avg_llm_metrics(),
            "stt": self._calculate_avg_stt_metrics(),
            "tts": self._calculate_avg_tts_metrics(),
            "eou": self._calculate_avg_eou_metrics()
        }
        return avg_metrics

    def _calculate_avg_llm_metrics(self) -> Dict:
        """Calculate average LLM metrics"""
        llm_data = self.metrics_data["llm"]
        if not llm_data:
            return {}
            
        avg = {
            "prompt_tokens": sum(m["prompt_tokens"] for m in llm_data) / len(llm_data),
            "completion_tokens": sum(m["completion_tokens"] for m in llm_data) / len(llm_data),
            "tokens_per_second": sum(m["tokens_per_second"] for m in llm_data) / len(llm_data),
            "ttft": sum(m["ttft"] for m in llm_data) / len(llm_data),
            "total_tokens": sum(m["prompt_tokens"] + m["completion_tokens"] for m in llm_data)
        }
        return {k: round(v, 4) for k, v in avg.items()}

    def _calculate_avg_stt_metrics(self) -> Dict:
        """Calculate average STT metrics"""
        stt_data = self.metrics_data["stt"]
        if not stt_data:
            return {}
            
        avg = {
            "duration": sum(m["duration"] for m in stt_data) / len(stt_data),
            "audio_duration": sum(m["audio_duration"] for m in stt_data) / len(stt_data),
            "total_audio_processed": sum(m["audio_duration"] for m in stt_data)
        }
        return {k: round(v, 4) for k, v in avg.items()}

    def _calculate_avg_tts_metrics(self) -> Dict:
        """Calculate average TTS metrics"""
        tts_data = self.metrics_data["tts"]
        if not tts_data:
            return {}
            
        avg = {
            "ttfb": sum(m["ttfb"] for m in tts_data) / len(tts_data),
            "duration": sum(m["duration"] for m in tts_data) / len(tts_data),
            "audio_duration": sum(m["audio_duration"] for m in tts_data) / len(tts_data),
            "total_audio_generated": sum(m["audio_duration"] for m in tts_data)
        }
        return {k: round(v, 4) for k, v in avg.items()}

    def _calculate_avg_eou_metrics(self) -> Dict:
        """Calculate average EOU metrics"""
        eou_data = self.metrics_data["eou"]
        if not eou_data:
            return {}
            
        avg = {
            "end_of_utterance_delay": sum(m["end_of_utterance_delay"] for m in eou_data) / len(eou_data),
            "transcription_delay": sum(m["transcription_delay"] for m in eou_data) / len(eou_data)
        }
        return {k: round(v, 4) for k, v in avg.items()}
