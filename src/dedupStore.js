import fs from "fs";

const FILE = "data/posted.json";
const EXPIRE_HOURS = 24;

function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save(data) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDuplicateByTitle(title) {
  const db = load();
  const key = normalizeTitle(title);

  if (!db[key]) return false;

  const diff =
    (Date.now() - db[key]) / (1000 * 60 * 60);

  return diff < EXPIRE_HOURS;
}

export function saveTitle(title) {
  const db = load();
  const key = normalizeTitle(title);
  db[key] = Date.now();
  save(db);
}
