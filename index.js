/* eslint-disable no-undef, @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exit } = require('process');
/* eslint-enable no-undef, @typescript-eslint/no-var-requires */

const PATH_SEP = '/';

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

const SUPPORTED_TYPES = [
  'sizing',
  'color',
  'fontFamilies',
  'lineHeights',
  'fontWeights',
  'fontSizes',
  'boxShadow',
  'letterSpacing',
  'paragraphSpacing',
  'textCase',
  'textDecoration',
  'borderRadius',
  'typography',
];

if (!fs.existsSync(sourceFile)) {
  console.error(`Could not open file: ${sourceFile}`);
  exit(-1);
}

(async () => {
  execSync('yarn install --ignore-engines');
  execSync(`yarn token-transformer ${sourceFile} ${tokensFile}`)

  const outputJson = fs.readFileSync(tokensFile);
  const tokens = JSON.parse(outputJson);

  const categories = [];

  const px = (value) => value + 'px';
  const em = (value) => value + 'em';

  const ensureUnit = (value, transformer) => {
    if (
      typeof value === 'number'
        || /^[0-9.]+$/.test(value)
    ) {
      return transformer(value);
    }

    return value;
  };

  const percentsToEm = (value) => {
    if (/^-?[0-9.]+%$/.test(value) !== true) return value;

    const withoutPercentSign = value.replace(/%$/, '');
    const asNumber = Number(withoutPercentSign);

    return em(asNumber * 0.01);
  };

  const objectToMap = (value) => {
    const entries = [];

    for (const name in value) {
      entries.push(`"${name}": ${value[name]}`);
    }

    const mapContent = entries.join(', ');

    return `(${mapContent})`;
  };

  const parseValue = (value, type) => {
    if (type === 'boxShadow') {
      if (!Array.isArray(value)) {
        return value;
      }

      return value.map((data) => {
        return [
          px(data.x),
          px(data.y),
          px(data.blur),
          px(data.spread),
          data.color,
        ].join(' ');
      }).join(',');
    }

    if (type === 'fontSizes') {
      return ensureUnit(value, px);
    }

    if (type === 'letterSpacing') {
      return percentsToEm(value);
    }

    if (type === 'typography') {
      return objectToMap(value);
    }

    if (type === 'paragraphSpacing') {
      return ensureUnit(value, px);
    }

    return `${value}`;
  };

  const handleTree = (tree, currentPath, category) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    if ('value' in tree) {
      if (SUPPORTED_TYPES.includes(tree.type)) {
        category.variables.push({
          name: currentPath.join('-'),
          type: tree.type,
          value: parseValue(tree.value, tree.type),
        });
      }

      return;
    }

    for (const [name, value] of Object.entries(tree)) {
      const nextCategory = category || {
        name: name,
        variables: [],
      };

      if (!category) {
        categories.push(nextCategory);
      }

      handleTree(value, currentPath.concat(name), nextCategory);
    }
  };

  handleTree(tokens, []);

  const variableObjectToSassVariable = (variable) => {
    return [
      `$${variable.name}:`.padEnd(40),
      variable.value,
      debugMode ? ` // type: ${variable.type}` : '',
    ].join('');
  };

  const lines = [];

  for (const category of categories) {
    if (category.variables.length === 0) {
      continue;
    }

    lines.push(`// ----- ${category.name} `.padEnd(80, '-'));

    const variableLines = category.variables.map(variableObjectToSassVariable);

    lines.push(...variableLines);
    lines.push('');
  }

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
