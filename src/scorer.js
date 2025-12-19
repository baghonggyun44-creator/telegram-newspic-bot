export function score(title) {
  let s = 0;

  const keywords = ["속보", "논란", "충격", "결국", "사망", "폭로"];

  keywords.forEach(k => {
    if (title.includes(k)) s += 2;
  });

  if (/\d/.test(title)) s += 1;

  return s;
}
