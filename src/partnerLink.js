/**
 * partnerLink.js
 * 뉴스픽 기사 URL → 내 뉴스픽 파트너 링크 생성
 */

const PARTNER_CODE = process.env.NEWSPIC_PARTNER_CODE;

if (!PARTNER_CODE) {
  throw new Error("❌ NEWSPIC_PARTNER_CODE 환경변수가 없습니다");
}

/**
 * 뉴스픽 기사 URL을 파트너 링크로 변환
 * @param {string} originalUrl
 * @returns {string}
 */
export function makePartnerLink(originalUrl) {
  try {
    const url = new URL(originalUrl);

    // pn 파라미터 세팅 (기존 값 있으면 덮어씀)
    url.searchParams.set("pn", PARTNER_CODE);

    return url.toString();
  } catch (e) {
    console.error("❌ 파트너 링크 생성 실패:", originalUrl);
    return originalUrl;
  }
}
