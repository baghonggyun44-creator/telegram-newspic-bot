import axios from "axios";

export async function createPartnerLink({ nid, pn, cp }) {
  const url = "https://m.newspic.kr/api/partners/link";

  const params = new URLSearchParams();
  params.append(
    "query",
    `?nid=${nid}&pn=${pn}&cp=${cp}&utm_medium=affiliate&utm_campaign=${nid}&utm_source=np${cp}`
  );
  params.append("requestKey", cp);

  const res = await axios.post(url, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return res.data; // 👉 https://im.newspic.kr/xxxx
}
