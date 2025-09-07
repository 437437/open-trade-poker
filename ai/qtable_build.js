// ai/qtable_build.js
// 使い方:
//   node ai/qtable_build.js \
//     --sfs assets/data/0808_qtable_SFS_1e8.json \
//     --fsf assets/data/0808_qtable_FSF.json
//
// 出力:
//   assets/qtable_shards/SFS/00.json..ff.json
//   assets/qtable_shards/FSF/00.json..ff.json
//   ai/qtable.shards.js（requireマップ）

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i], v = args[i + 1];
    out[k] = v;
  }
  return out;
}

// djb2（QLoader側と一致させること）
function hash2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  const n = (h >>> 0) & 0xff; // 0..255
  return n.toString(16).padStart(2, '0');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function splitOne(inputPath, outDir) {
  console.log(`Splitting: ${inputPath} -> ${outDir}`);
  ensureDir(outDir);
  const text = fs.readFileSync(inputPath, 'utf8');
  const obj = JSON.parse(text);

  // 256バケツ
  const buckets = Array.from({ length: 256 }, () => ({}));

  let c = 0;
  for (const [k, v] of Object.entries(obj)) {
    const b = parseInt(hash2(k), 16);
    buckets[b][k] = v;
    if ((++c % 500000) === 0) console.log(`  processed ${c} entries...`);
  }
  console.log(`  total entries: ${c}`);

  // 全シャード書き出し（空でも作る）
  for (let i = 0; i < 256; i++) {
    const shard = i.toString(16).padStart(2, '0');
    const file = path.join(outDir, `${shard}.json`);
    fs.writeFileSync(file, JSON.stringify(buckets[i]));
  }
  console.log(`  wrote 256 shards`);
}

function genMapVar(varName, folder, relFrom) {
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.json')).sort();
  const entries = files.map(f => {
    const shardId = f.replace('.json', '');
    // QLoader から見た相対パス（このスクリプトの出力先は ai/qtable.shards.js）
    const reqPath = path
      .relative(path.dirname(relFrom), path.join(folder, f))
      .replace(/\\/g, '/');
    return `  '${shardId}': () => require('${reqPath}')`;
  }).join(',\n');
  return `export const ${varName} = {\n${entries}\n};\n`;
}

function main() {
  const args = parseArgs();
  const sfsIn = args['--sfs'];
  const fsfIn = args['--fsf'];

  if (!sfsIn && !fsfIn) {
    console.error('Usage: node ai/qtable_build.js --sfs <path-to-sfs.json> --fsf <path-to-fsf.json>');
    process.exit(1);
  }

  const sfsOut = path.join('assets', 'qtable_shards', 'SFS');
  const fsfOut = path.join('assets', 'qtable_shards', 'FSF');

  if (sfsIn) splitOne(sfsIn, sfsOut);
  if (fsfIn) splitOne(fsfIn, fsfOut);

  // マップ生成
  const mapOutPath = path.join('ai', 'qtable.shards.js');
  let outText = '';
  if (fs.existsSync(sfsOut)) outText += genMapVar('SFS_SHARDS', sfsOut, mapOutPath) + '\n';
  if (fs.existsSync(fsfOut)) outText += genMapVar('FSF_SHARDS', fsfOut, mapOutPath) + '\n';
  fs.writeFileSync(mapOutPath, outText);
  console.log(`Generated: ${mapOutPath}`);
}

main();
