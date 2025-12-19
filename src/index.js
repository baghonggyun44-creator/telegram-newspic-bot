import { CONFIG } from "./config.js";
import { loadState, saveState, isPosted, markPosted } from "./state.js";
import { fetchHotNews } from "./newspicScraper.js";
import { score } from "./scorer.js";
import { compose } from "./composer.js";
import { sendTelegram } from "./telegram.js";

async function main() {
  const state = loadState(CONFIG.STATE_PATH);

  const news = await fetchHotNews(
    CONFIG.NEWSPIC_URL,
    CONFIG.MAX_CANDIDATES
  );

  const targets = news
    .filter(n => !isPosted(state, n.url))
    .map(n => ({ ...n, s: score(n.title) }))
    .filter(n => n.s >= CONFIG.MIN_SCORE)
    .slice(0, CONFIG.POST_COUNT);

  for (const n of targets) {
    const message = compose(n);

    await sendTelegram(
      CONFIG.TELEGRAM_BOT_TOKEN,
      CONFIG.TELEGRAM_CHAT_ID,
      message
    );

    markPosted(state, n.url);
  }

  saveState(CONFIG.STATE_PATH, state);
}

main();
