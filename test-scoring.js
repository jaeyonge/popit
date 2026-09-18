import { verifyAndScoreSession, DEFAULT_SCORING_CONFIG } from "./lib/scoring.ts";

function runScoringTests() {
  console.log("Running Popit Scoring and Anti-cheat verification tests...");

  // Test 1: Normal skilled player session
  // 15 seconds, alternating reversals with natural human timing variance (~300-380ms)
  const skilledReversals = [];
  let t = 500;
  const naturalDeltas = [320, 350, 310, 360, 340, 370, 330, 355, 345, 365, 335, 350, 325, 360, 340];
  for (let i = 0; i < 30; i++) {
    skilledReversals.push({
      relativeTimestampMs: t,
      displacement: 0.25, // PERFECT amplitude
      peakVelocity: 2.0,  // PERFECT velocity
      direction: i % 2 === 0 ? "left_to_right" : "right_to_left",
    });
    t += naturalDeltas[i % naturalDeltas.length]; // natural human interval variance
  }

  const res1 = verifyAndScoreSession(skilledReversals, 8, DEFAULT_SCORING_CONFIG);
  console.log("Test 1 (Skilled normal human):", {
    verified: res1.verified,
    score: res1.score,
    perfect: res1.perfectCount,
    fever: res1.feverCount,
    jackpot: res1.jackpotCount,
  });

  if (!res1.verified || res1.score <= 0 || res1.jackpotCount !== 1) {
    throw new Error("Test 1 failed: Expected verified session with 1 jackpot");
  }

  // Test 2: Macro bot abuse (constant interval synthetic spam)
  const macroReversals = [];
  let t2 = 100;
  for (let i = 0; i < 50; i++) {
    macroReversals.push({
      relativeTimestampMs: t2,
      displacement: 0.3,
      peakVelocity: 5.0,
      direction: i % 2 === 0 ? "left_to_right" : "right_to_left",
    });
    t2 += 150; // perfectly constant synthetic 150ms interval with zero human variance
  }

  const res2 = verifyAndScoreSession(macroReversals, 8, DEFAULT_SCORING_CONFIG);
  console.log("Test 2 (Synthetic constant interval macro attack):", {
    verified: res2.verified,
    score: res2.score,
    reason: res2.reason,
  });

  if (res2.verified) {
    throw new Error("Test 2 failed: Constant zero-variance macro should be rejected with verified: false");
  }

  console.log("All scoring and verification tests PASSED successfully!");
}

runScoringTests();

