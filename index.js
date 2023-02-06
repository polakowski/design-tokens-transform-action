/* eslint-disable no-undef, @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exit } = require('process');
const { transformTokens } = require('./src/transformTokens');
/* eslint-enable no-undef, @typescript-eslint/no-var-requires */

const getEnv = (name, defaultValue) => {
  if (name in process.env) {
    return process.env[name];
  }

  return defaultValue;
};

const sourceFile = getEnv('INPUT_SOURCE_FILE', './tokens.json');
const targetFile = getEnv('INPUT_TARGET_FILE', './variables.sass');
const tokensFile = './__transformed__.json';

const debugMode = !!getEnv('DEBUG');

if (!fs.existsSync(sourceFile)) {
  console.error(`Could not open file: ${sourceFile}`);
  exit(-1);
}

(async () => {
  const npmRoot = execSync('npm root -g').toString().trim();
  const transformer = path.join(npmRoot, 'token-transformer');

  execSync('npm install -g token-transformer@0.0.26');
  execSync(`node ${transformer} ${sourceFile} ${tokensFile}`);

  const outputJson = fs.readFileSync(tokensFile);
  const tokens = JSON.parse(outputJson);

  const lines = transformTokens(tokens, {
    debugMode,
  });

  const targetDir = path.dirname(targetFile);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
  }

  console.info(`Writing "${targetFile}"...`);

  fs.writeFileSync(targetFile, lines.join('\n'));

  console.info(`Cleanup - removing "${tokensFile}"...`);

  fs.unlinkSync(tokensFile);

  console.info('Done!');
})();
