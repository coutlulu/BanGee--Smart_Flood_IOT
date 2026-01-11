'use client';



import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

import { AlertTriangle, Volume2, Activity, Wifi, WifiOff, Droplets, CloudRain, Sun, Lightbulb, Waves, Zap, Info } from 'lucide-react';



export default function Dashboard() {

  const [current, setCurrent] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [isConnected, setIsConnected] = useState(true);

  const [droplets, setDroplets] = useState([]);




  useEffect(() => {

    const fetchData = async () => {

      const { data: latest } = await supabase.from('flood_logs').select('*').order('created_at', { ascending: false }).limit(1);

      const { data: graphData } = await supabase.from('flood_logs').select('created_at, river_level, tank1_level, tank2_level, flow_rate1, flow_rate2').order('created_at', { ascending: false }).limit(30);



      if (latest && latest.length > 0) {

        setCurrent(latest[0]);

        const lastUpdate = new Date(latest[0].created_at).getTime();

        const now = new Date().getTime();

        setIsConnected((now - lastUpdate) < 15000);

      }



      if (graphData) {

        const formattedHistory = graphData.reverse().map(item => ({

          ...item,

          time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        }));

        setHistory(formattedHistory);

      }

      setLoading(false);

    };



    fetchData();

    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);

  }, []);



  // Rain Animation

  useEffect(() => {

    if (current?.rain_status === "RAINING") {

      const newDroplets = Array(12).fill(0).map((_, i) => ({

        id: Date.now() + i,

        left: Math.random() * 100,

        delay: Math.random() * 2,

        duration: 2 + Math.random() * 2

      }));

      setDroplets(newDroplets);

    } else {

      setDroplets([]);

    }

  }, [current?.rain_status]);






  const togglePump = async (state) => {

    await supabase.from('command_queue').insert({ command_type: state ? "PUMP_ON" : "PUMP_OFF" });

    alert(state ? "MANUAL OVERRIDE: ON" : "RETURNING TO AUTO MODE");

  };



  if (loading || !current) {

    return (

      <div className="bg-slate-950 h-screen text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-2xl font-bold">Loading BanGee System...</p>

          <p className="text-sm text-slate-400 mt-2">Initializing flood defense protocols</p>

        </div>

      </div>

    );

  }



  const isRaining = current.rain_status === "RAINING";

  const isPumpOn = current.status.includes("MANUAL") || current.status.includes("PUMPING OUT");

  const isCritical = current.status.includes("FLOOD") || current.status.includes("CRITICAL");

  const bgClass = isRaining ? "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" : "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50";

  const textClass = isRaining ? "text-slate-200" : "text-slate-800";



  return (

    <main className={`min-h-screen ${bgClass} ${textClass} p-4 md:p-6 font-sans relative overflow-hidden transition-all duration-1000`}>

      

      {/* Background Weather Elements */}

      <div className="absolute top-8 right-8 z-20">

        {!isRaining ? (

          <div className="relative">

            <Sun size={90} className="text-yellow-400 animate-pulse" style={{ filter: 'drop-shadow(0 0 25px rgba(251, 191, 36, 0.8))', animation: 'spin 20s linear infinite' }} />

            <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-20 blur-xl animate-pulse"></div>

          </div>

        ) : (

          <div className="relative">

            <CloudRain size={90} className="text-blue-300" style={{ filter: 'drop-shadow(0 0 20px rgba(147, 197, 253, 0.6))', animation: 'bounce 2s ease-in-out infinite' }} />

            <Zap size={30} className="absolute top-10 left-12 text-yellow-300 animate-ping" />

          </div>

        )}

      </div>

{/* Background Animation */}

<div className="absolute inset-0 opacity-10 pointer-events-none">

  <img 

    src="https://media.giphy.com/media/3o7TKSx0g7RqRniGFG/giphy.gif" 

    alt="water waves" 

    className="w-full h-full object-cover"

  />

</div>

      {droplets.map(drop => (

        <div key={drop.id} className="absolute w-1 h-12 bg-gradient-to-b from-blue-300 via-blue-400 to-transparent rounded-full opacity-70" style={{ left: `${drop.left}%`, top: '-60px', animation: `fall ${drop.duration}s linear ${drop.delay}s infinite`, boxShadow: '0 0 3px rgba(59, 130, 246, 0.5)' }} />

      ))}



      {isCritical && (

        <div className="floating-alert absolute top-20 left-10 z-30">

          <AlertTriangle size={56} className="text-red-500 animate-bounce" style={{ filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.9))' }} />

          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap animate-pulse">

            FLOOD ALERT!

          </div>

        </div>

      )}






      <div className="relative z-10 max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 pb-6 border-b-2" style={{ borderColor: isRaining ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)' }}>

          <div>

            <h1 className={`text-4xl md:text-5xl font-extrabold ${isRaining ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700'}`} style={{ textShadow: isRaining ? '0 0 30px rgba(59, 130, 246, 0.3)' : '0 0 20px rgba(59, 130, 246, 0.2)' }}>

              BanGee System

            </h1>

            <p className={`${isRaining ? 'text-slate-400' : 'text-slate-600'} text-sm mt-2 flex items-center gap-2 font-semibold`}>

              <Activity size={18} className="text-blue-500 animate-pulse" /> Intelligent Flood Defense and Monitoring

            </p>

          </div>

          <div className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 backdrop-blur-md shadow-lg ${isRaining ? 'border-slate-600 bg-slate-900/90' : 'border-slate-400 bg-white/90'}`}>

            {isConnected ? (

              <>

                <Wifi size={22} className="text-emerald-500 animate-pulse" />

                <span className="font-bold text-emerald-500 text-sm tracking-wide">ONLINE</span>

              </>

            ) : (

              <>

                <WifiOff size={22} className="text-red-500 animate-pulse" />

                <span className="font-bold text-red-500 text-sm tracking-wide">DISCONNECTED</span>

              </>

            )}

          </div>

          <div className={`px-6 py-3 rounded-full border-2 backdrop-blur-md font-bold tracking-wider text-sm shadow-lg ${isCritical ? "bg-red-500/30 border-red-400 text-red-300 animate-pulse" : isRaining ? "bg-emerald-900/50 border-emerald-400 text-emerald-300" : "bg-emerald-500/30 border-emerald-600 text-emerald-700"}`}>

            {current.status}

          </div>

        </div>

	        {/* ALERTS ROW */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          <SirenVisualization active={current.buzzer_state} isRaining={isRaining} />

          <LedVisualization color={current.led_color} isRaining={isRaining} />

        </div>


        {/* MAIN VISUALIZATION ROW */}

        <div className={`mb-6 p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

          <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${isRaining ? 'text-slate-200' : 'text-slate-800'}`}>

            <Waves size={28} className="text-blue-500" />

            Water Management System

          </h3>

          <WaterFlowSystem

            riverLevel={current.river_level}

            tank1Level={current.tank1_level}

            tank2Level={current.tank2_level}

            isPumpOn={isPumpOn}

            valve1Open={current.valve1_state > 0}

            valve2Open={current.valve2_state > 0}

            flow1={current.flow_rate1}

            flow2={current.flow_rate2}

            isRaining={isRaining}

          />

        </div>



        {/* DRAINAGE PIPES ROW */}

        <div className={`mb-6 p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

          <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${isRaining ? 'text-slate-200' : 'text-slate-800'}`}>

            <Droplets size={28} className={isPumpOn ? "text-blue-500 animate-pulse" : "text-slate-500"} />

            Drainage Pump System

          </h3>

          <PumpVisualization

            isPumpOn={isPumpOn}

            isRaining={isRaining}

            flow1={current.flow_rate1}

            flow2={current.flow_rate2}

          />

        </div>



        {/* GRAPHS ROW */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* TANK HISTORY */}

          <div className={`p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

            <h3 className={`${isRaining ? 'text-slate-300' : 'text-slate-700'} text-lg font-bold mb-4 flex items-center gap-2`}>

              <Activity size={20} className="text-blue-500" />

              Tank Levels History

            </h3>

            <div className="h-64">

              <ResponsiveContainer width="100%" height="100%">

                <AreaChart data={history}>

                  <defs>

                    <linearGradient id="colorRiver" x1="0" y1="0" x2="0" y2="1">

                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />

                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />

                    </linearGradient>

                    <linearGradient id="colorTank1" x1="0" y1="0" x2="0" y2="1">

                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />

                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />

                    </linearGradient>

                    <linearGradient id="colorTank2" x1="0" y1="0" x2="0" y2="1">

                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />

                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />

                    </linearGradient>

                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={isRaining ? "#334155" : "#cbd5e1"} />

                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: isRaining ? '#94a3b8' : '#64748b' }} />

                  <YAxis tick={{ fill: isRaining ? '#94a3b8' : '#64748b' }} />

                  <Tooltip contentStyle={{ backgroundColor: isRaining ? '#0f172a' : '#ffffff', border: '2px solid #3b82f6', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} />

                  <Legend verticalAlign="top" height={36} />

                  <Area type="monotone" dataKey="river_level" name="River" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRiver)" strokeWidth={3} />

                  <Area type="monotone" dataKey="tank1_level" name="Tank 1" stroke="#10b981" fillOpacity={1} fill="url(#colorTank1)" strokeWidth={2} />

                  <Area type="monotone" dataKey="tank2_level" name="Tank 2" stroke="#06b6d4" fillOpacity={1} fill="url(#colorTank2)" strokeWidth={2} />

                </AreaChart>

              </ResponsiveContainer>

            </div>

          </div>



          {/* FLOW PERFORMANCE */}

          <div className={`p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

            <h3 className={`${isRaining ? 'text-slate-300' : 'text-slate-700'} text-lg font-bold mb-4 flex items-center gap-2`}>

              <Droplets size={20} className="text-cyan-500" />

              Flow Performance

            </h3>

            <div className="h-64">

              <ResponsiveContainer width="100%" height="100%">

                <LineChart data={history}>

                  <CartesianGrid strokeDasharray="3 3" stroke={isRaining ? "#334155" : "#cbd5e1"} />

                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: isRaining ? '#94a3b8' : '#64748b' }} />

                  <YAxis tick={{ fill: isRaining ? '#94a3b8' : '#64748b' }} />

                  <Tooltip contentStyle={{ backgroundColor: isRaining ? '#0f172a' : '#ffffff', border: '2px solid #06b6d4', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} />

                  <Legend verticalAlign="top" height={36} />

                  <Line type="monotone" dataKey="flow_rate1" name="Drain 1" stroke="#10b981" strokeWidth={3} dot={false} />

                  <Line type="monotone" dataKey="flow_rate2" name="Drain 2" stroke="#06b6d4" strokeWidth={3} dot={false} />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>






        {/* BUTTON CONTROLS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <button

            onClick={() => togglePump(true)}

            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-6 rounded-2xl shadow-2xl hover:shadow-red-500/50 active:scale-98 transition-all border-2 border-red-500 text-lg"

          >

            <span className="flex items-center justify-center gap-3">

              <Zap size={24} />

              FORCE PUMP ON

            </span>

          </button>

          <button

            onClick={() => togglePump(false)}

            className={`font-bold py-6 rounded-2xl shadow-2xl active:scale-98 transition-all border-2 text-lg ${isRaining ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white border-slate-600' : 'bg-gradient-to-r from-slate-300 to-slate-400 hover:from-slate-400 hover:to-slate-500 text-slate-800 border-slate-500'}`}

          >

            <span className="flex items-center justify-center gap-3">

              <Activity size={24} />

              AUTO MODE / OFF

            </span>

          </button>

        </div>

      </div>



      <style jsx>{`

        @keyframes fall { to { transform: translateY(100vh); } }

        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .floating-item { transition: all 0.3s ease; }

        .floating-item:hover { transform: scale(1.3) !important; }

      `}</style>

    </main>

  );

}



