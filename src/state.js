import fs from "fs";

export function loadState(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch {
    return { posted: [] };
  }
}

export function saveState(path, state) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path, JSON.stringify(state, null, 2));
}

export function isPosted(state, url) {
  return state.posted.includes(url);
}

export function markPosted(state, url) {
  state.posted.push(url);
  if (state.posted.length > 1000) state.posted.shift();
}
