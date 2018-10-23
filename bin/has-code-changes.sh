#!/bin/bash


# Check if this TRAVIS_COMMIT only contains README file changes
set -e

CHANGED_FILES=`git diff --name-only master...${TRAVIS_COMMIT}`
ONLY_READMES=True
MD=".md"

for CHANGED_FILE in $CHANGED_FILES; do
  if ! [[ $CHANGED_FILE =~ $MD ]]; then
    ONLY_READMES=False
    break
  fi
done

if [[ $ONLY_READMES == True ]]; then
  echo "Non-.md files found, proceeding with build."
  exit 0
else
  echo "Only .md files found, no need to run build."
  exit 1
fi