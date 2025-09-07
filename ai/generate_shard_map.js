// generate_shard_map.js
const fs = require('fs');
const path = require('path');

function genMapVar(varName, folder) {
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.json'));
  const entries = files
    .map(f => {
      const shardId = f.replace('.json', '');
      return `  '${shardId}': () => require('${path.relative(__dirname, path.join(folder, f)).replace(/\\/g, '/')}')`;
    })
    .join(',\n');
  return `export const ${varName} = {\n${entries}\n};\n`;
}

const sfsFolder = path.join(__dirname, '../assets/qtable_shards/SFS');
const fsfFolder = path.join(__dirname, '../assets/qtable_shards/FSF');

let output = '';
output += genMapVar('SFS_SHARDS', sfsFolder);
output += '\n';
output += genMapVar('FSF_SHARDS', fsfFolder);

fs.writeFileSync(path.join(__dirname, 'qtable.shards.js'), output);
console.log('qtable.shards.js generated');
