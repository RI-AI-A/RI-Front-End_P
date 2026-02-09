import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Activity, Users, AlertTriangle,
  CheckCircle, MessageSquare, Send, X, ArrowRight,
  RefreshCw, TrendingUp, TrendingDown, Mic, MicOff, Camera
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

// --- Types ---
interface KPI {
  traffic_index: number;
  conversion_proxy: number;
  congestion_level: number;
  time_window_start: string;
}

interface Situation {
  situation: string;
  severity: number;
  details: string;
}

interface Recommendation {
  action: string;
  priority: string;
  expected_impact: string;
}

interface RecommendationResponse {
  situation: Situation;
  recommendations: Recommendation[];
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

// --- Constants ---
const BRANCH_ID = "BRANCH_A"; // Hardcoded for MVP Demo

function App() {
  // State
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [situationData, setSituationData] = useState<RecommendationResponse | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Hello! I can help you analyze branch performance. Ask me anything!' }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  // --- Voice State ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPIs (via Proxy to CV Backend)
      const kpiRes = await axios.get<KPI[]>(`/api/cv/kpis/branch/${BRANCH_ID}?limit=20`);
      setKpis(kpiRes.data.reverse()); // Show chronological order

      // 2. Fetch Situation & Recommendations
      const recRes = await axios.get<RecommendationResponse>(`/api/cv/recommendations/${BRANCH_ID}`);
      setSituationData(recRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleSendMessage = async (audioBlob?: Blob) => {
    if (!input.trim() && !audioBlob) return;

    const userMsg = input || (audioBlob ? "[Voice Message]" : "");
    if (!audioBlob) {
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setInput("");
    }

    try {
      if (audioBlob) {
        // Voice Query
        const formData = new FormData();
        formData.append('audio', audioBlob, 'query.mp3');
        formData.append('conversation_id', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('user_role', 'manager');

        const voiceRes = await axios.post('/api/nlp/nlp/voice/query', formData);

        // Add both transcription and response to chat
        setMessages(prev => [
          ...prev,
          { role: 'user', text: voiceRes.data.transcription },
          { role: 'bot', text: voiceRes.data.nlp_data.response_text }
        ]);

        // Play audio response
        const audio = new Audio(`data:audio/mp3;base64,${voiceRes.data.audio_response}`);
        audio.play();
      } else {
        // Text Query
        const res = await axios.post('/api/nlp/nlp/query', {
          query: userMsg,
          conversation_id: "123e4567-e89b-12d3-a456-426614174000",
          user_role: "manager"
        });

        setMessages(prev => [...prev, { role: 'bot', text: res.data.response_text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't reach the AI service." }]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        handleSendMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleApproveTask = async (rec: Recommendation) => {
    setApproving(true);
    try {
      await axios.post('/api/cv/tasks/from-recommendation', {
        employee_id: 101, // Mock
        branch_id: BRANCH_ID,
        action: rec.action,
        priority: rec.priority,
        expected_impact: rec.expected_impact,
        note: "Approved via Dashboard"
      });
      alert(`Task created for action: ${rec.action}`);
    } catch (err) {
      alert("Failed to create task");
    } finally {
      setApproving(false);
    }
  };

  // --- Render Helpers ---
  const currentKPI = kpis.length > 0 ? kpis[kpis.length - 1] : null;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Retail Intelligence Platform
          </h1>
          <p className="text-stone-400 text-sm">Real-time Decision Support System • {BRANCH_ID}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 transition"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: KPIs & Status */}
        <div className="lg:col-span-2 space-y-8">

          {/* Status Alert */}
          {situationData && (
            <div className={`p-6 rounded-xl border ${situationData.situation.situation === 'normal'
              ? 'bg-emerald-950/30 border-emerald-800'
              : 'bg-amber-950/30 border-amber-800'
              }`}>
              <div className="flex items-start gap-4">
                <AlertTriangle className={`w-8 h-8 ${situationData.situation.situation === 'normal' ? 'text-emerald-500' : 'text-amber-500'
                  }`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold uppercase tracking-wide">
                      {situationData.situation.situation.replace('_', ' ')}
                    </h2>
                    <span className="text-xs bg-stone-900 border border-stone-800 px-2 py-1 rounded-full text-stone-400">
                      Live Status
                    </span>
                  </div>
                  <p className="text-stone-300">{situationData.situation.details}</p>
                </div>
              </div>
            </div>
          )}

          {/* Live Monitoring Section */}
          <div className="space-y-4">
            <h3 className="text-stone-400 font-medium flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              Live Monitoring Streams
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stream-container relative group">
                <img src="/api/cv/stream/view" alt="Branch A Main View" />
                <div className="absolute top-2 left-2 bg-stone-950/80 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter border border-stone-800">
                  CAM_01 • Main Entrance
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] uppercase font-bold text-red-500">Live</span>
                </div>
              </div>
              <div className="stream-container relative group bg-stone-900 flex items-center justify-center border-dashed">
                <div className="text-center">
                  <Activity className="w-8 h-8 text-stone-700 mx-auto mb-2" />
                  <p className="text-xs text-stone-600 font-medium italic">Secondary Feed Offline</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Traffic Index"
              value={currentKPI?.traffic_index?.toFixed(2) || '-'}
              icon={<Users className="text-blue-400" />}
              trend={currentKPI && currentKPI.traffic_index > 1.2 ? 'up' : 'neutral'}
            />
            <KPICard
              title="Conversion"
              value={currentKPI ? `${(currentKPI.conversion_proxy * 100).toFixed(1)}%` : '-'}
              icon={<TrendingUp className="text-emerald-400" />}
              trend="neutral"
            />
            <KPICard
              title="Congestion"
              value={currentKPI ? `${(currentKPI.congestion_level * 100).toFixed(0)}%` : '-'}
              icon={<Activity className="text-rose-400" />}
              trend={currentKPI && currentKPI.congestion_level > 0.8 ? 'down' : 'up'}
            />
          </div>

          {/* Chart */}
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl h-[400px]">
            <h3 className="text-stone-400 font-medium mb-4">Traffic vs. Capacity Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis}>
                <XAxis dataKey="time_window_start" hide />
                <YAxis stroke="#57534e" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c' }}
                  itemStyle={{ color: '#e7e5e4' }}
                />
                <Line type="monotone" dataKey="traffic_index" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="congestion_level" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Recommendations & Chat */}
        <div className="space-y-8">

          {/* Recommendations Panel */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-500 w-5 h-5" />
              Recommended Actions
            </h3>

            {situationData?.recommendations && situationData.recommendations.length > 0 ? (
              <div className="space-y-4">
                {situationData.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-stone-950 p-4 rounded-lg border border-stone-800 hover:border-stone-700 transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${rec.priority === 'high' ? 'bg-rose-950 text-rose-400' : 'bg-blue-950 text-blue-400'
                        }`}>
                        {rec.priority}
                      </span>
                      <button
                        onClick={() => handleApproveTask(rec)}
                        disabled={approving}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition flex items-center gap-1 disabled:opacity-50"
                      >
                        Approve
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="font-medium text-stone-200">{rec.action}</p>
                    <p className="text-stone-500 text-sm mt-1">{rec.expected_impact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-center py-8">No active recommendations.</p>
            )}
          </div>

          {/* Chat Widget Toggle */}
          <div className="fixed bottom-6 right-6">
            {!chatOpen && (
              <button
                onClick={() => setChatOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Chat Window */}
          {chatOpen && (
            <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-stone-900 border border-stone-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
                <h3 className="font-bold text-stone-200">AI Assistant</h3>
                <button onClick={() => setChatOpen(false)} className="text-stone-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-900/50">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-stone-800 text-stone-200 rounded-bl-none'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-stone-800 bg-stone-950 flex gap-2 items-center">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-2 rounded-lg transition-colors ${isRecording
                    ? 'bg-red-600 text-white recording-pulse'
                    : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                    }`}
                  title="Hold to talk"
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isRecording ? "Listening..." : "Ask about branch status..."}
                  className="flex-1 bg-stone-800 border-none rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                  disabled={isRecording}
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50"
                  disabled={isRecording || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-stone-500 text-sm">{title}</p>
        <p className="text-2xl font-bold mt-1 text-white">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500" />}
          <span className="text-xs text-stone-600">vs last hour</span>
        </div>
      </div>
      <div className="p-3 bg-stone-950 rounded-lg border border-stone-800">
        {icon}
      </div>
    </div>
  )
}

export default App;
