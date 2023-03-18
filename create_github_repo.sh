#!/bin/bash

source /home/.env

curl -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "{\"name\": \"$REPO_NAME\", \"description\": \"$REPO_DESCRIPTION\"}" \
    https://api.github.com/user/repos

git config --global user.email $GIT_AUTHOR_EMAIL
git config --global user.name $GIT_AUTHOR_NAME
git config --global init.defaultBranch main

source /home/build.sh

echo "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com" >> ~/.git-credentials
git config --global credential.helper store

git branch -M main
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
git push -u origin main