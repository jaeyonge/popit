// PRD Section 9, 10, 12, 13, 14, 54: Scoring Configuration
export interface ScoringConfig {
  version: number;
  validAmplitude: number;     // 10% (0.10)
  goodAmplitude: number;      // 16% (0.16)
  perfectAmplitude: number;   // 22% (0.22)
  validVelocity: number;      // 0.65 width/sec
  goodVelocity: number;       // 1.10 width/sec
  perfectVelocity: number;    // 1.70 width/sec
  reversalCooldownMs: number; // 120ms anti-macro limit
  comboTimeoutMs: number;     // 700ms combo decay
  feverThreshold: number;     // 8 Good/Perfect combos
  feverDurationMs: number;    // 1500ms
  jackpotMinIndex: number;    // 6th shake
  jackpotMaxIndex: number;    // 12th shake
  jackpotReward: number;      // +5 drops
  maxDurationSec: number;     // 15.0 seconds
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  version: 1,
  validAmplitude: 0.10,
  goodAmplitude: 0.16,
  perfectAmplitude: 0.22,
  validVelocity: 0.65,
  goodVelocity: 1.10,
  perfectVelocity: 1.70,
  reversalCooldownMs: 120,
  comboTimeoutMs: 700,
  feverThreshold: 8,
  feverDurationMs: 1500,
  jackpotMinIndex: 6,
  jackpotMaxIndex: 12,
  jackpotReward: 5,
  maxDurationSec: 15.0,
};

export type ShakeGrade = "VALID" | "GOOD" | "PERFECT";

export interface ReversalEvent {
  relativeTimestampMs: number; // ms from game start (POP IT!)
  displacement: number;        // normalized (0.0 ~ 1.0)
  peakVelocity: number;        // normalized width / sec
  direction: "left_to_right" | "right_to_left";
}

export interface VerificationResult {
  verified: boolean;
  score: number;
  validCount: number;
  goodCount: number;
  perfectCount: number;
  feverCount: number;
  jackpotCount: number;
  reason?: string;
}

/**
 * Deterministic Server-side Re-scoring & Verification (PRD Section 33, 34)
 */
export function verifyAndScoreSession(
  reversals: ReversalEvent[],
  jackpotIndex: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): VerificationResult {
  let score = 0;
  let validCount = 0;
  let goodCount = 0;
  let perfectCount = 0;
  let feverCount = 0;
  let jackpotAwarded = 0;

  let consecutiveGoodPerfect = 0;
  let feverActiveUntilMs = 0;
  let lastScoredTimestamp = -config.reversalCooldownMs;
  let validShakeTotal = 0;

  // Track intervals to detect macro bot (e.g. exactly identical intervals)
  const intervals: number[] = [];

  for (let i = 0; i < reversals.length; i++) {
    const rev = reversals[i];

    // Check bounds & valid timestamp
    if (rev.relativeTimestampMs < 0 || rev.relativeTimestampMs > config.maxDurationSec * 1000 + 500) {
      continue; // Outside 15.0s (+ small grace margin)
    }

    if (rev.displacement <= 0 || rev.displacement > 1.0) {
      return { verified: false, score: 0, validCount, goodCount, perfectCount, feverCount, jackpotCount: 0, reason: "Abnormal displacement" };
    }

    // Cooldown check (120ms guard, PRD Section 10: 최소 120ms 필요)
    const timeDelta = rev.relativeTimestampMs - lastScoredTimestamp;
    if (timeDelta < config.reversalCooldownMs) {
      continue; // Dropped by anti-macro guard
    }

    // Evaluate grade
    let grade: ShakeGrade | null = null;
    if (rev.displacement >= config.perfectAmplitude && rev.peakVelocity >= config.perfectVelocity) {
      grade = "PERFECT";
    } else if (rev.displacement >= config.goodAmplitude && rev.peakVelocity >= config.goodVelocity) {
      grade = "GOOD";
    } else if (rev.displacement >= config.validAmplitude && rev.peakVelocity >= config.validVelocity) {
      grade = "VALID";
    }

    if (!grade) {
      continue; // Not a valid shake
    }

    intervals.push(timeDelta);
    lastScoredTimestamp = rev.relativeTimestampMs;
    validShakeTotal += 1;

    // Combo handling
    if (timeDelta > config.comboTimeoutMs) {
      consecutiveGoodPerfect = 0;
    }

    let dropsForShake = 0;
    if (grade === "PERFECT") {
      dropsForShake = 3;
      perfectCount++;
      consecutiveGoodPerfect++;
    } else if (grade === "GOOD") {
      dropsForShake = 2;
      goodCount++;
      consecutiveGoodPerfect++;
    } else {
      // VALID preserves combo, doesn't increment
      dropsForShake = 1;
      validCount++;
    }

    // Check FEVER trigger
    if (consecutiveGoodPerfect >= config.feverThreshold) {
      feverCount++;
      feverActiveUntilMs = rev.relativeTimestampMs + config.feverDurationMs;
      consecutiveGoodPerfect = 0; // Reset for next fever cycle
    }

    // Apply FEVER bonus
    const isFever = rev.relativeTimestampMs <= feverActiveUntilMs;
    if (isFever) {
      dropsForShake += 1;
    }

    // Check JACKPOT trigger (PRD Section 14: guaranteed exactly once between 6~12th valid shake)
    if (validShakeTotal === jackpotIndex && jackpotAwarded === 0) {
      dropsForShake += config.jackpotReward;
      jackpotAwarded = 1;
    }

    score += dropsForShake;
  }

  // Macro check: if user has >= 10 intervals, check variance.
  // Synthetic inputs often have identical intervals (e.g. constant timers or bots)
  if (intervals.length >= 10) {
    // Exclude the very first interval (time from game start to first shake)
    const subsequentIntervals = intervals.slice(1);
    const avg = subsequentIntervals.reduce((a, b) => a + b, 0) / subsequentIntervals.length;
    const variance = subsequentIntervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / subsequentIntervals.length;
    if (variance < 1.0) {
      return {
        verified: false,
        score,
        validCount,
        goodCount,
        perfectCount,
        feverCount,
        jackpotCount: jackpotAwarded,
        reason: "Suspicious macro interval detected",
      };
    }
  }

  return {
    verified: true,
    score,
    validCount,
    goodCount,
    perfectCount,
    feverCount,
    jackpotCount: jackpotAwarded,
  };
}

