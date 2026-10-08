import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../config/apiConfig';

const GUIDED_TURNS = 3;

const AIHealthAssistant = ({ user, vitals, onResult }) => {
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [analysis, setAnalysis] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const latestVoiceDataRef = useRef('');
  const messagesEndRef = useRef(null);

  const userTurnCount = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages]
  );

  useEffect(() => {
    const intro = language === 'te'
      ? 'నమస్తే. నేను మీ AI Health Assistant. దయచేసి మీ సమస్య చెప్పండి. 3 ప్రశ్నలు అడిగి పూర్తి విశ్లేషణ ఇస్తాను.'
      : 'Hello. I am your unified AI Health Assistant. Tell me what you feel. After 3 rounds, I will provide a complete analysis.';
    setMessages([{ id: Date.now(), role: 'assistant', text: intro, ts: new Date().toISOString() }]);
    setAnalysis(null);
    latestVoiceDataRef.current = '';
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language === 'te' ? 'te-IN' : 'en-US';
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  };

  const addMessage = (role, text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), role, text, ts: new Date().toISOString() },
    ]);
  };

  const makeTypingResponse = async (text) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200, 250 + text.length * 7)));
    setIsTyping(false);
    addMessage('assistant', text);
    speak(text);
  };

  const toDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const extractReply = (payload) => {
    if (!payload) return '';
    if (typeof payload.response === 'string') return payload.response;
    if (payload.response?.message) return payload.response.message;
    if (payload.message) return payload.message;
    return language === 'te'
      ? 'ఇప్పుడే స్పందన రాలేదు. మళ్లీ ప్రయత్నించండి.'
      : 'I could not generate a response now. Please try again.';
  };

  const sendToAssistant = async (userText) => {
    if (!userText.trim()) return;
    addMessage('user', userText.trim());
    setInputText('');
    setIsSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        message: m.text,
      }));
      history.push({ role: 'user', message: userText.trim() });

      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText.trim(),
          role: 'patient',
          conversation_id: `patient-${user?.id || 'guest'}-unified`,
          patient_context: { vitals },
          language,
        }),
      });
      const data = await res.json();
      await makeTypingResponse(extractReply(data));
    } catch {
      await makeTypingResponse(
        language === 'te'
          ? 'సర్వర్ స్పందించలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
          : 'Server did not respond. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data.size > 0) {
          recordedChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setIsRecording(false);

        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const voiceData = await toDataUrl(blob);
        latestVoiceDataRef.current = String(voiceData || '');

        const form = new FormData();
        form.append('audio', blob, 'voice.webm');

        try {
          setIsSending(true);
          const sttRes = await fetch(`${API_BASE}/chatbot/voice-to-text`, {
            method: 'POST',
            body: form,
          });
          const sttData = await sttRes.json();
          const text = (sttData.text || '').trim();
          if (text) {
            await sendToAssistant(text);
          } else {
            addMessage(
              'assistant',
              language === 'te'
                ? 'వాయిస్‌ను టెక్స్ట్‌గా మార్చలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.'
                : 'I could not transcribe your voice. Please try again.'
            );
          }
        } catch {
          addMessage(
            'assistant',
            language === 'te'
              ? 'వాయిస్ ప్రాసెసింగ్ లోపం వచ్చింది.'
              : 'Voice processing failed.'
          );
        } finally {
          setIsSending(false);
        }
      };

      recorder.start();
      setRecordSeconds(0);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      addMessage(
        'assistant',
        language === 'te'
          ? 'మైక్రోఫోన్ యాక్సెస్ దొరకలేదు.'
          : 'Microphone access was not granted.'
      );
    }
  };

  const runComprehensiveAnalysis = async () => {
    if (analysis || isSending) return;

    setIsSending(true);
    try {
      const conversation = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }));

      const res = await fetch(`${API_BASE}/chatbot/comprehensive-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user?.id,
          language,
          vitals,
          conversation,
        }),
      });
      const result = await res.json();
      setAnalysis(result);
      if (onResult) onResult(result);

      const closing = language === 'te'
        ? 'మీ విశ్లేషణ పూర్తైంది. ఫలితాలు క్రింద ఉన్నాయి.'
        : 'Your unified analysis is complete. Results are shown below.';
      await makeTypingResponse(closing);
    } catch {
      addMessage(
        'assistant',
        language === 'te'
          ? 'పూర్తి విశ్లేషణ చేయలేకపోయాను.'
          : 'I could not complete the comprehensive analysis.'
      );
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (userTurnCount >= GUIDED_TURNS && !analysis) {
      runComprehensiveAnalysis();
    }
  }, [analysis, userTurnCount]);

  const restartConversation = () => {
    setMessages([]);
    setAnalysis(null);
    setInputText('');
    setIsTyping(false);
    setIsSending(false);
    latestVoiceDataRef.current = '';
    const intro = language === 'te'
      ? 'కొత్త సెషన్ మొదలైంది. మీ సమస్యను మళ్లీ చెప్పండి.'
      : 'New session started. Please describe your symptoms again.';
    addMessage('assistant', intro);
  };

  const canAskMore = userTurnCount < GUIDED_TURNS;
  const recordingLabel = `${String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:${String(recordSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-teal-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Unified AI Health Assistant</h3>
              <p className="text-xs text-gray-600">Chat + Voice input + Vitals in one real-time flow</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-xs rounded-lg ${language === 'en' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`px-3 py-1.5 text-xs rounded-lg ${language === 'te' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Telugu
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 p-4 border-r border-gray-100">
            <div className="h-[460px] overflow-y-auto pr-1 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.role === 'assistant' && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => speak(msg.text)}
                          className="text-xs px-2 py-1 rounded bg-white text-gray-700 border border-gray-200"
                          title="Play audio"
                        >
                          🔊
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canAskMore && !isSending) {
                      sendToAssistant(inputText);
                    }
                  }}
                  disabled={isSending || !canAskMore}
                  placeholder={language === 'te' ? 'మీ లక్షణాలు టైప్ చేయండి...' : 'Type your symptoms...'}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={() => sendToAssistant(inputText)}
                  disabled={isSending || !canAskMore || !inputText.trim()}
                  className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  Send
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSending || !canAskMore}
                  className={`px-4 py-2 text-sm rounded-xl font-semibold text-white ${isRecording ? 'bg-red-600' : 'bg-cyan-600'} disabled:opacity-50`}
                >
                  {isRecording ? `🎤 Stop ${recordingLabel}` : '🎤 Voice'}
                </button>
                <button
                  type="button"
                  onClick={restartConversation}
                  className="px-4 py-2 text-sm rounded-xl bg-gray-100 text-gray-700 font-semibold"
                >
                  New Session
                </button>
                <div className="ml-auto text-xs text-gray-600 self-center">
                  Round {Math.min(userTurnCount, GUIDED_TURNS)}/{GUIDED_TURNS}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Live Signals</h4>
            <div className="w-full h-36 rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 border border-cyan-200 flex items-center justify-center text-center px-3">
              <p className="text-sm text-cyan-800 font-medium">Voice-based conversational support active</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white border border-gray-200 rounded-lg p-2">HR: {vitals?.heart_rate || 72}</div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">SpO2: {vitals?.spo2 || 98}%</div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">BP: {vitals?.blood_pressure || '120/80'}</div>
              <div className="bg-white border border-gray-200 rounded-lg p-2">Temp: {vitals?.temperature || 98.6}F</div>
            </div>

            {analysis && (
              <div className="mt-4 bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                <h5 className="text-sm font-semibold text-gray-900">Final Output</h5>
                <div>
                  <p className="text-xs text-gray-500">Symptom Severity</p>
                  <p className="text-sm font-medium text-gray-900">{(analysis.risk_level || 'low').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Possible Conditions</p>
                  <ul className="text-sm text-gray-900 list-disc pl-4">
                    {(analysis.possible_conditions || []).map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Confidence %</p>
                  <p className="text-sm font-medium text-gray-900">{Math.round((analysis.confidence || 0) * 100)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recommendation</p>
                  <ul className="text-sm text-gray-900 list-disc pl-4">
                    {(analysis.recommendations || []).slice(0, 3).map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                {analysis.alert_triggered && (
                  <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                    Alert triggered due to elevated risk.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHealthAssistant;
