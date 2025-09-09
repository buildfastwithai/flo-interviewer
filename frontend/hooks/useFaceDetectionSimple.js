import { useEffect, useRef, useState, useCallback } from 'react';
export function useFaceDetection(videoRef, options) {
  const [status, setStatus] = useState({
    isLoading: true,
    error: null,
    faceCount: 0,
    status: 'loading',
    confidence: 0,
  });

  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const lastStatusRef = useRef('loading');
  const noFaceStartTimeRef = useRef(null);
  const multipleFaceStartTimeRef = useRef(null);
  const faceApiRef = useRef(null);

  const loadModels = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (typeof window === 'undefined') {
        return;
      }

      // Dynamic import with explicit namespace
      const faceapi = await import('face-api.js').then(module => {
        // Log what we got to debug
        console.log('Module keys:', Object.keys(module));
        
        // Try to find the right export
        if (module.nets) {
          return module;
        } else if (module.default) {
          return module.default;
        } else if (module.faceapi) {
          return module.faceapi;
        }
        
        // If all else fails, assume it's a namespace export
        return module;
      });

      faceApiRef.current = faceapi;
      
      const MODEL_URL = '/face-models';
      
      // Choose TFJS backend dynamically on client.
      try {
        if (faceapi?.tf) {
          try {
            await import('@tensorflow/tfjs-backend-webgl');
            await faceapi.tf.setBackend('webgl');
          } catch {
            await import('@tensorflow/tfjs-backend-cpu');
            await faceapi.tf.setBackend('cpu');
          }
          await faceapi.tf.ready();
        }
      } catch (backendErr) {
        console.warn('TFJS backend selection failed:', backendErr);
      }
      
      // Load models with error handling
      try {
        if (faceapi.nets && faceapi.nets.tinyFaceDetector) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        } else {
          console.error('nets not found in faceapi:', faceapi);
          throw new Error('face-api structure issue');
        }
      } catch (modelError) {
        console.error('Model loading error:', modelError);
        throw modelError;
      }

      setStatus(prev => ({ ...prev, isLoading: false }));
      options.onProctorEvent?.('face_detection_loaded', 'Face detection models loaded successfully');
    } catch (error) {
      console.error('Error loading face detection:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load face detection',
        status: 'error',
      }));
      options.onProctorEvent?.('face_detection_error', 'Failed to load face detection', {
        error: error.message || String(error),
      });
    }
  }, [options.onProctorEvent]);

  const detectFaces = useCallback(async () => {
    const faceapi = faceApiRef.current;
    const videoElement = videoRef.current?.video || videoRef.current;
    
    if (!videoElement || !videoElement.videoWidth || status.isLoading || !faceapi) {
      return;
    }

    try {
      const inputSize = options.detectorInputSize || 160; // 128/160/224
      const scoreThreshold = options.detectorScoreThreshold || 0.5;
      const enableLandmarks = options.enableLandmarks === true; // default off for perf

      const detectionTask = faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
        );

      const detections = enableLandmarks
        ? await detectionTask.withFaceLandmarks()
        : await detectionTask;

      const faceCount = detections.length;
      const avgConfidence = detections.length > 0
        ? detections.reduce((sum, d) => {
            const score = typeof d?.score === 'number' ? d.score : (d?.detection?.score ?? 0);
            return sum + score;
          }, 0) / detections.length
        : 0;

      let newStatus = 'single-face';
      
      if (faceCount === 0) {
        newStatus = 'no-face';
        
        if (lastStatusRef.current !== 'no-face') {
          noFaceStartTimeRef.current = Date.now();
          options.onNoFaceDetected?.();
          options.onProctorEvent?.('face_not_detected', 'No face detected in frame');
        } else if (noFaceStartTimeRef.current) {
          const duration = Date.now() - noFaceStartTimeRef.current;
          if (duration > 5000 && duration % 5000 < 500) {
            options.onProctorEvent?.('prolonged_no_face', 'No face detected for extended period', {
              durationMs: duration,
            });
          }
        }
      } else if (faceCount === 1) {
        newStatus = 'single-face';
        noFaceStartTimeRef.current = null;
        multipleFaceStartTimeRef.current = null;
        
        if (lastStatusRef.current !== 'single-face') {
          options.onFaceDetected?.(faceCount);
          options.onProctorEvent?.('face_detected', 'Single face detected', {
            confidence: avgConfidence,
          });
        }
      } else {
        newStatus = 'multiple-faces';
        
        if (lastStatusRef.current !== 'multiple-faces') {
          multipleFaceStartTimeRef.current = Date.now();
          options.onMultipleFacesDetected?.(faceCount);
          options.onProctorEvent?.('multiple_faces_detected', `${faceCount} faces detected`, {
            faceCount,
            avgConfidence,
          });
        } else if (multipleFaceStartTimeRef.current) {
          const duration = Date.now() - multipleFaceStartTimeRef.current;
          if (duration > 5000 && duration % 5000 < 500) {
            options.onProctorEvent?.('prolonged_multiple_faces', 'Multiple faces detected for extended period', {
              faceCount,
              durationMs: duration,
            });
          }
        }
      }

      lastStatusRef.current = newStatus;

      setStatus({
        isLoading: false,
        error: null,
        faceCount,
        status: newStatus,
        confidence: avgConfidence,
      });
    } catch (error) {
      console.error('Face detection error:', error);
      setStatus(prev => ({
        ...prev,
        error: 'Face detection failed',
        status: 'error',
      }));
    }
  }, [
    videoRef,
    status.isLoading,
    options,
  ]);

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    loadModels();
  }, [options.enabled, loadModels]);

  useEffect(() => {
    if (!options.enabled || status.isLoading || !videoRef.current) {
      return;
    }

    const maxFps = (() => {
      if (typeof options.maxFps === 'number' && options.maxFps > 0) return options.maxFps;
      if (typeof options.detectionInterval === 'number' && options.detectionInterval > 0) {
        return Math.max(1, Math.min(30, Math.round(1000 / options.detectionInterval)));
      }
      return 10; // sensible default
    })();
    const minFrameIntervalMs = 1000 / maxFps;

    const videoElement = videoRef.current?.video || videoRef.current;
    let mounted = true;

    const loop = async (now) => {
      if (!mounted) return;
      if (!lastFrameTimeRef.current || now - lastFrameTimeRef.current >= minFrameIntervalMs) {
        lastFrameTimeRef.current = now;
        await detectFaces();
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const start = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastFrameTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    if (videoElement && videoElement.readyState >= 2) {
      start();
    } else if (videoElement) {
      const handleLoaded = () => start();
      videoElement.addEventListener('loadeddata', handleLoaded);
      return () => {
        mounted = false;
        videoElement.removeEventListener('loadeddata', handleLoaded);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }

    return () => {
      mounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    options.enabled,
    options.detectionInterval,
    options.maxFps,
    options.detectorInputSize,
    options.detectorScoreThreshold,
    options.enableLandmarks,
    status.isLoading,
    videoRef,
    detectFaces,
  ]);

  return status;
}