export const gitScript = `#!/bin/bash

git config --global user.email $GIT_AUTHOR_EMAIL
git config --global user.name $GIT_AUTHOR_NAME
git config --global init.defaultBranch main

mkdir $REPO_NAME
cd $REPO_NAME

source /app/build.sh > /app/build.log 2>&1

# cd to the top-level directory of the git repo
cd $(git rev-parse --show-toplevel)

mkdir _gitwit
cp /app/build.sh ./_gitwit/build.sh
git add -f ./_gitwit/build.sh
cp /app/build.log ./_gitwit/build.log
git add -f ./_gitwit/build.log
cp /app/info.json ./_gitwit/info.json
git add -f ./_gitwit/info.json
git commit -m "Finished code generation, adding logs"

echo "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com" >> ~/.git-credentials
git config --global credential.helper store

git branch -M main
git remote add origin $REPO_URL
git push -u origin main`
