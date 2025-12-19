/**
 * dedupStore.js
 * 이미 올린 뉴스 중복 방지용 로컬 저장소
 * GitHub Actions 환경에서도 동작
 */

import fs from "fs";
import path from "path";

const STORE_PATH = path.resolve(process.cwd(), "posted.json");


/**
 * 저장된 파일 읽기
 */
function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return [];
  }
  try {
    const data = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * 저장
 */
function saveStore(list) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2));
}

/**
 * 이미 올린 기사인지 체크
 * @param {string} key - 기사 고유값 (nid 등)
 * @returns {boolean}
 */
export function isDuplicate(key) {
  const store = loadStore();
  return store.includes(key);
}

/**
 * 기사 저장
 * @param {string} key
 */
export function savePosted(key) {
  const store = loadStore();
  if (!store.includes(key)) {
    store.push(key);
    saveStore(store);
  }
}
