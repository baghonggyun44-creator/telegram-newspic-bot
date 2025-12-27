import fs from "fs";

const STORE_PATH = "./posted.json";

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify(
        {
          postedIds: [],
          lastPostedAt: 0
        },
        null,
        2
      )
    );
  }

  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function isDuplicate(id) {
  const store = loadStore();
  return store.postedIds.includes(id);
}

export function savePosted(id) {
  const store = loadStore();
  if (!store.postedIds.includes(id)) {
    store.postedIds.push(id);
    store.lastPostedAt = Date.now();
    saveStore(store);
  }
}

export function canPostNow(intervalMs) {
  const store = loadStore();
  return Date.now() - store.lastPostedAt >= intervalMs;
}