// --- SUB COMPONENTS ---



function WaterFlowSystem({ riverLevel, tank1Level, tank2Level, isPumpOn, valve1Open, valve2Open, flow1, flow2, isRaining }) {

  const riverPercent = Math.min((riverLevel / 1000) * 100, 100);

  const tank1Percent = Math.min((tank1Level / 1000) * 100, 100);

  const tank2Percent = Math.min((tank2Level / 1000) * 100, 100);



  return (

    <div className="relative flex flex-col items-center gap-8">

      {/* RIVER CONTAINER */}

      <div className="flex flex-col items-center">

        <h4 className={`text-sm font-bold mb-2 ${isRaining ? 'text-slate-400' : 'text-slate-600'}`}>RIVER LEVEL</h4>

        <div className="relative w-48 h-64 border-4 rounded-2xl overflow-hidden shadow-xl" style={{ borderColor: isRaining ? '#475569' : '#cbd5e1', backgroundColor: isRaining ? '#1e293b' : '#f1f5f9' }}>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 transition-all duration-1000 ease-out" style={{ height: `${riverPercent}%` }}>

            <div className="absolute top-0 left-0 right-0 h-4 bg-white/30" style={{ animation: 'wave 2s ease-in-out infinite' }}></div>

           {Array(6).fill(0).map((_, i) => (

              <div key={i} className="bubble" style={{ left: `${20 + i * 15}%`, animationDelay: `${i * 0.3}s` }}></div>

            ))}

          </div>

          <div className="absolute inset-0 flex items-center justify-center">

            <span className={`text-5xl font-bold z-10 ${riverPercent > 50 ? 'text-white' : isRaining ? 'text-slate-400' : 'text-slate-600'}`}>

              {riverPercent.toFixed(0)}%

            </span>

          </div>

        </div>

      </div>



      {/* CENTRAL PUMP */}

      <div className="relative my-4">

        <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center shadow-2xl ${isPumpOn ? 'border-blue-500 bg-blue-500/30' : isRaining ? 'border-slate-600 bg-slate-800/30' : 'border-slate-400 bg-slate-200/30'}`} style={{ animation: isPumpOn ? 'spin 2s linear infinite' : 'none' }}>

          <Droplets size={56} className={isPumpOn ? "text-blue-500" : "text-slate-500"} />

        </div>

        {isPumpOn && (

          <>

            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75"></div>

            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">

              PUMPING

            </div>

          </>

        )}

      </div>



      {/* TANKS ROW */}

      <div className="flex gap-16 items-start">

        {/* TANK 1 */}

        <div className="flex flex-col items-center">

          <div className={`w-4 h-24 rounded-full border-2 mb-2 relative overflow-hidden ${valve1Open ? 'border-emerald-500 bg-emerald-500/20' : isRaining ? 'border-slate-600 bg-slate-800' : 'border-slate-400 bg-slate-200'}`}>

            {valve1Open && (

              <>

                <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-cyan-400 animate-pulse"></div>

                {Array(3).fill(0).map((_, i) => (

                  <div key={i} className="flow-drop" style={{ animationDelay: `${i * 0.4}s` }}></div>

                ))}

              </>

            )}

          </div>

          <h4 className={`text-sm font-bold mb-2 ${isRaining ? 'text-slate-400' : 'text-slate-600'}`}>TANK 1</h4>

          <div className="relative w-40 h-56 border-4 rounded-2xl overflow-hidden shadow-xl" style={{ borderColor: isRaining ? '#475569' : '#cbd5e1', backgroundColor: isRaining ? '#1e293b' : '#f1f5f9' }}>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-400 transition-all duration-1000 ease-out" style={{ height: `${tank1Percent}%` }}>

              <div className="absolute top-0 left-0 right-0 h-3 bg-white/30" style={{ animation: 'wave 2s ease-in-out infinite' }}></div>

              {valve1Open && Array(4).fill(0).map((_, i) => (

                <div key={i} className="bubble" style={{ left: `${25 + i * 20}%`, animationDelay: `${i * 0.4}s` }}></div>

              ))}

            </div>

            <div className="absolute inset-0 flex items-center justify-center">

              <span className={`text-4xl font-bold z-10 ${tank1Percent > 50 ? 'text-white' : isRaining ? 'text-slate-400' : 'text-slate-600'}`}>

                {tank1Percent.toFixed(0)}%

              </span>

            </div>

          </div>

        </div>



        {/* TANK 2 */}

        <div className="flex flex-col items-center">

          <div className={`w-4 h-24 rounded-full border-2 mb-2 relative overflow-hidden ${valve2Open ? 'border-cyan-500 bg-cyan-500/20' : isRaining ? 'border-slate-600 bg-slate-800' : 'border-slate-400 bg-slate-200'}`}>

            {valve2Open && (

              <>

                <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-cyan-400 animate-pulse"></div>

                {Array(3).fill(0).map((_, i) => (

                  <div key={i} className="flow-drop" style={{ animationDelay: `${i * 0.4}s` }}></div>

                ))}

              </>

            )}

          </div>

          <h4 className={`text-sm font-bold mb-2 ${isRaining ? 'text-slate-400' : 'text-slate-600'}`}>TANK 2</h4>

          <div className="relative w-40 h-56 border-4 rounded-2xl overflow-hidden shadow-xl" style={{ borderColor: isRaining ? '#475569' : '#cbd5e1', backgroundColor: isRaining ? '#1e293b' : '#f1f5f9' }}>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-700 via-cyan-500 to-cyan-400 transition-all duration-1000 ease-out" style={{ height: `${tank2Percent}%` }}>

              <div className="absolute top-0 left-0 right-0 h-3 bg-white/30" style={{ animation: 'wave 2s ease-in-out infinite' }}></div>

              {valve2Open && Array(4).fill(0).map((_, i) => (

                <div key={i} className="bubble" style={{ left: `${25 + i * 20}%`, animationDelay: `${i * 0.4}s` }}></div>

              ))}

            </div>

            <div className="absolute inset-0 flex items-center justify-center">

              <span className={`text-4xl font-bold z-10 ${tank2Percent > 50 ? 'text-white' : isRaining ? 'text-slate-400' : 'text-slate-600'}`}>

                {tank2Percent.toFixed(0)}%

              </span>

            </div>

          </div>

        </div>

      </div>

      

      <style jsx>{`

        .bubble { position: absolute; bottom: 0; width: 10px; height: 10px; background: white; border-radius: 50%; opacity: 0.6; animation: rise 3s ease-in infinite; }

        .flow-drop { position: absolute; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: white; border-radius: 50%; animation: drop 1s linear infinite; }

        @keyframes rise { 0% { bottom: 0; opacity: 0.6; transform: scale(1); } 100% { bottom: 100%; opacity: 0; transform: scale(0.5); } }

        @keyframes drop { 0% { top: 0; opacity: 1; } 100% { top: 100%; opacity: 0; } }

        @keyframes wave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

      `}</style>

    </div>

  );

}



function PumpVisualization({ isPumpOn, isRaining, flow1, flow2 }) {

  return (

    <div className="flex flex-col md:flex-row items-center justify-center gap-8">

      <div className="flex flex-col gap-4 w-full md:w-auto">

        <FlowPipe label="DRAIN 1" flow={flow1} active={isPumpOn} isRaining={isRaining} />

        <FlowPipe label="DRAIN 2" flow={flow2} active={isPumpOn} isRaining={isRaining} />

      </div>

    </div>

  );

}



function FlowPipe({ label, flow, active, isRaining }) {

  return (

    <div className="flex items-center gap-4 w-full">

      <span className={`text-xs font-bold w-20 ${isRaining ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>

      <div className={`flex-1 h-10 rounded-full border-2 overflow-hidden relative ${isRaining ? 'border-slate-600 bg-slate-800' : 'border-slate-400 bg-slate-200'}`}>

        {active && (

          <>

            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse"></div>

            <div className="flow-particle"></div>

            <div className="flow-particle" style={{ animationDelay: '0.5s' }}></div>

            <div className="flow-particle" style={{ animationDelay: '1s' }}></div>

          </>

        )}

      </div>

      <span className={`text-lg font-bold w-24 text-right ${active ? 'text-blue-500' : isRaining ? 'text-slate-600' : 'text-slate-400'}`}>

        {flow.toFixed(1)} <span className="text-xs">L/min</span>

      </span>

      <style jsx>{`

        .flow-particle { position: absolute; left: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 6px; background: white; border-radius: 4px; animation: flow 1.5s linear infinite; }

        @keyframes flow { 0% { left: -20px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 105%; opacity: 0; } }

      `}</style>

    </div>

  );

}



function SirenVisualization({ active, isRaining }) {

  return (

    <div className={`p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Volume2 size={36} className={active ? "text-red-500 animate-bounce" : "text-slate-500"} />

          <div>

            <h3 className={`text-lg font-bold ${isRaining ? 'text-slate-300' : 'text-slate-700'}`}>EMERGENCY SIREN</h3>

            <p className={`text-sm ${isRaining ? 'text-slate-500' : 'text-slate-600'}`}>Status: <span className={active ? "text-red-500 font-bold" : ""}>{active ? "ACTIVE - WARNING" : "Standby"}</span></p>

          </div>

        </div>

        {active && (

          <div className="flex gap-1 h-12 items-end">

            {[...Array(6)].map((_, i) => (

              <div key={i} className="w-2 bg-red-500 rounded-t-full" style={{ animation: `soundWave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.1}s`, height: '100%' }}></div>

            ))}

          </div>

        )}

      </div>

      <style jsx>{` @keyframes soundWave { 0%, 100% { height: 20%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } } `}</style>

    </div>

  );

}



function LedVisualization({ color, isRaining }) {

  const ledGlow = color === 'RED' ? 'shadow-red-500 bg-red-500' : color === 'BLUE' ? 'shadow-yellow-500 bg-yellow-500' : 'shadow-emerald-500 bg-emerald-500';

  const borderColor = isRaining ? 'border-slate-600' : 'border-slate-300';

  

  return (

    <div className={`p-6 rounded-3xl border-2 backdrop-blur-md shadow-2xl flex items-center justify-between ${isRaining ? 'bg-slate-900/90 border-slate-600' : 'bg-white/90 border-slate-300'}`}>

      <div className="flex items-center gap-4">

        <Lightbulb size={36} className={isRaining ? 'text-slate-400' : 'text-slate-600'} />

        <div>

          <h3 className={`text-lg font-bold ${isRaining ? 'text-slate-300' : 'text-slate-700'}`}>SYSTEM INDICATOR</h3>

          <p className={`text-sm ${isRaining ? 'text-slate-500' : 'text-slate-600'}`}>Color Code: <span className={`font-bold ${color === 'RED' ? 'text-red-500' : color === 'BLUE' ? 'text-blue-500' : 'text-emerald-500'}`}>{color}</span></p>

        </div>

      </div>

      <div className={`w-16 h-16 rounded-full border-4 ${borderColor} ${ledGlow} shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-all duration-500 relative`}>

        <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>

      </div>

    </div>

  );

}
