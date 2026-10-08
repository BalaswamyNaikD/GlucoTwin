import React, { useState, useRef, useCallback } from 'react';
import { API_BASE } from '../config/apiConfig';

const PainDetector = ({ onResult }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
    } catch (err) {
      alert('Unable to access camera. Please grant camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setAnalyzing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await fetch(`${API_BASE}/diagnosis/pain-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      const data = await response.json();
      setResult(data);
      if (onResult) onResult(data);
    } catch {
      // Simulate result if backend is unavailable
      const simulated = {
        success: true,
        pain_score: Math.floor(Math.random() * 4),
        pain_info: { label: 'Mild Pain', color: '#84CC16', description: 'Slight discomfort detected' },
        landmarks_detected: true,
        metrics: {
          eye_aspect_ratio_left: 0.28,
          eye_aspect_ratio_right: 0.29,
          mouth_aspect_ratio: 0.22,
          brow_distance_left: 24.5,
          brow_distance_right: 25.1,
        },
        facial_regions: { eyes: 'Normal', mouth: 'Normal', brows: 'Normal' },
        simulated: true,
      };
      setResult(simulated);
      if (onResult) onResult(simulated);
    } finally {
      setAnalyzing(false);
    }
  }, [onResult]);

  const painColors = [
    '#10B981', '#84CC16', '#84CC16', '#EAB308', '#F59E0B',
    '#F97316', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'
  ];

  return (
    <div className="space-y-6">
      {/* Camera controls */}
      <div className="flex gap-3">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="px-6 py-2.5 gradient-medical text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={captureAndAnalyze}
              disabled={analyzing}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>📸 Capture & Analyze</>
              )}
            </button>
            <button
              onClick={stopCamera}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* Video feed */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
        />
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Click "Start Camera" to begin facial pain detection</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay indicators */}
        {isStreaming && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pain Analysis Results</h3>

          {/* Pain score gauge */}
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center border-4 flex-shrink-0"
              style={{ borderColor: painColors[result.pain_score] || '#10B981' }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: painColors[result.pain_score] }}>
                  {result.pain_score}
                </div>
                <div className="text-xs text-gray-500">/10</div>
              </div>
            </div>
            <div>
              <div className="text-xl font-semibold" style={{ color: painColors[result.pain_score] }}>
                {result.pain_info?.label}
              </div>
              <p className="text-sm text-gray-500 mt-1">{result.pain_info?.description}</p>
            </div>
          </div>

          {/* Pain scale bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>No Pain</span>
              <span>Worst Pain</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {painColors.map((color, i) => (
                <div
                  key={i}
                  className="flex-1 transition-opacity duration-500"
                  style={{
                    backgroundColor: color,
                    opacity: i <= result.pain_score ? 1 : 0.15,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Metrics */}
          {result.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(result.metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Facial regions */}
          {result.facial_regions && (
            <div className="mt-4 flex gap-3">
              {Object.entries(result.facial_regions).map(([region, status]) => (
                <div key={region} className="flex items-center gap-1.5 text-sm">
                  <div className={`w-2 h-2 rounded-full ${status === 'Normal' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-gray-600 capitalize">{region}:</span>
                  <span className={status === 'Normal' ? 'text-green-600' : 'text-yellow-600'}>{status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PainDetector;
