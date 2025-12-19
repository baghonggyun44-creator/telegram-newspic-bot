import fs from "fs";

const FILE = "./data/posted.json";

export function isPosted(url) {
  if (!fs.existsSync(FILE)) return false;
  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  return data.includes(url);
}

export function markPosted(url) {
  let data = [];
  if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  }
  data.push(url);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
