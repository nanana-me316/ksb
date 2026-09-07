import { timingSafeEqual } from "node:crypto";

// ---------- 설정 ----------
const SHEET_NAME = "blacklisk";
const RANGE = "B2:N"; // 헤더(2행) + 데이터
const CACHE_MS = 60 * 1000; // 시트 캐시 60초

// 시트 헤더 순서(B~N). F열은 시트 헤더가 "league"이지만 ID로 표시.
const KEYS = [
  "primary_key", // B
  "server",      // C
  "league",      // D
  "rank",        // E
  "id",          // F
  "main",        // G
  "sub",         // H
  "nickname",    // I
  "bad_level",   // J
  "remark",      // K
  "note",        // L
  "creation_date", // M
  "extra",       // N
];

// 결과에 내려줄 컬럼(C~K 중 main, sub 제외)
const RESULT_KEYS = [
  "server", "league", "rank", "id",
  "nickname", "bad_level", "remark",
];

let cache = { at: 0, rows: [] };

// ---------- 유틸 ----------
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function loadRows(sheetId) {
  const now = Date.now();
  if (cache.rows.length && now - cache.at < CACHE_MS) return cache.rows;

  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&range=${RANGE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sheet fetch failed: ${res.status}`);
  const csv = await res.text();
  const raw = parseCsv(csv);

  // 첫 줄은 헤더
  const rows = raw.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ""))
    .map(r => {
      const o = {};
      KEYS.forEach((k, i) => { o[k] = (r[i] ?? "").trim(); });
      return o;
    })
    .filter(r => r.primary_key !== "");

  cache = { at: now, rows };
  return rows;
}

// ---------- 핸들러 ----------
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const password = process.env.SITE_PASSWORD;
  const sheetId = process.env.SHEET_ID;
  if (!password || !sheetId) {
    return json(500, { code: "env_missing", error: "서버 환경변수(SITE_PASSWORD, SHEET_ID)가 설정되지 않았습니다." });
  }

  let body;
  try { body = await req.json(); } catch { return json(400, { code: "bad_request", error: "잘못된 요청" }); }

  const { action, password: input, q } = body || {};
  if (!safeEqual(input ?? "", password)) {
    return json(401, { code: "bad_password", error: "비밀번호가 올바르지 않습니다." });
  }

  if (action === "auth") return json(200, { ok: true });

  if (action === "search") {
    const term = String(q ?? "").trim().toLowerCase();
    if (!term) return json(400, { code: "empty_query", error: "검색어를 입력하세요." });
    if (term.length < 2) return json(400, { code: "short_query", error: "2자 이상 입력하세요." });

    let rows;
    try { rows = await loadRows(sheetId); }
    catch (e) { return json(502, { code: "sheet_error", error: "시트를 불러오지 못했습니다." }); }

    const hits = rows
      .filter(r =>
        r.nickname.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term))
      .map(r => Object.fromEntries(RESULT_KEYS.map(k => [k, r[k]])));

    return json(200, { ok: true, count: hits.length, results: hits });
  }

  return json(400, { code: "bad_request", error: "알 수 없는 action" });
};

export const config = { path: "/api/search" };
