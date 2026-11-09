/**
 * Izolovaný lokálny benchmark pre OWASP scrypt kandidátov.
 *
 * Bezpečnostné záruky:
 * - Používa iba vstavané moduly Node.js (node:crypto, node:perf_hooks, node:os, node:process).
 * - Neimportuje žiadny aplikačný kód, Supabase klienta ani dotenv.
 * - Nečíta žiadne environment premenné, .env súbory ani databázu.
 * - Nevytvára žiadne sieťové spojenia.
 * - Používa výhradne syntetické vstupy a nikdy nevypisuje plaintext vstupy, soli ani odvodené kľúče.
 */

import crypto from "node:crypto";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import os from "node:os";
import process from "node:process";

const KEYLEN_BYTES = 32;
const SALT_BYTES = 16;
const GROUP_TIMEOUT_MS = 15_000;
const SEQUENTIAL_ITERATIONS = 10;

// Syntetické testovacie vstupy (nikdy sa nevypisujú na výstup)
const SYNTHETIC_INPUTS = [
  { id: "ascii-12B", buffer: Buffer.from("SynthTest_12", "utf8") },
  { id: "ascii-64B", buffer: Buffer.alloc(64, "A") },
  { id: "unicode-utf8", buffer: Buffer.from("Syntetické_Heslo_Čučoriedka_2026_🔒", "utf8") },
];
const WRONG_INPUT_BUFFER = Buffer.from("Wrong_Synthetic_Input_For_Mismatch_Check", "utf8");

const PROFILES = [
  {
    id: "profile-1 (ln=15, r=8, p=3)",
    ln: 15,
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 36 * 1024 * 1024,
    maxmemMiB: 36,
  },
  {
    id: "profile-2 (ln=16, r=8, p=2)",
    ln: 16,
    N: 65536,
    r: 8,
    p: 2,
    maxmem: 68 * 1024 * 1024,
    maxmemMiB: 68,
  },
  {
    id: "profile-3 (ln=17, r=8, p=1)",
    ln: 17,
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 132 * 1024 * 1024,
    maxmemMiB: 132,
  },
];

function sanitizeError(err) {
  if (!err || typeof err !== "object") {
    return { type: typeof err, code: "UNKNOWN", message: "Unknown error" };
  }
  const code = typeof err.code === "string" ? err.code : "NO_CODE";
  const name = typeof err.name === "string" ? err.name : "Error";
  let category = "OTHER_ERROR";
  if (code === "ERR_CRYPTO_SCRYPT_INVALID_PARAMETER") {
    category = "ERR_CRYPTO_SCRYPT_INVALID_PARAMETER";
  } else if (code === "ERR_CRYPTO_SCRYPT_NOT_SUPPORTED") {
    category = "ERR_CRYPTO_SCRYPT_NOT_SUPPORTED";
  } else if (code === "BENCHMARK_GROUP_TIMEOUT") {
    category = "TIMEOUT";
  } else if (/memory|alloc|openssl/i.test(String(err.message || ""))) {
    category = "OPENSSL_OR_MEMORY_ERROR";
  }
  return {
    type: name,
    code,
    category,
    message: String(err.message || "").slice(0, 140),
  };
}

function runScryptAsync(inputBuffer, saltBuffer, profile) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      inputBuffer,
      saltBuffer,
      KEYLEN_BYTES,
      {
        N: profile.N,
        r: profile.r,
        p: profile.p,
        maxmem: profile.maxmem,
      },
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      }
    );
  });
}

async function performHashOperation(inputBuffer, profile) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const dk = await runScryptAsync(inputBuffer, salt, profile);
  return { salt, dk };
}

async function performVerifyOperation(candidateBuffer, saltBuffer, expectedDkBuffer, profile) {
  const derivedKey = await runScryptAsync(candidateBuffer, saltBuffer, profile);
  if (derivedKey.byteLength !== expectedDkBuffer.byteLength) {
    return false;
  }
  return crypto.timingSafeEqual(derivedKey, expectedDkBuffer);
}

