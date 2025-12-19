// src/ctrFilter.js

export function shouldPost(title) {
  const now = new Date();
  const hour = now.getHours(); // 서버 기준 (GitHub Actions = UTC)

  // 🔥 강한 클릭 키워드
  const hotKeywords = [
    "충격", "논란", "폭로", "경악", "분노",
    "실체", "전말", "드러나", "반전",
    "댓글", "난리", "삭제", "사과",
    "의혹", "비판", "파장"
  ];

  // 😐 무난하지만 클릭 가능한 키워드
  const softKeywords = [
    "결국", "밝혔다", "이유", "이후",
    "왜", "말했다", "처음", "직접",
    "입장", "공개"
  ];

  const hasHot = hotKeywords.some(k => title.includes(k));
  const hasSoft = softKeywords.some(k => title.includes(k));

  // ⏰ 시간대별 통과 확률
  let passRate = 0.2; // 기본 20%

  // 한국 시간 기준으로 환산 (UTC → KST)
  const kstHour = (hour + 9) % 24;

  if (kstHour >= 7 && kstHour <= 9) {
    // 출근 시간
    passRate = 0.4;
  } else if (kstHour >= 11 && kstHour <= 13) {
    // 점심
    passRate = 0.45;
  } else if (kstHour >= 18 && kstHour <= 23) {
    // 저녁~밤 (최고 CTR)
    passRate = 0.6;
  }

  // 🔥 논란 기사 → 무조건 통과
  if (hasHot) {
    return { ok: true, reason: "hot_keyword" };
  }

  // 😐 무난 기사 → 확률 통과
  if (hasSoft && Math.random() < passRate) {
    return { ok: true, reason: "soft_keyword_pass" };
  }

  // 🧪 나머지 기사 → 낮은 확률 통과
  if (Math.random() < passRate * 0.5) {
    return { ok: true, reason: "random_pass" };
  }

  return { ok: false, reason: "filtered_out" };
}
