import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../config/apiConfig';

const AIChatbot = ({ userRole = 'patient', patientContext = null, userName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [typingIndices, setTypingIndices] = useState(new Set()); // Track which messages are typing
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationIdRef = useRef(`${userRole}-${Date.now()}`);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    conversationIdRef.current = `${userRole}-${Date.now()}`;
  }, [userRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track user scroll position to prevent auto-scroll when user scrolls up
  const handleScroll = (e) => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    // Check if user is near the bottom (within 100px)
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldAutoScrollRef.current = isNearBottom;
  };

  // Typing effect - animate character by character
  useEffect(() => {
    if (typingIndices.size === 0) return;

    const typingMessage = setInterval(() => {
      setMessages(prevMessages => {
        let updated = false;
        const newMessages = prevMessages.map((msg, idx) => {
          if (typingIndices.has(idx) && msg.isTyping) {
            const fullMessage = msg.fullMessage || msg.message;
            const currentLength = msg.message.length;
            
            if (currentLength < fullMessage.length) {
              // Reveal next character
              const nextChar = fullMessage[currentLength];
              return {
                ...msg,
                message: msg.message + nextChar,
              };
            } else {
              // Typing complete
              return {
                ...msg,
                isTyping: false,
              };
            }
          }
          return msg;
        });

        return newMessages;
      });
    }, 20); // 20ms per character = ~50 chars per second

    return () => clearInterval(typingMessage);
  }, [typingIndices]);

  const startTypingAnimation = (messageIdx, fullText) => {
    setTypingIndices(prev => new Set(prev).add(messageIdx));
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      newMessages[messageIdx] = {
        ...newMessages[messageIdx],
        fullMessage: fullText,
        message: '', // Start empty
        isTyping: true,
      };
      return newMessages;
    });
  };

  // Only scroll when NEW messages arrive (user sends or new assistant message starts)
  // NOT during typing animations
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    
    // Only scroll if message count increased (new message added)
    // AND user is near the bottom
    if (currentCount > prevCount && shouldAutoScrollRef.current) {
      setTimeout(() => scrollToBottom(), 0);
    }
    
    prevMessageCountRef.current = currentCount;
  }, [messages.length]); // Only depend on message count, not message content

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Auto-greet on first open
      setMessages([{
        role: 'assistant',
        message: userRole === 'doctor'
          ? `Good day, Doctor${userName ? ` ${userName}` : ''}! I'm your AI Clinical Assistant. I can help with patient summaries, treatment protocols, drug interactions, and clinical decision support. How can I assist you?`
          : `Hello${userName ? ` ${userName}` : ''}! 👋 I'm your AI Health Assistant. I can help assess symptoms, review vitals, provide health tips, or answer medical questions. What can I help you with today?`,
        type: 'greeting',
        timestamp: new Date().toISOString(),
        suggestions: userRole === 'doctor'
          ? ['Patient summary', 'Critical alerts', 'Drug interaction check', 'Treatment protocols']
          : ['Check my symptoms', 'View my vitals', 'Health tips', 'Book appointment'],
      }]);
    }
  }, [isOpen, messages.length, userRole, userName]);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', message: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          role: userRole,
          patient_context: patientContext,
          conversation_id: conversationIdRef.current,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const botMsg = {
          role: 'assistant',
          message: '',  // Will be filled by typing effect
          fullMessage: data.response.message,
          isTyping: true,
          type: data.response.type,
          severity: data.response.severity,
          suggestions: data.response.suggestions || [],
          follow_up_questions: data.response.follow_up_questions || [],
          timestamp: data.timestamp,
        };
        setMessages(prev => [...prev, botMsg]);
        
        // Start typing animation on the new message
        setTimeout(() => {
          setMessages(prevMessages => {
            const newIdx = prevMessages.length - 1;
            startTypingAnimation(newIdx, data.response.message);
            return prevMessages;
          });
        }, 100);
        
        setSuggestions(data.response.suggestions || []);
      }
    } catch {
      const errorMsg = {
        role: 'assistant',
        message: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or contact the front desk if you need immediate assistance.",
        type: 'error',
        timestamp: new Date().toISOString(),
        suggestions: ['Try again'],
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    setLoading(false);
  }, [input, loading, userRole, patientContext]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const severityColors = {
      critical: 'border-l-4 border-red-500 bg-red-50',
      moderate: 'border-l-4 border-yellow-500 bg-yellow-50',
      mild: 'border-l-4 border-blue-500 bg-blue-50',
    };

    return (
      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
          {/* Avatar */}
          <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
              isUser
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
            }`}>
              {isUser ? (userRole === 'doctor' ? '👩‍⚕️' : '🧑') : '🤖'}
            </div>

            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md'
                : msg.severity
                  ? `${severityColors[msg.severity] || 'bg-white border border-gray-200'} text-gray-800 rounded-bl-md`
                  : msg.type === 'emergency'
                    ? 'bg-red-50 border-l-4 border-red-500 text-gray-800 rounded-bl-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
            }`}>
              {/* Format message with markdown-like bold */}
              <div className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{
                  __html: msg.message
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />

              {/* Follow-up questions */}
              {msg.follow_up_questions?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Follow-up questions:</p>
                  {msg.follow_up_questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg px-2 py-1.5 mb-1 transition-colors"
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right mr-9' : 'ml-9'}`}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 300); }}
        className={`fixed z-50 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bottom-[480px] sm:bottom-[540px] right-4 sm:right-6 w-10 h-10 bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bottom-5 right-4 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 chatbot-pulse'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open AI Assistant'}
      >
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[460px] sm:h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden chatbot-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-sm font-semibold truncate">
                {userRole === 'doctor' ? 'AI Clinical Assistant' : 'AI Health Assistant'}
              </h3>
              <p className="text-white/70 text-xs">Always online — Powered by AI</p>
            </div>
            <button
              onClick={() => { setMessages([]); setSuggestions([]); }}
              className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear conversation"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50 chatbot-messages"
          >
            {messages.map((msg, idx) => renderMessage(msg, idx))}

            {loading && (
              <div className="flex items-end gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 text-xs">
                  🤖
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0 chatbot-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full text-xs font-medium transition-colors border border-gray-200 hover:border-blue-200"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={userRole === 'doctor' ? 'Ask about patients, protocols...' : 'Describe symptoms, ask questions...'}
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              AI Assistant — Not a substitute for professional medical advice
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
