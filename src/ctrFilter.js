/**
 * ctrFilter.js
 * - 클릭 안 나오는 기사 자동 컷
 * - 댓글 반응형(논란/갈등/충격/반전) 주제만 통과
 * - 텔레그램 CTR용 제목 리라이팅
 */

const HOT_KEYWORDS = [
  "논란", "충격", "반전", "분노", "경악", "의혹", "폭로", "비판",
  "댓글", "반응", "난리", "발칵", "갈림", "충돌", "싸움", "파문",
  "사과", "해명", "입장", "논쟁", "왜", "이유"
];

const LOW_CTR_KEYWORDS = [
  "발표", "공개", "예정", "안내", "정리", "현황", "전망", "업데이트",
  "공지", "가이드", "방법", "신청", "접수", "운영", "일정", "확정"
];

const MIN_TITLE_LENGTH = 10;

// ✔ 업로드할지 판단
export function shouldPost(title) {
  const t = (title || "").trim();

  if (t.length < MIN_TITLE_LENGTH) {
    return { ok: false, reason: "too_short" };
  }

  const hasLow = LOW_CTR_KEYWORDS.some(k => t.includes(k));
  const hasHot = HOT_KEYWORDS.some(k => t.includes(k));

  if (hasLow && !hasHot) {
    return { ok: false, reason: "low_ctr_topic" };
  }

  if (!hasHot) {
    return { ok: false, reason: "not_hot_topic" };
  }

  return { ok: true, reason: "pass" };
}

// ✔ 제목 리라이팅
export function rewriteTitle(originalTitle) {
  const base = (originalTitle || "").trim();
  const trimmed = base.length > 42 ? base.slice(0, 41) + "…" : base;

  const hooks = [
    "🚨 “이 장면 때문에”…",
    "⚠️ 지금 반응 갈리는",
    "🔥 댓글 폭발한",
    "🚨 예상 못 한 반전,",
    "⚠️ 논란 커진 이유는?"
  ];

  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  if (trimmed.includes("왜") || trimmed.includes("이유")) {
    return `${hook} ${trimmed}`;
  }

  return `${hook} ${trimmed}… 왜?`;
}
