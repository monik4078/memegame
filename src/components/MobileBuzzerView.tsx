import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import logoImg from '../../Logo/logo.png';

interface MobileBuzzerViewProps {
  sessionCode: string;
  teamIdFromUrl?: string;
  teamNameFromUrl?: string;
  teamEmojiFromUrl?: string;
}

export const MobileBuzzerView: React.FC<MobileBuzzerViewProps> = ({
  sessionCode,
  teamIdFromUrl,
  teamNameFromUrl,
  teamEmojiFromUrl,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem(`gv_buzzer_name_${sessionCode.toUpperCase()}`) || '';
  });
  const [isJoined, setIsJoined] = useState(() => {
    return !!localStorage.getItem(`gv_buzzer_name_${sessionCode.toUpperCase()}`);
  });

  const [sessionStatus, setSessionStatus] = useState<'playing' | 'lobby' | 'ended'>('playing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzRank, setBuzzRank] = useState<number | null>(null);
  const [buzzTime, setBuzzTime] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [teamInfo] = useState<{ id?: string; name?: string; emoji?: string }>({
    id: teamIdFromUrl,
    name: teamNameFromUrl,
    emoji: teamEmojiFromUrl,
  });

  const channelRef = useRef<any>(null);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isJoinedRef = useRef(isJoined);
  const playerNameRef = useRef(playerName);
  const hasAnnouncedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isJoinedRef.current = isJoined; }, [isJoined]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  // Connect to Supabase Realtime Channel for this session (ONCE)
  useEffect(() => {
    if (!sessionCode) return;

    const channelName = `session_${sessionCode.toUpperCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'question_change' }, (payload) => {
        console.log('[MobileBuzzer] Question changed:', payload);
        if (payload?.payload?.questionIndex !== undefined) {
          setCurrentQuestionIndex(payload.payload.questionIndex);
        }
        // Reset buzz state for new question
        setHasBuzzed(false);
        setBuzzRank(null);
        setBuzzTime(null);
      })
      .on('broadcast', { event: 'session_status' }, (payload) => {
        console.log('[MobileBuzzer] Session status changed:', payload);
        if (payload?.payload?.status) {
          setSessionStatus(payload.payload.status);
        }
      })
      .on('broadcast', { event: 'game_locked' }, () => {
        // Host has started the game — block any new joins
        if (!isJoinedRef.current) {
          setErrorMsg('🔒 The game has already started. You can no longer join this session.');
          setJoining(false);
        }
      })
      .on('broadcast', { event: 'buzz_ack' }, (payload) => {
        // Host acknowledged buzz rank
        if (payload?.payload?.playerName?.toLowerCase() === playerNameRef.current.trim().toLowerCase() && payload?.payload?.rank) {
          setBuzzRank(payload.payload.rank);
        }
      })
      .on('broadcast', { event: 'name_rejected' }, (payload) => {
        // Host rejected duplicate name (or game locked)
        if (payload?.payload?.playerName?.toLowerCase() === playerNameRef.current.trim().toLowerCase()) {
          if (joinTimeoutRef.current) { clearTimeout(joinTimeoutRef.current); joinTimeoutRef.current = null; }
          setJoining(false);
          setIsJoined(false);
          localStorage.removeItem(`gv_buzzer_name_${sessionCode.toUpperCase()}`);
          const reason = payload?.payload?.reason;
          if (reason === 'Game started') {
            setErrorMsg('🔒 The game has already started. You can no longer join this session.');
          } else {
            setErrorMsg(`⚠️ Name "${playerNameRef.current.trim()}" is already taken by another player. Please enter a different name.`);
          }
        }
      })
      .on('broadcast', { event: 'player_approved' }, (payload) => {
        if (payload?.payload?.playerName?.toLowerCase() === playerNameRef.current.trim().toLowerCase()) {
          if (joinTimeoutRef.current) { clearTimeout(joinTimeoutRef.current); joinTimeoutRef.current = null; }
          setJoining(false);
          setIsJoined(true);
          localStorage.setItem(`gv_buzzer_name_${sessionCode.toUpperCase()}`, playerNameRef.current.trim());
        }
      })
      .subscribe((status) => {
        console.log(`[MobileBuzzer] Supabase channel status for ${channelName}:`, status);
        // Only re-announce on INITIAL page load if already joined from localStorage (page refresh case)
        if (status === 'SUBSCRIBED' && !hasAnnouncedRef.current && isJoinedRef.current && playerNameRef.current.trim()) {
          hasAnnouncedRef.current = true;
          channel.send({
            type: 'broadcast',
            event: 'player_rejoin',
            payload: {
              playerName: playerNameRef.current.trim(),
              teamId: teamInfo.id,
              teamName: teamInfo.name,
              teamEmoji: teamInfo.emoji,
            },
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode, teamInfo]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    if (!cleanName) {
      setErrorMsg('Please enter your name to continue.');
      return;
    }
    setErrorMsg(null);
    setJoining(true);

    // Clear any previous join timeout
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }

    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'player_join',
          payload: {
            playerName: cleanName,
            teamId: teamInfo.id,
            teamName: teamInfo.name,
            teamEmoji: teamInfo.emoji,
          },
        });

        // Wait for host to approve or reject (up to 10 seconds).
        // If no response, show a message asking to try again.
        joinTimeoutRef.current = setTimeout(() => {
          // Only fire if still in joining state (not yet approved/rejected)
          setJoining((prev) => {
            if (prev) {
              setErrorMsg('⏳ No response from the game host. Make sure the host has the game lobby or game screen open, then try again.');
            }
            return false;
          });
        }, 10000);
      } catch (err) {
        console.error('Error sending join signal:', err);
        setJoining(false);
        setErrorMsg('❌ Could not connect to the game session. Please check your internet connection and try again.');
      }
    } else {
      setJoining(false);
      setErrorMsg('❌ Not connected to the game session channel. Please refresh the page and try again.');
    }
  };

  const handleBuzz = async () => {
    if (hasBuzzed || sessionStatus === 'ended') return;

    setHasBuzzed(true);
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBuzzTime(timeStr);

    const payload = {
      id: Math.random().toString(36).substring(2, 9),
      playerName: playerName.trim(),
      teamId: teamInfo.id,
      teamName: teamInfo.name,
      teamEmoji: teamInfo.emoji,
      timestamp: now,
      questionIndex: currentQuestionIndex,
    };

    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'player_buzz',
          payload,
        });
      } catch (err) {
        console.error('Error sending buzz signal:', err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950 text-white font-sans select-none relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40"
        style={{
          background: `
            radial-gradient(circle at 50% 30%, rgba(168,85,247,0.3) 0%, transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(236,72,153,0.2) 0%, transparent 50%),
            #0a0a1a
          `
        }}
      />

      {/* Header Container */}
      <div className="w-full max-w-md mx-auto text-center pt-2 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg shadow-md" />
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Guess What?
          </span>
        </div>

        {/* Unique Game ID Display */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold shadow-sm mb-2">
          <span>🎮 Game ID:</span>
          <span className="text-white tracking-widest">{sessionCode.toUpperCase()}</span>
        </div>

        {/* Team Banner if Team Mode */}
        {teamInfo.name && (
          <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-200 text-xs font-bold">
            <span>{teamInfo.emoji || '👥'}</span>
            <span>Team: {teamInfo.name}</span>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="w-full max-w-md mx-auto my-auto py-6 relative z-10 flex flex-col items-center justify-center">
        {!isJoined ? (
          /* Step 1: Enter Player Name */
          <form onSubmit={handleJoin} className="w-full bg-slate-900/90 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-2xl space-y-4 animate-fadeIn">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <h2 className="text-xl font-bold text-white">Join Game Session</h2>
              <p className="text-xs text-white/50 mt-1">Enter your name to connect your phone as a live buzzer!</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs text-center font-semibold animate-shake">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Your Name</label>
              <input
                type="text"
                required
                disabled={joining}
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-base font-semibold outline-none focus:border-purple-500 transition-all text-center"
              />
            </div>

            <button
              type="submit"
              disabled={joining || !playerName.trim()}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-[0.98] shadow-lg cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.4)' }}
            >
              {joining ? 'Connecting to Session...' : 'Enter Game 🚀'}
            </button>
          </form>
        ) : sessionStatus === 'ended' ? (
          /* Game Session Ended Lockout */
          <div className="w-full bg-slate-900/90 border border-white/10 p-8 rounded-3xl text-center space-y-4 backdrop-blur-xl animate-fadeIn shadow-2xl">
            <div className="text-6xl mb-2">🏁</div>
            <h2 className="text-2xl font-black text-white">Game Over!</h2>
            <p className="text-sm text-white/60">
              This game session has completed. Thank you for playing!
            </p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40">
              The buzzer button is now disabled. Look at the main screen for final scores! 🏆
            </div>
          </div>
        ) : (
          /* Step 2: The Buzzer Screen with PERMANENT NAME LOCK */
          <div className="w-full flex flex-col items-center gap-6 animate-fadeIn">
            {/* Permanent Locked Player Name Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/40 text-xs shadow-md">
              <span className="text-purple-300 font-medium">Playing as:</span>
              <span className="font-extrabold text-white">{playerName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-semibold border border-purple-400/30">
                Locked 🔒
              </span>
            </div>

            {/* Giant BUZZER Button */}
            <button
              type="button"
              disabled={hasBuzzed || sessionStatus === 'ended'}
              onClick={handleBuzz}
              className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full flex flex-col items-center justify-center transition-all duration-200 select-none cursor-pointer ${
                hasBuzzed
                  ? 'bg-gradient-to-br from-green-500 to-emerald-700 shadow-[0_0_50px_rgba(34,197,94,0.5)] scale-95 opacity-90'
                  : 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 hover:from-red-400 hover:to-red-600 active:scale-90 shadow-[0_0_60px_rgba(239,68,68,0.6)] animate-pulse'
              }`}
              style={{
                border: hasBuzzed ? '8px solid #86efac' : '8px solid #fca5a5',
              }}
            >
              {hasBuzzed ? (
                <div className="flex flex-col items-center text-center p-4">
                  <span className="text-5xl mb-1">⚡</span>
                  <span className="text-2xl font-black tracking-wider text-white">BUZZED!</span>
                  <span className="text-xs font-semibold text-green-200 mt-2 bg-black/30 px-3 py-1 rounded-full">
                    {buzzRank ? `#${buzzRank} to Buzz` : 'Recorded ⏱️'}
                  </span>
                  {buzzTime && <span className="text-[10px] text-white/70 mt-1">{buzzTime}</span>}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-4">
                  <span className="text-6xl mb-1">🚨</span>
                  <span className="text-3xl font-black tracking-widest text-white drop-shadow-md">BUZZ!</span>
                  <span className="text-xs font-bold text-red-100 uppercase tracking-widest mt-2 bg-black/30 px-3 py-1 rounded-full">
                    Tap to Answer
                  </span>
                </div>
              )}
            </button>

            {/* Status Instructions */}
            <div className="text-center space-y-1">
              {hasBuzzed ? (
                <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-semibold max-w-xs">
                  ✅ Buzzer pressed for this question! Locked until next question.
                </div>
              ) : (
                <p className="text-xs text-white/50 font-medium">
                  Press as fast as you can when the question appears!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2 text-[11px] text-white/30 relative z-10">
        Guess What? Live Phone Buzzer • Session: {sessionCode}
      </div>
    </div>
  );
};
