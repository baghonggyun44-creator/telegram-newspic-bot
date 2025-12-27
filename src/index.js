import fetch from "node-fetch";
import crypto from "crypto";
import {
  isDuplicate,
  savePosted,
  canPostNow
} from "./dedupStore.js";
import { sendTelegram } from "./telegram.js";
import { makePartnerLink } from "./partnerLink.js";

console.log("[START] NewsPic AutoPost Bot");

// ✅ GitHub Secrets 이름에 맞춤
const COOKIE = process.env.NEWSPIC_COOKIE;
const PUBLIC_CHAT = process.env.TELEGRAM_CHAT_ID;          // 공개 채널
const PRIVATE_CHAT = process.env.TELEGRAM_CHAT_ID_PRIVATE; // 개인 DM

if (!COOKIE || !PUBLIC_CHAT || !PRIVATE_CHAT) {
  console.error("[FATAL] required env missing");
  process.exit(1);
}

// ⏱ 전송 간격 (현재 5분 테스트용)
const INTERVAL = 5 * 60 * 1000;

// 카테고리 우선순위 + 기본 해시태그
const CHANNEL_PRIORITY = [
  { no: 12, name: "사건사고", tags: ["#사건사고", "#속보"] },
  { no: 3,  name: "정치",     tags: ["#정치", "#국회"] },
  { no: 4,  name: "경제",     tags: ["#경제", "#증시"] },
  { no: 1,  name: "사회",     tags: ["#사회", "#뉴스"] }
];

const ALLOWED_RECOM_TYPES = [
  "열독률",
  "핫클릭",
  "인기",
  "공유많은"
];

// 🔑 기사 ID 생성
function makeId(nid) {
  return crypto.createHash("md5").update(String(nid)).digest("hex");
}

// 🔎 기사 목록 호출
async function fetchArticles(channelNo) {
  const res = await fetch(
    "https://partners.newspic.kr/main/contentList",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
        "Cookie": COOKIE
      },
      body: new URLSearchParams({
        channelNo,
        pageSize: 20
      })
    }
  );

  const text = await res.text();
  if (text.startsWith("<!DOCTYPE")) {
    throw new Error("Not logged in");
  }

  return JSON.parse(text)?.recomList || [];
}

// 🧠 X 클릭 유도용 후킹 문구
function makeXHook(title) {
  if (title.includes("사망") || title.includes("숨져")) {
    return "🚨 방금 확인된 충격적인 소식";
  }
  if (title.includes("논란") || title.includes("충격")) {
    return "지금 가장 뜨거운 논란";
  }
  if (title.includes("결국")) {
    return "결국 이런 결론이 나왔습니다";
  }
  return "지금 가장 많이 보는 뉴스";
}

// 🏷 해시태그 자동 생성 (최대 3개)
function makeHashtags(title, baseTags) {
  const extra = [];

  if (title.match(/경찰|검찰|체포|구속/)) extra.push("#사건");
  if (title.match(/사망|사고|화재/)) extra.push("#긴급");
  if (title.match(/주식|증시|코스피|코인/)) extra.push("#재테크");
  if (title.match(/대통령|국회|정부/)) extra.push("#정치이슈");

  return [...new Set([...baseTags, ...extra])].slice(0, 3).join(" ");
}

(async () => {
  try {
    // ⛔ 전송 간격 제한
    if (!canPostNow(INTERVAL)) {
      console.log("[STOP] interval not passed");
      return;
    }

    let target = null;
    let usedCategory = null;
    let categoryTags = [];

    // 카테고리 순차 탐색
    for (const channel of CHANNEL_PRIORITY) {
      const list = await fetchArticles(channel.no);
      if (list.length === 0) continue;

      const sorted = list
        .sort((a, b) => a.imRank - b.imRank)
        .sort((a, b) => {
          const aOk = ALLOWED_RECOM_TYPES.includes(a.recomTypeName);
          const bOk = ALLOWED_RECOM_TYPES.includes(b.recomTypeName);
          return bOk - aOk;
        });

      for (const article of sorted) {
        const id = makeId(article.nid);
        if (!isDuplicate(id)) {
          target = article;
          usedCategory = channel.name;
          categoryTags = channel.tags;
          break;
        }
      }

      if (target) break;
    }

    if (!target) {
      console.log("[STOP] no new article");
      return;
    }

    // 🔗 파트너 수익 링크 생성
    const rawUrl = `https://m.newspic.kr/view.html?nid=${target.nid}`;
    const partnerUrl = await makePartnerLink(rawUrl);

    if (!partnerUrl) {
      console.log("[STOP] partner link failed");
      return;
    }

    // 📢 공개 채널 메시지 (독자용)
    const publicMessage =
      `🚨 실시간 뉴스픽 (${usedCategory})\n\n` +
      `${target.title}\n\n` +
      `👉 바로보기\n${partnerUrl}`;

    // 🐦 개인 DM – X 반자동 업로드용
    const hook = makeXHook(target.title);
    const hashtags = makeHashtags(target.title, categoryTags);

    const xText =
      `${hook}\n` +
      `${target.title}\n\n` +
      `${partnerUrl}\n\n` +
      `${hashtags}`;

    const xIntentUrl =
      `https://twitter.com/intent/tweet?text=` +
      encodeURIComponent(xText);

    const facebookIntentUrl =
      `https://www.facebook.com/sharer/sharer.php?u=` +
      encodeURIComponent(partnerUrl);
    
    const threadsText =
      `${target.title}\n\n${partnerUrl}\n\n${hashtags}`;
    
    const threadsIntentUrl =
      `https://www.threads.net/intent/post?text=` +
      encodeURIComponent(xText);


    
    const privateMessage =
      `📢 SNS 업로드 알림 (반자동)\n\n` +
      `아래 문구는 그대로 사용해도 됩니다.\n\n` +
      `────────────\n` +
      `${xText}\n\n` +
      `🔗 Facebook 바로쓰기\n${facebookIntentUrl}\n\n` +
      `🔗 Threads 바로쓰기\n${threadsIntentUrl}\n\n` +
      `🔗 X 바로쓰기\n${xIntentUrl}`;

    

    // 전송
    await sendTelegram(publicMessage, PUBLIC_CHAT);
    await sendTelegram(privateMessage, PRIVATE_CHAT);

    savePosted(makeId(target.nid));
    console.log("[DONE] sent public + private");

  } catch (e) {
    console.error("[ERROR]", e.message);
  }
})();
