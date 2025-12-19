// src/partnerLink.js
import axios from "axios";

export async function makePartnerLink(articleUrl) {
  const res = await axios.post(
    "https://m.newspic.kr/api/partners/link",
    new URLSearchParams({
      query: articleUrl,
      requestKey: "AUTO"
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return res.data;
}
