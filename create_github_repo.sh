#!/bin/bash

source /private/.env

curl -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "{\"name\": \"$REPO_NAME\", \"description\": \"$REPO_DESCRIPTION\", \"private\": true}" \
    https://api.github.com/user/repos

git config --global user.email $GIT_AUTHOR_EMAIL
git config --global user.name $GIT_AUTHOR_NAME
git config --global init.defaultBranch main

mkdir $REPO_NAME
cd $REPO_NAME

source /app/build.sh > /app/build.log 2>&1

# cd to the top-level directory of the git repo
cd $(git rev-parse --show-toplevel)

mkdir _clonegpt
cd _clonegpt
cp /app/build.sh ./
git add build.sh
cp /app/build.log ./
git add build.log
git commit -m "👷🏼 Finished code generation, adding logs"

echo "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com" >> ~/.git-credentials
git config --global credential.helper store

git branch -M main
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
git push -u origin main