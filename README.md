# GitHub Action - design-tokens-transform
GitHub action that transforms your design tokens into CSS-like variables.

## Overview
This github action transforms design tokens JSON file and converts it to file with variables.

## Supported outputs
Currently only SASS output is supported.

## Config
Here's config options:
| Config option | Description                                | Required | Default            |   |
|---------------|--------------------------------------------|----------|--------------------|---|
| source_file   | Path to JSON file containing design tokens | -        | `./tokens.json`    |   |
| target_file   | Path to output file containing values      | -        | `./variables.sass` |   |

## Example workflow
name: design-tokens-transform

```yml
name: design-tokens

jobs:
  generate:
    runs-on: ubuntu-latest

    steps:
      # checkout current branch
      - uses: actions/checkout@v2
        with:
          ref: ${{ github.head_ref }}

      # generate output files
      - name: Run figma tokens transformer
        uses: polakowski/design-tokens-transform-action@latest
        with:
          source_file: './src/tokens.json'
          target_file: './src/__generated__/variables.sass'

      # commit generated files to branch
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: 'generate design tokens output'
```
