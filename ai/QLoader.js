// ai/QLoader.js
import { SFS_SHARDS, FSF_SHARDS } from './qtable.shards';

const cache = { SFS: {}, FSF: {} };

// ここは qtable_build.js の hash2 と完全一致させること！（djb2）
function hash2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  const n = (h >>> 0) & 0xff;
  return n.toString(16).padStart(2, '0');
}

const DEV_SCAN_ON_MISS = true; // ← デバッグ中は true に

function loadShard(family, loaders, shardId) {
  if (!cache[family][shardId]) {
    const loader = loaders[shardId];
    if (!loader) return undefined;
    const mod = loader();
    cache[family][shardId] = (mod && mod.default) ? mod.default : mod; // ★ default を剥がす
  }
  return cache[family][shardId];
}

function scanAllShardsForKey(family, loaders, key) {
  for (const [sid, loaderFn] of Object.entries(loaders)) {
    const shard = loadShard(family, loaders, sid);
    if (shard && Object.prototype.hasOwnProperty.call(shard, key)) {
      return sid; // 見つかった実シャード
    }
  }
  return null;
}

function makeProxy(family) {
  const LOADERS = family === 'SFS' ? SFS_SHARDS : FSF_SHARDS;

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;

        const expected = hash2(prop);
        const shard = loadShard(family, LOADERS, expected);
        let val = shard ? shard[prop] : undefined;

        if (val === undefined && DEV_SCAN_ON_MISS) {
          const actual = scanAllShardsForKey(family, LOADERS, prop);
          if (actual) {
            console.warn(
              `[QTable DEBUG] key found in shard ${actual} but expected ${expected}. ` +
              `→ 生成スクリプトとランタイムの hash2 が不一致です。シャードを作り直してください。`
            );
          } else {
            console.warn(
              `[QTable DEBUG] key NOT FOUND in any shard (family=${family}). ` +
              `→ そのキーはテーブルに存在しない可能性があります（AIタイプ違い or 旧版）`
            );
          }
        }

        return val;
      },
      has(_target, prop) {
        if (typeof prop !== 'string') return false;

        const expected = hash2(prop);
        const shard = loadShard(family, LOADERS, expected);
        let ok = shard ? Object.prototype.hasOwnProperty.call(shard, prop) : false;

        if (!ok && DEV_SCAN_ON_MISS) {
          const actual = scanAllShardsForKey(family, LOADERS, prop);
          if (actual) {
            console.warn(
              `[QTable DEBUG] (has) key in ${actual} but expected ${expected} → ハッシュ不一致。`
            );
            ok = true; // 実在はする
          }
        }

        return ok;
      },
      ownKeys() { return []; },
      getOwnPropertyDescriptor() { return { enumerable: false, configurable: true }; },
    }
  );
}

export function loadQTable(aiType) {
  if (aiType === 'first')  return makeProxy('FSF');
  if (aiType === 'second') return makeProxy('SFS');
  throw new Error('Unknown AI type');
}

