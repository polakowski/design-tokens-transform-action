/* eslint-disable no-undef, @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exit } = require('process');
/* eslint-enable no-undef, @typescript-eslint/no-var-requires */

const sourceFile = process.env.INPUT_SOURCE_FILE;
const targetFile = process.env.INPUT_TARGET_FILE;
const tokensFile = './__transformed__.json';

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
  execSync('yarn install');
  execSync(`yarn token-transformer ${sourceFile} ${tokensFile}`)

  const outputJson = fs.readFileSync(tokensFile);
  const tokens = JSON.parse(outputJson);

  const categories = [];

  const px = (value) => value + 'px';

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

    if (type === 'typography') {
      return objectToMap(value);
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
      // ' ',
      // `// type: ${variable.type}`,
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

  console.info(`Writing "${targetFile}"...`)
  fs.writeFileSync(targetFile, lines.join('\n'));

  console.info(`Cleanup - removing "${tokensFile}"...`)
  fs.unlinkSync(tokensFile);

  console.info('Done!');
})();
