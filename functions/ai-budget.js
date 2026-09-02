"use strict";

const DEFAULT_MONTHLY_LIMIT_USD = 10;
const DEFAULT_RESERVATION_USD = 0.2;

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function usdToMicros(value) {
  return Math.max(0, Math.round(Number(value || 0) * 1_000_000));
}

function estimateUsageMicros(usage = {}, env = process.env) {
  const inputTokens = Number(usage.input_tokens || 0);
  const outputTokens = Number(usage.output_tokens || 0);
  const inputUsdPerMillion = Number(env.OPENAI_INPUT_USD_PER_MTOK || 1);
  const outputUsdPerMillion = Number(env.OPENAI_OUTPUT_USD_PER_MTOK || 6);
  return Math.max(0, Math.ceil(inputTokens * inputUsdPerMillion + outputTokens * outputUsdPerMillion));
}

async function reserveAiBudget(db, purpose, env = process.env) {
  const limitMicros = usdToMicros(env.OPENAI_MONTHLY_BUDGET_USD || DEFAULT_MONTHLY_LIMIT_USD);
  const reservationMicros = usdToMicros(env.OPENAI_RESERVATION_USD || DEFAULT_RESERVATION_USD);
  const month = monthKey();
  const ref = db.collection("cost_controls").doc(`openai-${month}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const spentMicros = Number(data.spentMicros || 0);
    const reservedMicros = Number(data.reservedMicros || 0);
    if (spentMicros + reservedMicros + reservationMicros > limitMicros) {
      const error = new Error("Az OpenAI havi költségkerete elfogyott.");
      error.code = "AI_MONTHLY_BUDGET_EXCEEDED";
      throw error;
    }
    transaction.set(ref, {
      month,
      currency: "USD",
      limitMicros,
      spentMicros,
      reservedMicros: reservedMicros + reservationMicros,
      calls: Number(data.calls || 0),
      lastPurpose: String(purpose || "unknown"),
      updatedAt: new Date()
    }, { merge: true });
  });
  return { ref, reservationMicros, purpose: String(purpose || "unknown") };
}

async function settleAiBudget(db, reservation, usage, env = process.env) {
  const actualMicros = estimateUsageMicros(usage, env) + usdToMicros(env.OPENAI_TOOL_COST_USD || 0);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reservation.ref);
    const data = snapshot.data() || {};
    transaction.set(reservation.ref, {
      spentMicros: Number(data.spentMicros || 0) + actualMicros,
      reservedMicros: Math.max(0, Number(data.reservedMicros || 0) - reservation.reservationMicros),
      calls: Number(data.calls || 0) + 1,
      lastActualMicros: actualMicros,
      lastPurpose: reservation.purpose,
      updatedAt: new Date()
    }, { merge: true });
  });
  return actualMicros;
}

async function releaseAiBudget(db, reservation) {
  if (!reservation) return;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reservation.ref);
    const data = snapshot.data() || {};
    transaction.set(reservation.ref, {
      reservedMicros: Math.max(0, Number(data.reservedMicros || 0) - reservation.reservationMicros),
      updatedAt: new Date()
    }, { merge: true });
  });
}

module.exports = {
  estimateUsageMicros,
  monthKey,
  releaseAiBudget,
  reserveAiBudget,
  settleAiBudget,
  usdToMicros
};