function withGroupTimeout(promiseFactory, timeoutMs) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Benchmark group exceeded timeout of ${timeoutMs} ms`);
      err.code = "BENCHMARK_GROUP_TIMEOUT";
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promiseFactory(), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function computeStats(samplesMs) {
  if (!samplesMs.length) {
    return { count: 0, minMs: 0, maxMs: 0, p50Ms: 0, p95Ms: 0, meanMs: 0 };
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const count = sorted.length;
  const minMs = sorted[0];
  const maxMs = sorted[count - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const meanMs = sum / count;

  const p50Idx = Math.min(count - 1, Math.floor(0.5 * (count - 1)));
  const p95Idx = Math.min(count - 1, Math.ceil(0.95 * count) - 1);

  return {
    count,
    minMs: Number(minMs.toFixed(2)),
     p50Ms: Number(sorted[p50Idx].toFixed(2)),
    p95Ms: Number(sorted[p95Idx].toFixed(2)),
    maxMs: Number(maxMs.toFixed(2)),
    meanMs: Number(meanMs.toFixed(2)),
  };
}

function toMiB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

async function measureGroupWithMetrics(fn) {
  const memBefore = process.memoryUsage();
  let peakRss = memBefore.rss;
  const sampler = setInterval(() => {
    const currentRss = process.memoryUsage().rss;
    if (currentRss > peakRss) peakRss = currentRss;
  }, 5);

  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  const start = performance.now();
  try {
    const result = await withGroupTimeout(fn, GROUP_TIMEOUT_MS);
    const wallClockMs = Number((performance.now() - start).toFixed(2));
    histogram.disable();
    clearInterval(sampler);
    const memAfter = process.memoryUsage();
    if (memAfter.rss > peakRss) peakRss = memAfter.rss;

    return {
      ok: true,
      result,
      wallClockMs,
      rssBeforeMiB: toMiB(memBefore.rss),
      rssAfterMiB: toMiB(memAfter.rss),
      sampledPeakRssMiB: toMiB(peakRss),
      extBeforeMiB: toMiB(memBefore.external),
      extAfterMiB: toMiB(memAfter.external),
      elMaxDelayMs: Number((histogram.max / 1e6).toFixed(2)),
      elP99DelayMs: Number((histogram.percentile(99) / 1e6).toFixed(2)),
    };
  } catch (err) {
    const wallClockMs = Number((performance.now() - start).toFixed(2));
    histogram.disable();
    clearInterval(sampler);
    const memAfter = process.memoryUsage();
    return {
      ok: false,
      error: sanitizeError(err),
      wallClockMs,
      rssBeforeMiB: toMiB(memBefore.rss),
      rssAfterMiB: toMiB(memAfter.rss),
      sampledPeakRssMiB: toMiB(peakRss),
      extBeforeMiB: toMiB(memBefore.external),
      extAfterMiB: toMiB(memAfter.external),
      elMaxDelayMs: Number((histogram.max / 1e6).toFixed(2)),
      elP99DelayMs: Number((histogram.percentile(99) / 1e6).toFixed(2)),
    };
  }
}

async function runBenchmark() {
  const envReport = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    logicalCpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || "unknown",
    totalSystemMemoryGiB: Number((os.totalmem() / (1024 ** 3)).toFixed(2)),
    freeSystemMemoryGiB: Number((os.freemem() / (1024 ** 3)).toFixed(2)),
    keylenBytes: KEYLEN_BYTES,
    saltBytes: SALT_BYTES,
    sequentialIterations: SEQUENTIAL_ITERATIONS,
    groupTimeoutMs: GROUP_TIMEOUT_MS,
    noteOnPercentiles: "Orientačné hodnoty (N=10 sekvenčných vzoriek na operáciu; p99 vynechané pre malú vzorku).",
  };

  const profileReports = [];

  for (const profile of PROFILES) {
    const report = {
      profileId: profile.id,
      params: { ln: profile.ln, N: profile.N, r: profile.r, p: profile.p },
      maxmemMiB: profile.maxmemMiB,
      maxmemBytes: profile.maxmem,
      abortedEarly: false,
      errors: [],
      coldCall: null,
      syntheticInputsSmokeCheck: [],
      sequentialHash: null,
      sequentialVerifySuccess: null,
      sequentialVerifyFailure: null,
      concurrency: {},
    };

    let refSalt = null;
    let refDk = null;

    // 1. Cold-ish prvé volanie (hash)
    const coldRes = await measureGroupWithMetrics(async () => {
      const t0 = performance.now();
      const out = await performHashOperation(SYNTHETIC_INPUTS[0].buffer, profile);
      const elapsed = Number((performance.now() - t0).toFixed(2));
      refSalt = out.salt;
      refDk = out.dk;
      return { latencyMs: elapsed };
    });

    if (!coldRes.ok) {
      report.abortedEarly = true;
      report.errors.push({ stage: "coldHash", ...coldRes.error });
      profileReports.push(report);
      continue;
    }

    report.coldCall = {
      latencyMs: coldRes.result.latencyMs,
      rssBeforeMiB: coldRes.rssBeforeMiB,
      rssAfterMiB: coldRes.rssAfterMiB,
      sampledPeakRssMiB: coldRes.sampledPeakRssMiB,
      extBeforeMiB: coldRes.extBeforeMiB,
      extAfterMiB: coldRes.extAfterMiB,
      elMaxDelayMs: coldRes.elMaxDelayMs,
    };

    // 2. Kontrola všetkých 3 syntetických vstupov (12B ASCII, 64B ASCII, Unicode UTF-8)
    const smokeRes = await measureGroupWithMetrics(async () => {
      const checks = [];
      for (const item of SYNTHETIC_INPUTS) {
        const t0 = performance.now();
        const { salt, dk } = await performHashOperation(item.buffer, profile);
        const okMatch = await performVerifyOperation(item.buffer, salt, dk, profile);
        const okMismatch = await performVerifyOperation(WRONG_INPUT_BUFFER, salt, dk, profile);
        const elapsed = Number((performance.now() - t0).toFixed(2));
        if (!okMatch || okMismatch) {
          throw new Error(`Verification invariant failed for synthetic input ${item.id}`);
        }
        checks.push({
          inputId: item.id,
          byteLength: item.buffer.byteLength,
          total3OpsMs: elapsed,
          verifiedMatch: okMatch,
          verifiedMismatchRejected: !okMismatch,
        });
      }
      return checks;
    });

    if (!smokeRes.ok) {
      report.abortedEarly = true;
      report.errors.push({ stage: "syntheticInputsSmoke", ...smokeRes.error });
      profileReports.push(report);
      continue;
    }
    report.syntheticInputsSmokeCheck = smokeRes.result;

    // 3. Warm sekvenčné merania: hashPassword (10 iterácií)
    const seqHashRes = await measureGroupWithMetrics(async () => {
      const samples = [];
      for (let i = 0; i < SEQUENTIAL_ITERATIONS; i++) {
        const t0 = performance.now();
        await performHashOperation(SYNTHETIC_INPUTS[0].buffer, profile);
        samples.push(performance.now() - t0);
      }
      return computeStats(samples);
    });

    if (!seqHashRes.ok) {
      report.abortedEarly = true;
      report.errors.push({ stage: "sequentialHash", ...seqHashRes.error });
      profileReports.push(report);
      continue;
    }
    report.sequentialHash = {
      ...seqHashRes.result,
      wallClockMs: seqHashRes.wallClockMs,
      rssBeforeMiB: seqHashRes.rssBeforeMiB,
      rssAfterMiB: seqHashRes.rssAfterMiB,
      sampledPeakRssMiB: seqHashRes.sampledPeakRssMiB,
      extBeforeMiB: seqHashRes.extBeforeMiB,
      extAfterMiB: seqHashRes.extAfterMiB,
      elMaxDelayMs: seqHashRes.elMaxDelayMs,
    };

    // 4. Warm sekvenčné merania: verifyPassword SUCCESS (10 iterácií)
    const seqVerifyOkRes = await measureGroupWithMetrics(async () => {
      const samples = [];
      for (let i = 0; i < SEQUENTIAL_ITERATIONS; i++) {
        const t0 = performance.now();
        const ok = await performVerifyOperation(SYNTHETIC_INPUTS[0].buffer, refSalt, refDk, profile);
        if (!ok) throw new Error("Expected successful verification to return true");
        samples.push(performance.now() - t0);
      }
      return computeStats(samples);
    });

    if (!seqVerifyOkRes.ok) {
      report.abortedEarly = true;
      report.errors.push({ stage: "sequentialVerifySuccess", ...seqVerifyOkRes.error });
      profileReports.push(report);
      continue;
    }
    report.sequentialVerifySuccess = {
      ...seqVerifyOkRes.result,
      wallClockMs: seqVerifyOkRes.wallClockMs,
      rssBeforeMiB: seqVerifyOkRes.rssBeforeMiB,
      rssAfterMiB: seqVerifyOkRes.rssAfterMiB,
      sampledPeakRssMiB: seqVerifyOkRes.sampledPeakRssMiB,
      extBeforeMiB: seqVerifyOkRes.extBeforeMiB,
      extAfterMiB: seqVerifyOkRes.extAfterMiB,
      elMaxDelayMs: seqVerifyOkRes.elMaxDelayMs,
    };

    // 5. Warm sekvenčné merania: verifyPassword FAILURE (10 iterácií)
    const seqVerifyFailRes = await measureGroupWithMetrics(async () => {
      const samples = [];
      for (let i = 0; i < SEQUENTIAL_ITERATIONS; i++) {
        const t0 = performance.now();
        const ok = await performVerifyOperation(WRONG_INPUT_BUFFER, refSalt, refDk, profile);
        if (ok) throw new Error("Expected failed verification to return false");
        samples.push(performance.now() - t0);
      }
      return computeStats(samples);
    });

    if (!seqVerifyFailRes.ok) {
      report.abortedEarly = true;
      report.errors.push({ stage: "sequentialVerifyFailure", ...seqVerifyFailRes.error });
      profileReports.push(report);
      continue;
    }
    report.sequentialVerifyFailure = {
      ...seqVerifyFailRes.result,
      wallClockMs: seqVerifyFailRes.wallClockMs,
      rssBeforeMiB: seqVerifyFailRes.rssBeforeMiB,
      rssAfterMiB: seqVerifyFailRes.rssAfterMiB,
      sampledPeakRssMiB: seqVerifyFailRes.sampledPeakRssMiB,
      extBeforeMiB: seqVerifyFailRes.extBeforeMiB,
      extAfterMiB: seqVerifyFailRes.extAfterMiB,
      elMaxDelayMs: seqVerifyFailRes.elMaxDelayMs,
    };

    // 6. Kontrolovaný súbeh: concurrency 2, 4, 8
    for (const conc of [2, 4, 8]) {
      const concRes = await measureGroupWithMetrics(async () => {
        const tasks = Array.from({ length: conc }, async (_, idx) => {
          const t0 = performance.now();
          const candidate = idx % 2 === 0 ? SYNTHETIC_INPUTS[0].buffer : WRONG_INPUT_BUFFER;
          const expectedValid = idx % 2 === 0;
          const actualValid = await performVerifyOperation(candidate, refSalt, refDk, profile);
          if (actualValid !== expectedValid) {
            throw new Error("Unexpected verification result under concurrency");
          }
          return performance.now() - t0;
        });
        const latencies = await Promise.all(tasks);
        return computeStats(latencies);
      });

      if (!concRes.ok) {
        report.abortedEarly = true;
        report.errors.push({ stage: `concurrency_${conc}`, ...concRes.error });
        break;
      }

      report.concurrency[`c${conc}`] = {
        concurrency: conc,
        wallClockMs: concRes.wallClockMs,
        perOpMinMs: concRes.result.minMs,
        perOpP50Ms: concRes.result.p50Ms,
        perOpMaxMs: concRes.result.maxMs,
        rssBeforeMiB: concRes.rssBeforeMiB,
        rssAfterMiB: concRes.rssAfterMiB,
        sampledPeakRssMiB: concRes.sampledPeakRssMiB,
        extBeforeMiB: concRes.extBeforeMiB,
        extAfterMiB: concRes.extAfterMiB,
        elMaxDelayMs: concRes.elMaxDelayMs,
        elP99DelayMs: concRes.elP99DelayMs,
      };
    }

    profileReports.push(report);
  }

  console.log(JSON.stringify({ environment: envReport, profiles: profileReports }, null, 2));
}

runBenchmark().catch((err) => {
  console.error(JSON.stringify({ fatalError: sanitizeError(err) }));
  process.exitCode = 1;
});

