import fetch from "node-fetch";
import crypto from "crypto";
import { isDuplicate, savePosted } from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";

/**
 * ✅ 주인님 뉴스픽 계정 pn
 * 예전 링크에서 pn=570 이었으니 기본값 570
 */
const PN = "570";

/**
 * ✅ 뉴스픽 "이미 존재하는 기사 목록"에서 nid를 뽑아오기 위한 후보 URL들
 * (뉴스픽은 페이지 구조가 바뀔 수 있어서, 여러 후보를 순서대로 시도합니다.)
 */
const FEED_URLS = [
  `https://m.newspic.kr/`,                         // 모바일 홈
  `https://m.newspic.kr/?pn=${PN}`,                // pn 쿼리로 접근 시도
  `https://m.newspic.kr/index.html?pn=${PN}`,      // index 형태 시도
  `https://m.newspic.kr/list.html?pn=${PN}`,       // list 형태 시도
  `https://m.newspic.kr/main.html?pn=${PN}`,       // main 형태 시도
];

// 🔥 B 방식: 사건·사고 최우선 키워드
const ACCIDENT_KEYWORDS = [
  "사망","사고","화재","폭발","추락","붕괴",
  "구속","체포","살인","폭행","음주운전",
  "경찰","검찰","재판","특검","기소","압수수색","피의자","피해자"
];

// (선택) 너무 뻔한 연예 홍보성 차단
const ENTERTAINMENT_BLOCK = [
  "결혼","열애","출산","컴백","아이돌","예능","팬미팅","시사회"
];

console.log("[START] newspic telegram bot");

function makeIdFromNid(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

function isAccident(title) {
  return ACCIDENT_KEYWORDS.some(k => title.includes(k));
}

function isBlockedEntertainment(title) {
  return ENTERTAINMENT_BLOCK.some(k => title.includes(k));
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const text = await res.text();
  return { status: res.status, text };
}

/**
 * ✅ 뉴스픽 목록 HTML에서 "이미 존재하는 view.html 링크"를 뽑아옵니다.
 * - nid는 숫자 형태(예: 2025121914343330409)
 * - pn은 주인님 pn(570)을 우선 사용
 *
 * 반환: { title, nid, url } 또는 null
 */
function extractFirstNewspicItem(html) {
  // 1) view.html 링크에서 nid/pn 뽑기
  // 예: https://m.newspic.kr/view.html?nid=2025121922310428694&pn=570
  const linkRegex = /https?:\/\/m\.newspic\.kr\/view\.html\?nid=(\d+)&pn=(\d+)/g;
  const m = linkRegex.exec(html);
  if (!m) return null;

  const nid = m[1];
  const pn = m[2];

  const url = `https://m.newspic.kr/view.html?nid=${nid}&pn=${pn}`;

  // 2) 제목 추출은 페이지마다 달라서 "안전하게" URL만 보내도 카드가 뜹니다.
  // 그래도 가능하면 대략 제목도 뽑아보되, 실패하면 URL만 보내는 방식으로 운영합니다.
  let title = "";
  // 흔한 패턴: og:title 또는 title 태그에서 뽑기
  const ogTitle = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) title = ogTitle[1].trim();

  if (!title) {
    const t = html.match(/<title>(.*?)<\/title>/i);
    if (t?.[1]) title = t[1].trim();
  }

  // title이 목록 페이지라 부정확할 수 있어도, 사건사고 필터는 title이 있을 때만 적용
  return { title, nid, url };
}

/**
 * ✅ 정말 정확하게 하려면 view.html(기사 페이지)을 한 번 더 열어서 제목을 가져옵니다.
 * (카드는 URL만 보내도 뜨지만, B방식 필터 적용/메시지 텍스트 품질을 위해)
 */
async function hydrateTitleFromView(url) {
  const { status, text } = await fetchText(url);
  if (status < 200 || status >= 400) return "";

  const ogTitle = text.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) return ogTitle[1].trim();

  const t = text.match(/<title>(.*?)<\/title>/i);
  if (t?.[1]) return t[1].trim();

  return "";
}

(async () => {
  try {
    let picked = null;

    for (const url of FEED_URLS) {
      console.log("[FETCH]", url);
      const { status, text } = await fetchText(url);
      console.log("[FETCH_STATUS]", status);

      if (status < 200 || status >= 400) continue;

      const item = extractFirstNewspicItem(text);
      if (item) {
        picked = item;
        break;
      }
    }

    if (!picked) {
      console.log("[STOP] Could not find any view.html?nid=... links from FEED_URLS");
      return;
    }

    // view 페이지에서 제목을 정확히 가져오기
    let title = await hydrateTitleFromView(picked.url);

    // 제목을 못 가져오면(드물게) url만 보내도 카드가 뜸
    if (!title) title = picked.title || "(뉴스픽)";

    console.log("[PICKED]", { nid: picked.nid, url: picked.url, title });

    // ✅ B 방식 적용: title이 있을 때만 판별
    // 사건사고 우선: 사건사고 아니면 일단 패스(원하면 fallback 넣을 수 있음)
    if (title && (!isAccident(title) || isBlockedEntertainment(title))) {
      console.log("[STOP] Not accident or blocked entertainment:", title);
      return;
    }

    const id = makeIdFromNid(picked.nid);
    if (isDuplicate(id)) {
      console.log("[SKIP DUPLICATE]", picked.nid);
      return;
    }

    // ✅ 텔레그램: URL을 함께 보내면 카드(OG) 미리보기 생성
    await sendTelegram(
      `🚨 가장 빠른 실시간 뉴스픽\n\n${title}\n\n👉 원문 바로가기\n${picked.url}`
    );

    savePosted(id);
    console.log("[DONE] sent 1 newspic item");
  } catch (e) {
    console.error("[FATAL ERROR]", e.message);
    process.exit(1);
  }
})();
