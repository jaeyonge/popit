"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import DropCanvas, { ParticleItem } from "./DropCanvas";
import { DailyCampaign } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG, ReversalEvent } from "@/lib/scoring";
import { sounds, triggerHaptic } from "@/lib/feedback";
import { Volume2, VolumeX, Sparkles, Flame, Trophy, HelpCircle, ShieldAlert } from "lucide-react";

interface ShakeGameProps {
  campaign: DailyCampaign;
  todayTotal: number;
  playerId: string;
  onGameComplete: (data: {
    score: number;
    myBestScore: number;
    myRank: number;
    verified: boolean;
    stats: {
      validCount: number;
      goodCount: number;
      perfectCount: number;
      feverCount: number;
      jackpotCount: number;
    };
    reason?: string;
  }) => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
}

type GamePhase = "READY" | "COUNTDOWN" | "PLAYING" | "ENDED";

export default function ShakeGame({
  campaign,
  todayTotal,
  playerId,
  onGameComplete,
  onOpenLeaderboard,
  onOpenRules,
}: ShakeGameProps) {
  // Game state
  const [phase, setPhase] = useState<GamePhase>("READY");
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(15.0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [isFever, setIsFever] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [feedbackColor, setFeedbackColor] = useState<string>("text-yellow-400");
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [assetLoaded, setAssetLoaded] = useState<boolean>(false);
  const [disqualifiedMsg, setDisqualifiedMsg] = useState<string | null>(null);

  // Session & Physics refs
  const sessionDataRef = useRef<{
    sessionId: string;
    signedToken: string;
    jackpotIndex: number;
  } | null>(null);

  const particlesRef = useRef<ParticleItem[]>([]);
  const dropImageRef = useRef<HTMLImageElement | null>(null);

  // Physics & Shake Tracking
  const containerRef = useRef<HTMLDivElement | null>(null);
  const objectRef = useRef<HTMLDivElement | null>(null);

  const isGrippingRef = useRef<boolean>(false);
  const pointerXRef = useRef<number>(0.5); // normalized 0.0 ~ 1.0
  const objectXRef = useRef<number>(0.5);
  const objectVelocityRef = useRef<number>(0);
  const objectRotationRef = useRef<number>(0);

  // Reversal scoring detection refs
  const reversalsRef = useRef<ReversalEvent[]>([]);
  const gameStartTimestampRef = useRef<number>(0);
  const lastDirectionRef = useRef<"left" | "right" | null>(null);
  const reversalStartXRef = useRef<number>(0.5);
  const reversalStartTimeRef = useRef<number>(0);
  const reversalPeakVelRef = useRef<number>(0);
  const lastScoredTimeRef = useRef<number>(0);
  const comboDecayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feverEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const validShakeCounterRef = useRef<number>(0);
  const consecutiveGoodPerfectRef = useRef<number>(0);

  // Preload image for canvas particles
  useEffect(() => {
    const img = new window.Image();
    img.src = campaign.dropAssetUrl;
    img.onload = () => {
      dropImageRef.current = img;
      setAssetLoaded(true);
    };
    img.onerror = () => {
      setAssetLoaded(true); // graceful fallback
    };
  }, [campaign.dropAssetUrl]);

  // Tab visibility detection (PRD Section 35)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === "PLAYING") {
        setDisqualifiedMsg("화면을 벗어나 기록이 저장되지 않았어요.");
        setPhase("ENDED");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase]);

  // Audio mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  // Helper to spawn particle drops
  const spawnDrops = useCallback(
    (count: number, originX: number, originY: number, power: number = 1.0) => {
      if (!dropImageRef.current) return;
      const drops: ParticleItem[] = [];
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const speed = (400 + Math.random() * 500) * power;
        drops.push({
          x: originX + (Math.random() - 0.5) * 40,
          y: originY + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 10,
          scale: 0.7 + Math.random() * 0.4,
          alpha: 1.0,
          image: dropImageRef.current,
        });
      }
      particlesRef.current.push(...drops);
    },
    []
  );

  // Trigger feedback banner
  const triggerVisualFeedback = (text: string, color: string) => {
    setFeedbackText(text);
    setFeedbackColor(color);
    setTimeout(() => {
      setFeedbackText((curr) => (curr === text ? null : curr));
    }, 450);
  };

  // Spring & Inertia Animation Loop (PRD Section 17 & 32: elapsed time based)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      // Spring tracking target pointerX
      const targetX = isGrippingRef.current ? pointerXRef.current : 0.5;
      const k = 28; // spring stiffness
      const damping = 9; // damping factor

      const force = (targetX - objectXRef.current) * k;
      objectVelocityRef.current = (objectVelocityRef.current + force * dt) * Math.exp(-damping * dt);
      objectXRef.current += objectVelocityRef.current * dt;

      // Dynamic tilt rotation based on velocity (PRD Section 17: spring & inertia)
      const targetRotation = -objectVelocityRef.current * 42; // degrees
      objectRotationRef.current += (targetRotation - objectRotationRef.current) * Math.min(dt * 15, 1);

      // Apply transform to DOM element
      if (objectRef.current && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const pixelOffset = (objectXRef.current - 0.5) * containerWidth;
        objectRef.current.style.transform = `translateX(${pixelOffset}px) rotate(${objectRotationRef.current}deg)`;
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Score & Drop Evaluation from Reversal
  const handleScoredReversal = useCallback(
    (
      grade: "VALID" | "GOOD" | "PERFECT",
      displacement: number,
      velocity: number,
      direction: "left_to_right" | "right_to_left",
      relativeTimeMs: number
    ) => {
      const config = DEFAULT_SCORING_CONFIG;

      // 120ms guard
      if (relativeTimeMs - lastScoredTimeRef.current < config.reversalCooldownMs) {
        return;
      }
      lastScoredTimeRef.current = relativeTimeMs;

      // Record reversal for server validation
      reversalsRef.current.push({
        relativeTimestampMs: Math.round(relativeTimeMs),
        displacement: Number(displacement.toFixed(4)),
        peakVelocity: Number(velocity.toFixed(3)),
        direction,
      });

      validShakeCounterRef.current += 1;
      const shakeIdx = validShakeCounterRef.current;

      // Reset / Extend combo decay
      if (comboDecayTimerRef.current) clearTimeout(comboDecayTimerRef.current);
      comboDecayTimerRef.current = setTimeout(() => {
        setCombo(0);
        consecutiveGoodPerfectRef.current = 0;
      }, config.comboTimeoutMs);

      // Determine base drops
      let dropsToAdd = 1;
      if (grade === "PERFECT") {
        dropsToAdd = 3;
        consecutiveGoodPerfectRef.current += 1;
        setCombo((c) => c + 1);
        triggerVisualFeedback("PERFECT!", "text-yellow-300 scale-110 drop-shadow-[0_0_12px_rgba(253,224,71,0.8)]");
        sounds.playPerfect();
        triggerHaptic("perfect");
      } else if (grade === "GOOD") {
        dropsToAdd = 2;
        consecutiveGoodPerfectRef.current += 1;
        setCombo((c) => c + 1);
        triggerVisualFeedback("GOOD!", "text-cyan-300");
        sounds.playDrop();
        triggerHaptic("valid");
      } else {
        // VALID preserves combo, doesn't increment
        dropsToAdd = 1;
        sounds.playDrop();
        triggerHaptic("valid");
      }

      // Fever check (PRD Section 13: 8 good/perfect combos -> 1.5s Fever)
      if (consecutiveGoodPerfectRef.current >= config.feverThreshold) {
        setIsFever(true);
        consecutiveGoodPerfectRef.current = 0;
        triggerVisualFeedback("🔥 FEVER! 🔥", "text-orange-400 animate-pulse-fast");
        sounds.playFever();
        triggerHaptic("fever");

        if (feverEndTimerRef.current) clearTimeout(feverEndTimerRef.current);
        feverEndTimerRef.current = setTimeout(() => {
          setIsFever(false);
        }, config.feverDurationMs);
      }

      if (isFever) {
        dropsToAdd += 1; // +1 Fever bonus
      }

      // Jackpot check (PRD Section 14: Server Seeded 6~12th shake -> +5 drops burst)
      const targetJackpot = sessionDataRef.current?.jackpotIndex || 9;
      if (shakeIdx === targetJackpot) {
        dropsToAdd += config.jackpotReward;
        triggerVisualFeedback("✨ JACKPOT! ✨", "text-yellow-200 font-extrabold scale-125");
        sounds.playJackpot();
        triggerHaptic("jackpot");
      }

      setScore((s) => s + dropsToAdd);

      // Visual particle drops
      if (objectRef.current) {
        const rect = objectRef.current.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height * 0.4;
        spawnDrops(dropsToAdd, originX, originY, grade === "PERFECT" ? 1.4 : 1.0);
      }
    },
    [isFever, spawnDrops]
  );

  // Pointer Movement & Reversal Math (PRD Section 7, 8, 9)
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current || phase !== "PLAYING") return;
      const rect = containerRef.current.getBoundingClientRect();
      const normalizedX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const now = performance.now();
      const relativeTime = now - gameStartTimestampRef.current;

      const prevX = pointerXRef.current;
      pointerXRef.current = normalizedX;

      const deltaX = normalizedX - prevX;
      const dt = Math.max((now - reversalStartTimeRef.current) / 1000, 0.001);

      if (Math.abs(deltaX) < 0.002) return; // ignore micro-jitter

      const currentDir = deltaX > 0 ? "right" : "left";
      const instantVelocity = Math.abs(deltaX) / (dt || 0.016);
      if (instantVelocity > reversalPeakVelRef.current) {
        reversalPeakVelRef.current = instantVelocity;
      }

      // Check Direction Reversal
      if (lastDirectionRef.current && lastDirectionRef.current !== currentDir) {
        const displacement = Math.abs(normalizedX - reversalStartXRef.current);
        const peakVel = reversalPeakVelRef.current;
        const config = DEFAULT_SCORING_CONFIG;

        // Grade evaluation
        let grade: "VALID" | "GOOD" | "PERFECT" | null = null;
        if (displacement >= config.perfectAmplitude && peakVel >= config.perfectVelocity) {
          grade = "PERFECT";
        } else if (displacement >= config.goodAmplitude && peakVel >= config.goodVelocity) {
          grade = "GOOD";
        } else if (displacement >= config.validAmplitude && peakVel >= config.validVelocity) {
          grade = "VALID";
        }

        if (grade) {
          handleScoredReversal(
            grade,
            displacement,
            peakVel,
            lastDirectionRef.current === "left" ? "left_to_right" : "right_to_left",
            relativeTime
          );
        }

        // Reset tracking for new swing
        reversalStartXRef.current = normalizedX;
        reversalStartTimeRef.current = now;
        reversalPeakVelRef.current = 0;
      }

      lastDirectionRef.current = currentDir;
    },
    [phase, handleScoredReversal]
  );

  // Hold to Start logic (PRD Section 5)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startHoldCountdown = () => {
    if (phase !== "READY" || !assetLoaded) return;
    setPhase("COUNTDOWN");
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        startGame();
      }
    }, 850);
    holdTimeoutRef.current = interval as unknown as NodeJS.Timeout;
  };

  const cancelHoldCountdown = () => {
    if (phase === "COUNTDOWN") {
      if (holdTimeoutRef.current) clearInterval(holdTimeoutRef.current);
      setPhase("READY");
      setCountdown(3);
    }
  };

  // Start actual 15.0s game session
  const startGame = async () => {
    setPhase("PLAYING");
    setTimeLeft(15.0);
    setScore(0);
    setCombo(0);
    setIsFever(false);
    reversalsRef.current = [];
    validShakeCounterRef.current = 0;
    consecutiveGoodPerfectRef.current = 0;
    lastScoredTimeRef.current = 0;
    gameStartTimestampRef.current = performance.now();

    // Create session on server
    try {
      const res = await fetch("/api/game/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.sessionId) {
        sessionDataRef.current = {
          sessionId: data.sessionId,
          signedToken: data.signedToken,
          jackpotIndex: data.jackpotIndex,
        };
      }
    } catch (e) {
      console.error("Session creation failed", e);
    }
  };

  // 15.0s Game Timer (PRD Section 6.1)
  useEffect(() => {
    if (phase !== "PLAYING") return;

    const timer = setInterval(() => {
      const elapsed = (performance.now() - gameStartTimestampRef.current) / 1000;
      const remaining = Math.max(0, 15.0 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        endGame();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [phase]);

  // End Game and Submit to server (PRD Section 23 & 33)
  const endGame = async () => {
    setPhase("ENDED");
    sounds.playTimeUp();

    const session = sessionDataRef.current;
    if (!session) {
      onGameComplete({
        score,
        myBestScore: score,
        myRank: 1,
        verified: true,
        stats: { validCount: 0, goodCount: 0, perfectCount: 0, feverCount: 0, jackpotCount: 0 },
      });
      return;
    }

    try {
      const res = await fetch(`/api/game/session/${session.sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reversals: reversalsRef.current,
          signedToken: session.signedToken,
          playerId,
          visibilityHidden: !!disqualifiedMsg,
        }),
      });
      const result = await res.json();
      onGameComplete({
        score: result.score ?? score,
        myBestScore: result.myBestScore ?? score,
        myRank: result.myRank ?? 1,
        verified: result.verified ?? false,
        stats: result.stats || {
          validCount: 0,
          goodCount: 0,
          perfectCount: 0,
          feverCount: 0,
          jackpotCount: 0,
        },
        reason: result.reason,
      });
    } catch (err) {
      onGameComplete({
        score,
        myBestScore: score,
        myRank: 1,
        verified: true,
        stats: { validCount: 0, goodCount: 0, perfectCount: 0, feverCount: 0, jackpotCount: 0 },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden px-4 py-6 font-sans text-white select-none touch-none"
      onPointerDown={(e) => {
        isGrippingRef.current = true;
        if (phase === "READY") {
          startHoldCountdown();
        }
      }}
      onPointerMove={(e) => {
        if (isGrippingRef.current) {
          handlePointerMove(e.clientX);
        }
      }}
      onPointerUp={() => {
        isGrippingRef.current = false;
        if (phase === "COUNTDOWN") {
          cancelHoldCountdown();
        }
      }}
      onPointerCancel={() => {
        isGrippingRef.current = false;
        if (phase === "COUNTDOWN") {
          cancelHoldCountdown();
        }
      }}
    >
      {/* 60FPS Drop Canvas */}
      <DropCanvas dropAssetUrl={campaign.dropAssetUrl} itemsRef={particlesRef} />

      {/* Top Navigation & Global Header (PRD Section 5) */}
      <header className="z-30 flex w-full max-w-md items-center justify-between pt-1">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-purple-300 uppercase">
            TODAY&apos;S POP
          </div>
          <div className="text-xs font-semibold text-gray-300">
            {campaign.campaignType === "SPONSORED" ? (
              <span>Sponsored by <span className="text-purple-400 font-bold">{campaign.sponsorName}</span></span>
            ) : (
              <span>by Popit</span>
            )}
          </div>
        </div>

        {/* Global Drops Counter & Utility Buttons (PRD Section 36) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium backdrop-blur-md">
            <span>TODAY</span>
            <span className="font-bold text-yellow-300">
              {(todayTotal + score).toLocaleString()}
            </span>
            <span className="text-xs">🍪</span>
          </div>

          <button
            onClick={toggleMute}
            aria-label="Sound Toggle"
            className="rounded-full bg-white/10 p-2 text-gray-200 transition hover:bg-white/20 active:scale-95"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-yellow-400" />}
          </button>

          <button
            onClick={onOpenLeaderboard}
            aria-label="Leaderboard"
            className="rounded-full bg-white/10 p-2 text-gray-200 transition hover:bg-white/20 active:scale-95"
          >
            <Trophy size={18} className="text-yellow-400" />
          </button>

          <button
            onClick={onOpenRules}
            aria-label="Rules"
            className="rounded-full bg-white/10 p-2 text-gray-200 transition hover:bg-white/20 active:scale-95"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* In-Game HUD: Score, Timer, Combo, Fever */}
      <div className="z-30 mt-4 flex w-full max-w-md flex-col items-center">
        {phase === "PLAYING" && (
          <div className="flex w-full items-center justify-between px-2">
            {/* Combo & Fever Indicator (PRD Section 12, 13) */}
            <div className="flex items-center gap-2">
              {combo >= 2 && (
                <div className="flex items-center gap-1 rounded-lg bg-yellow-500/20 px-3 py-1 text-sm font-black tracking-wider text-yellow-300 backdrop-blur-md">
                  <Sparkles size={16} />
                  <span>{combo} COMBO</span>
                </div>
              )}
              {isFever && (
                <div className="flex items-center gap-1 rounded-lg bg-orange-500/30 px-3 py-1 text-sm font-black tracking-wider text-orange-400 animate-pulse">
                  <Flame size={16} />
                  <span>FEVER +1</span>
                </div>
              )}
            </div>

            {/* 15.0s Accurate Timer (PRD Section 6.1) */}
            <div className="rounded-full bg-black/40 px-3.5 py-1 text-base font-mono font-bold tracking-tight text-white border border-white/10 backdrop-blur-md">
              {timeLeft.toFixed(1)}s
            </div>
          </div>
        )}

        {/* Big Live Drops Score (PRD Section 22) */}
        {phase === "PLAYING" && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-2 text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
              <span>🍪</span>
              <span className="font-mono">{score}</span>
            </div>
            <div className="text-xs font-semibold tracking-wider text-purple-300 uppercase">
              {campaign.dropItemName}
            </div>
          </div>
        )}

        {/* Feedback Banner (PERFECT / GOOD / JACKPOT / FEVER) */}
        <div className="h-10 flex items-center justify-center">
          {feedbackText && (
            <div
              className={`text-2xl font-black tracking-wider drop-shadow-md transition-all duration-150 ${feedbackColor}`}
            >
              {feedbackText}
            </div>
          )}
        </div>
      </div>

      {/* Center Interactive Shake Object (PRD Section 5, 17) */}
      <div className="relative z-20 flex flex-1 w-full max-w-sm items-center justify-center">
        {/* Glow backdrop during Fever / High Combo */}
        <div
          className={`absolute h-72 w-72 rounded-full blur-3xl transition-opacity duration-300 pointer-events-none ${
            isFever
              ? "bg-orange-500/40 opacity-100"
              : combo >= 4
              ? "bg-purple-600/30 opacity-80"
              : "bg-purple-900/20 opacity-40"
          }`}
        />

        {/* Shake Object Wrapper */}
        <div
          ref={objectRef}
          className="relative cursor-grab active:cursor-grabbing transition-transform will-change-transform select-none"
          style={{ touchAction: "none" }}
        >
          <div className="relative flex flex-col items-center">
            <Image
              src={campaign.objectAssetUrl}
              alt={campaign.objectName}
              width={340}
              height={340}
              priority
              className="max-h-[50vh] w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)] pointer-events-none"
            />
          </div>
        </div>

        {/* Countdown Overlay (PRD Section 5: 3, 2, 1, POP IT!) */}
        {phase === "COUNTDOWN" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm pointer-events-none z-40">
            <span className="text-7xl font-black text-yellow-300 animate-ping">
              {countdown}
            </span>
            <span className="mt-4 text-sm font-bold text-gray-300">
              손을 떼면 취소돼요!
            </span>
          </div>
        )}

        {/* Disqualified Alert (PRD Section 35) */}
        {disqualifiedMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-3xl p-6 text-center z-50">
            <ShieldAlert size={48} className="text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">기록 취소</h3>
            <p className="text-sm text-gray-300 mb-4">{disqualifiedMsg}</p>
            <button
              onClick={() => {
                setDisqualifiedMsg(null);
                setPhase("READY");
              }}
              className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg active:scale-95"
            >
              다시 시도하기
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA / Status Area (PRD Section 5: HOLD TO START) */}
      <div className="z-30 mb-4 flex w-full max-w-sm flex-col items-center gap-3">
        {phase === "READY" && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-md border border-white/20 animate-bounce-short">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
              <span className="text-sm font-black tracking-wide text-white uppercase">
                HOLD TO START
              </span>
            </div>
            <p className="text-xs text-gray-400 text-center">
              사물을 누르고 있으면 3초 카운트다운 후 시작됩니다
            </p>
          </div>
        )}

        {phase === "PLAYING" && (
          <div className="text-center">
            <span className="text-xs font-bold tracking-wider text-purple-300 animate-pulse uppercase">
              좌우로 빠르게 흔드세요!
            </span>
          </div>
        )}

        {/* Object Name Tag */}
        <div className="rounded-full bg-black/30 px-3.5 py-1 text-[11px] font-semibold text-gray-400 border border-white/5">
          {campaign.objectName}
        </div>
      </div>
    </div>
  );
}

