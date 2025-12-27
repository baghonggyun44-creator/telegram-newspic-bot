import axios from "axios";

export async function makePartnerLink(articleUrl) {
  const COOKIE = process.env.NEWSPIC_COOKIE;

  if (!COOKIE) {
    throw new Error("NEWSPIC_COOKIE is missing");
  }

  const res = await axios.post(
    "https://m.newspic.kr/api/partners/link",
    new URLSearchParams({
      query: articleUrl,
      requestKey: "AUTO"
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": COOKIE,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      timeout: 10000
    }
  );

  // 뉴스픽 파트너 API는 문자열 URL을 바로 반환하는 경우가 많음
  return res.data;
}
