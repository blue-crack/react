// src/components/AIAssistant.jsx
import React, { useEffect, useRef, useState } from "react";
// Change these imports (remove invalid ones):
import {
  // Keep these (they're valid):
  FaRobot, FaTimes, FaPaperPlane, FaMicrophone, FaExpand, FaCompress,
  FaVolumeUp, FaBrain, FaMagic, FaLightbulb, FaRocket, FaBolt,
  FaShieldAlt, FaCode, FaCrown, FaCoins, FaUserTie, FaTerminal,
  // FaWandMagicSparkles, // Remove this - use FaMagic instead
  // FaSparkles, // Remove this - use FaStar or FaRegStar instead
  FaRegGem, // This is valid
 // FaStar, // This is valid (use this instead of FaSparkles)
  FaCog,
  FaHistory, FaSyncAlt, FaCloudUploadAlt, FaRegClock,
  FaRegCompass, FaRegMoon, FaRegSun, FaFire,  FaArrowRight
} from "react-icons/fa";

// Add these if needed:
import { FaStar } from "react-icons/fa"; // Already imported above
import { TbSparkles } from "react-icons/tb";
import { GiArtificialIntelligence } from "react-icons/gi";

/**
 * SULA-MD: Full-featured AI Assistant component
 * Enhanced with more styles, animations, and amazing icons
 */

// ---- Configuration ---- //
const AI_API_BASE = "https://api.bk9.dev/ai/llama";
const TRANSCRIBE_ENDPOINT = "/api/transcribe";
const OWNER_DEV_NOTE =
  "Include info about Owner: Sula and Developer/Web Creator: Thenux when relevant. Keep answers friendly and actionable.";

// Full summary to append to AI prompt:
const SULA_MD_SUMMARY = `Summary of Your Web Application — SULA-MD:
- Core Purpose: SULA-MD is a sophisticated WhatsApp automation platform designed to manage WhatsApp channels efficiently while earning and spending digital coins.
- Key Features:
  - Channel React Manager with reaction packs.
  - Coin Economy: Earn coins through referrals, ads, social subscriptions, daily tasks.
  - Real-Time Stats for active users, bots, channels, success rates.
  - Referral System with tracked referred users & events.
  - Admin Controls: manage coins, reward events, referrals.
  - Smooth, modern UI: dark theme, neon highlights, glowing cards, animations.
  - Integrated Support: floating WhatsApp contact widget with Owner and Developer.
- Deployment: Frontend on Netlify/Vercel; Backend on Firebase (Auth, Firestore, Cloud Functions), Storage for images.
- Engagement: ads, daily rewards, WhatsApp orders for purchasing coins.
- UX: animated intro video, smooth transitions, copy referral link, QR codes, reactive dashboard.
`;

// Enhanced quick messages with icons
const QUICK_MESSAGES = [
  { text: "Who is Owner Sula?", icon: <FaCrown />, color: "from-yellow-500 to-amber-500" },
  { text: "Who is Developer Thenux?", icon: <FaCode />, color: "from-blue-500 to-cyan-500" },
  { text: "What can SULA-MD do?", icon: <FaMagic />, color: "from-purple-500 to-pink-500" },
  { text: "How to earn coins?", icon: <FaCoins />, color: "from-yellow-600 to-orange-500" },
  { text: "How to deploy SULA-MD?", icon: <FaRocket />, color: "from-red-500 to-orange-500" },
  { text: "Show admin features", icon: <FaShieldAlt />, color: "from-green-500 to-emerald-500" },
  { text: "Bot deployment guide", icon: <FaTerminal />, color: "from-indigo-500 to-blue-500" },
  { text: "Referral system", icon: <FaUserTie />, color: "from-teal-500 to-green-500" },
];

// ---- Helper: WebAudio short sound ---- //
function playBeep(type = "send") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    if (type === "send") {
      o.frequency.value = 1200;
      g.gain.value = 0.02;
    } else if (type === "recv") {
      o.frequency.value = 800;
      g.gain.value = 0.02;
    } else if (type === "open") {
      o.frequency.value = 1500;
      g.gain.value = 0.01;
    }
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 80);
  } catch (e) {
    // audio context may be blocked
  }
}

