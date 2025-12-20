import fs from "fs";

const STORE_PATH = "./posted.json";

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
}

function saveStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function isDuplicate(id) {
  const store = loadStore();
  return store.includes(id);
}

export function savePosted(id) {
  const store = loadStore();
  if (!store.includes(id)) {
    store.push(id);
    saveStore(store);
  }
}
