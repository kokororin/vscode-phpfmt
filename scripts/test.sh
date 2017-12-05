#!/usr/bin/env bash

export CODE_TESTS_WORKSPACE=testProject

if [ $TRAVIS ]; then
  node ./node_modules/vscode/bin/test
else
  node ./node_modules/vscode/bin/test || true
fi
