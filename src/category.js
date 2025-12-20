export function detectCategory(title) {
  const t = title.toLowerCase();

  if (t.match(/연예|배우|가수|아이돌|드라마|영화|열애|결혼|이혼/)) {
    return "연예";
  }

  if (t.match(/사건|사고|폭행|살인|화재|경찰|검찰|구속|체포/)) {
    return "사건";
  }

  if (t.match(/정치|대통령|국회|정부|장관|여당|야당|총선/)) {
    return "정치";
  }

  if (t.match(/경제|주식|증시|코인|비트코인|환율|금리/)) {
    return "경제";
  }

  return "기타";
}
