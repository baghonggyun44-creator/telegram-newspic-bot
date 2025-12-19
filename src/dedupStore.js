// src/dedupStore.js
import fs from "fs";

const FILE = "./posted.json";

function load() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function isDuplicate(id) {
  const posted = load();
  return posted.includes(id);
}

export function savePosted(id) {
  const posted = load();
  posted.push(id);
  save(posted);
}