// ---- Assistant Component ---- //
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hello! I'm SULA-MD AI Assistant — your intelligent guide to everything SULA-MD!", timestamp: new Date() },
    {
      from: "bot",
      text: "I can help with Owner Sula, Developer Thenux, bot deployment, coins system, referrals, admin features and more. Try the quick buttons below!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState(true);
  const [useServerTranscribe, setUseServerTranscribe] = useState(true);
  const [avatarPulse, setAvatarPulse] = useState(true);
  const [aiMode, setAiMode] = useState("assistant"); // assistant, creative, precise
  const [history, setHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expanded]);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.lang = "en-US";
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (e) => {
        const txt = e.results[0][0].transcript;
        appendUserMessage(txt);
        sendMessage(txt);
      };
      recog.onerror = (e) => {
        console.warn("Speech recognition error", e);
        setListening(false);
      };
      recog.onend = () => {
        setListening(false);
      };
      recognitionRef.current = recog;
    }
    
    const iv = setInterval(() => setAvatarPulse((p) => !p), 2100);
    return () => clearInterval(iv);
  }, []);

  function appendUserMessage(text) {
    const newMsg = { from: "user", text, timestamp: new Date() };
    setMessages((m) => [...m, newMsg]);
    setHistory((h) => [...h, newMsg]);
    playBeep("send");
  }

  function appendBotMessage(text) {
    const newMsg = { from: "bot", text, timestamp: new Date() };
    setMessages((m) => [...m, newMsg]);
    setHistory((h) => [...h, newMsg]);
    playBeep("recv");
  }

  async function sendMessage(text = null) {
    const finalText = (text ?? input).trim();
    if (!finalText) return;
    
    setInput("");
    appendUserMessage(finalText);

    // Add AI mode context to prompt
    const modeContext = {
      assistant: "Answer in a helpful, friendly assistant style.",
      creative: "Answer creatively with imaginative solutions and engaging style.",
      precise: "Answer precisely with technical details and exact information."
    }[aiMode];

    const prompt =
      `[AI Mode: ${aiMode}]\n` +
      modeContext + "\n\n" +
      finalText +
      "\n\n" +
      OWNER_DEV_NOTE +
      "\n\nApplication Summary:\n" +
      SULA_MD_SUMMARY +
      "\n\nProvide a helpful response.";

    try {
      setIsTyping(true);
      setOnline(true);

      // Show typing indicator
      setMessages((prev) => [...prev, { from: "bot", text: "▎", timestamp: new Date() }]);

      const url = `${AI_API_BASE}?q=${encodeURIComponent(prompt)}`;
      const res = await fetch(url);
      const data = await res.json();

      const aiText = data?.BK9 ?? data?.answer ?? "I apologize, but I couldn't process your request. Please try again.";

      await simulateTypingReplace(aiText);
    } catch (err) {
      console.error("AI API error:", err);
      setMessages((prev) => [...prev.slice(0, -1), { 
        from: "bot", 
        text: "⚠️ I encountered an error. Please check your connection or try again later.",
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  }

  function simulateTypingReplace(fullText) {
    return new Promise((resolve) => {
      let i = 0;
      const interval = 12;
      if (typingTimeoutRef.current) clearInterval(typingTimeoutRef.current);

      typingTimeoutRef.current = setInterval(() => {
        i++;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { from: "bot", text: fullText.slice(0, i), timestamp: new Date() };
          return copy;
        });
        if (i >= fullText.length) {
          clearInterval(typingTimeoutRef.current);
          setIsTyping(false);
          resolve(true);
        }
      }, interval);
    });
  }

  function toggleListening() {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setListening(true);
      recognitionRef.current.start();
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = { mimeType: "audio/webm" };
        const mr = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mr;
        recordedChunksRef.current = [];

        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
        };
        mr.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          if (useServerTranscribe) {
            try {
              appendBotMessage("🎤 Processing your voice message...");
              const fd = new FormData();
              fd.append("file", blob, "message.webm");
              const tResp = await fetch(TRANSCRIBE_ENDPOINT, {
                method: "POST",
                body: fd
              });
              if (!tResp.ok) throw new Error("transcribe failed");
              const tJson = await tResp.json();
              const text = tJson.text || tJson.transcript || "";
              if (text) {
                appendUserMessage(text);
                await sendMessage(text);
              } else {
                appendBotMessage("Transcription failed. Try microphone transcription instead.");
              }
            } catch (err) {
              console.warn("Server transcribe failed:", err);
              setUseServerTranscribe(false);
              appendBotMessage("Server transcription failed. Try browser speech recognition.");
            }
          } else {
            appendBotMessage("🎙️ Voice recorded. Enable server transcription for automatic conversion.");
          }
        };
        mr.start();
        setRecording(true);
      } catch (err) {
        console.error("Microphone error:", err);
        appendBotMessage("❌ Microphone permission denied or not available.");
      }
    }
  }

  const quickClick = (text) => {
    sendMessage(text);
  };

  const toggleExpand = () => {
    if (!expanded) playBeep("open");
    setExpanded((s) => !s);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { from: "bot", text: "💫 Chat cleared! How can I assist you today?", timestamp: new Date() }
    ]);
  };

  // Enhanced Floating Button
  const FloatingButton = (
    <button
      onClick={() => { setOpen(true); playBeep("open"); }}
      aria-label="Open AI Assistant"
      className="fixed bottom-28 right-6 z-40 rounded-full shadow-2xl
        bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600
        hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500
        transform hover:scale-105 transition-all duration-300
        animate-float"
      title="Open AI Assistant"
      style={{
        filter: "drop-shadow(0 10px 25px rgba(139, 92, 246, 0.5))"
      }}
    >
      <div className="relative p-4">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent animate-spin-slow" />
        <div className="relative flex items-center justify-center w-16 h-16">
          <GiArtificialIntelligence size={28} className="text-white" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
        </div>
      </div>
    </button>
  );

  // Enhanced Compact Chat
  const CompactUI = open ? (
    <div
      className="fixed bottom-24 right-6 z-50 w-96 max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl
        bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95
        border border-white/10 backdrop-blur-xl"
      style={{
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.2)"
      }}
    >
      {/* Header */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-gray-900 via-purple-900/70 to-gray-900">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-pink-600/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`relative ${avatarPulse ? 'animate-pulse' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                flex items-center justify-center text-white shadow-lg">
                <FaRobot />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="text-sm font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                SULA-MD AI
              </div>
              <div className="text-xs text-gray-300 flex items-center gap-1">
                <FaRegClock size={10} /> {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                <span className="mx-1">•</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${online ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {isTyping ? 'Typing...' : online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setAiMode(aiMode === 'assistant' ? 'creative' : aiMode === 'creative' ? 'precise' : 'assistant')}
              className="px-2 py-1 rounded-lg bg-gray-800/50 text-xs flex items-center gap-1 hover:bg-gray-700/50 transition"
              title="Switch AI Mode"
            >
              {aiMode === 'assistant' && <FaBrain />}
              {aiMode === 'creative' && <FaWandMagic />}
              {aiMode === 'precise' && <FaCog />}
              <span className="capitalize">{aiMode}</span>
            </button>
            <button
              onClick={toggleExpand}
              className="p-2 rounded-lg hover:bg-white/5 transition group"
              title="Expand"
            >
              <FaExpand className="group-hover:scale-110 transition" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 transition group"
              title="Close"
            >
              <FaTimes className="group-hover:scale-110 transition" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-900/40 to-gray-900/20">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-1
              ${m.from === "bot" 
                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white" 
                : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
              }`}>
              {m.from === "bot" ? <FaRobot size={12} /> : "U"}
            </div>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-lg break-words relative overflow-hidden
                ${m.from === "bot"
                  ? "bg-gradient-to-r from-gray-800/80 to-gray-900/80 text-gray-100 border-l-4 border-purple-500"
                  : "bg-gradient-to-r from-blue-900/30 to-cyan-900/20 text-white border-l-4 border-blue-500 ml-auto"
                }`}
            >
              {m.text}
              <div className="text-xs opacity-50 mt-1 text-right">
                {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
              {m.from === "bot" && (
                <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Chips */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto bg-gray-900/40 border-t border-white/5">
        {QUICK_MESSAGES.map((q, i) => (
          <button
            key={i}
            onClick={() => quickClick(q.text)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium
              bg-gradient-to-r ${q.color} text-white hover:scale-105 transition-transform shadow-md
              hover:shadow-lg active:scale-95`}
          >
            {q.icon}
            <span>{q.text}</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="px-3 py-3 bg-gray-900/60 border-t border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg border transition-all ${listening 
              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse" 
              : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"}`}
            title="Live microphone"
          >
            <FaMicrophone />
          </button>
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-lg border transition-all ${recording 
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse" 
              : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"}`}
            title="Record voice message"
          >
            <FaVolumeUp />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition"
            title="Clear chat"
          >
            <FaSyncAlt />
          </button>
          <div className="flex-1"></div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <TbSparkles /> AI Powered
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about SULA-MD..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 bg-gray-800/30 text-white placeholder-gray-400 
              focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700/50
              transition-all duration-200"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 
              text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed
              transform hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-purple-500/25
              flex items-center justify-center gap-2"
            title="Send message"
          >
            {isTyping ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
            ) : (
              <>
                <FaPaperPlane />
               <TbSparkles className="text-yellow-300" size={12} />

              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Enhanced Expanded View
  const ExpandedUI = expanded && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && setExpanded(false)}
    >
      <div className="relative w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl
        bg-gradient-to-br from-gray-900 via-gray-900 to-black border border-white/10
        animate-scale-in"
      >
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-gray-900 via-purple-900/50 to-gray-900">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-pink-600/20" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 
                  flex items-center justify-center text-white shadow-2xl animate-float">
                  <GiArtificialIntelligence size={28} />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-cyan-400 
                  rounded-full flex items-center justify-center animate-pulse">
                  <FaBolt size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200 
                  bg-clip-text text-transparent">
                  SULA-MD AI Assistant
                </h1>
                <p className="text-gray-300 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <FaCrown className="text-yellow-400" /> Owner: Sula
                  </span>
                  <span className="mx-2">•</span>
                  <span className="flex items-center gap-1">
                    <FaCode className="text-cyan-400" /> Developer: Thenux
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {['assistant', 'creative', 'precise'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAiMode(mode)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      aiMode === mode
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {mode === 'assistant' && <FaBrain />}
                    {mode === 'creative' && <FaMagic />}
                    {mode === 'precise' && <FaCog />}
                    <span className="capitalize">{mode}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 
                  text-white hover:from-gray-700 hover:to-gray-800 transition-all flex items-center gap-2"
              >
                <FaCompress /> Collapse
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Chat Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${m.from === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg
                    ${m.from === "bot" 
                      ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                      : "bg-gradient-to-br from-blue-500 to-cyan-500"
                    }`}>
                    {m.from === "bot" ? <FaRobot /> : <FaUserTie />}
                  </div>
                  <div
                    className={`max-w-[70%] px-6 py-4 rounded-3xl shadow-xl relative overflow-hidden
                      ${m.from === "bot"
                        ? "bg-gradient-to-r from-gray-800/90 to-gray-900/90 text-gray-100 border-l-4 border-purple-500"
                        : "bg-gradient-to-r from-blue-900/40 to-cyan-900/30 text-white border-l-4 border-blue-500"
                      }`}
                    style={{
                      boxShadow: m.from === "bot" 
                        ? "0 10px 30px rgba(139, 92, 246, 0.2)" 
                        : "0 10px 30px rgba(59, 130, 246, 0.2)"
                    }}
                  >
                    <div className="relative z-10">{m.text}</div>
                    <div className="text-xs opacity-50 mt-2 text-right">
                      {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    {m.from === "bot" && (
                      <>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/5 to-transparent rounded-bl-full" />
                        <div className="absolute bottom-0 left-0 w-10 h-10 bg-gradient-to-tr from-pink-500/5 to-transparent rounded-tr-full" />
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 border-l border-white/10 bg-gradient-to-b from-gray-900/50 to-black/50 p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-purple-200">
                  <FaBolt /> Quick Actions
                </h3>
                <div className="space-y-2">
                  {QUICK_MESSAGES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => quickClick(q.text)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                        bg-gradient-to-r ${q.color}/20 hover:${q.color}/30 transition-all
                        border border-white/5 hover:border-white/10 group`}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${q.color} text-white`}>
                        {q.icon}
                      </div>
                      <span className="flex-1 text-sm font-medium">{q.text}</span>
                      <FaArrowRight className="opacity-0 group-hover:opacity-100 transition" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-cyan-200">
                  <FaMagic /> AI Features
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={toggleListening}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${listening 
                        ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30" 
                        : "bg-gray-800/30 hover:bg-gray-700/30 border border-white/5"}`}
                  >
                    <div className={`p-2 rounded-lg ${listening ? "bg-red-500" : "bg-gray-700"}`}>
                      <FaMicrophone />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Voice Input</div>
                      <div className="text-xs text-gray-400">Live speech recognition</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={toggleRecording}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${recording 
                        ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30" 
                        : "bg-gray-800/30 hover:bg-gray-700/30 border border-white/5"}`}
                  >
                    <div className={`p-2 rounded-lg ${recording ? "bg-pink-500" : "bg-gray-700"}`}>
                      <FaVolumeUp />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Voice Recording</div>
                      <div className="text-xs text-gray-400">Upload & transcribe</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-200">
                  <FaRegGem /> Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/30 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-2xl font-bold text-purple-300">{messages.length}</div>
                    <div className="text-xs text-gray-400">Messages</div>
                  </div>
                  <div className="bg-gray-800/30 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-2xl font-bold text-green-300">{history.length}</div>
                    <div className="text-xs text-gray-400">History</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-8 py-4 border-t border-white/10 bg-gradient-to-r from-gray-900/80 to-black/80">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={clearChat}
                  className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition border border-white/5"
                  title="Clear conversation"
                >
                  <FaHistory />
                </button>
                <button className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition border border-white/5"
                  title="Attach file">
                  <FaCloudUploadAlt />
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask anything about SULA-MD, bot deployment, coins system, or Owner/Developer info..."
                className="flex-1 resize-none rounded-2xl px-6 py-4 bg-gray-800/30 text-white placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-700/50
                  backdrop-blur-sm transition-all duration-200"
                autoFocus
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500
                  text-white hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 disabled:opacity-50 
                  disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 transition-all 
                  shadow-xl hover:shadow-purple-500/25 flex items-center justify-center gap-3"
                title="Send message"
              >
                {isTyping ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    <span>Send</span>
                    <FaFire className="text-orange-300" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!open && FloatingButton}
      {CompactUI}
      {ExpandedUI}
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
