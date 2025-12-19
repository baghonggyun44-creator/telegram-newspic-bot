// src/ctrFilter.js

const HOT_KEYWORDS = [
  "논란", "충격", "반전", "분노", "경악", "이유", "왜",
  "갈림", "폭발", "비판", "의혹", "불만", "논쟁"
];

const BAD_KEYWORDS = [
  "발표", "공개", "예정", "정리", "설명", "안내", "현황"
];

export function isLowCTR(title) {
  return BAD_KEYWORDS.some(k => title.includes(k));
}

export function isHotTopic(title) {
  return HOT_KEYWORDS.some(k => title.includes(k));
}

export function rewriteTitle(original) {
  if (original.length > 35) {
    original = original.slice(0, 34);
  }

  const hooks = [
    "🚨 “이건 처음이다”…",
    "⚠️ 예상 못 한 반전,",
    "🔥 반응 갈린 이유는?",
    "🚨 지금 논란 중인",
    "⚠️ 댓글 폭발한"
  ];

  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return `${hook} ${original}`;
}
