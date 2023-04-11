// Setup the git config.
export const SETUP_GIT_CONFIG = `
git config --global user.email {GIT_AUTHOR_EMAIL}
git config --global user.name {GIT_AUTHOR_NAME}
git config --global init.defaultBranch main
`;

// Make a new directory.
export const MAKE_PROJECT_DIR = `
cd ~
mkdir {REPO_NAME}
cd {REPO_NAME}
`;

// Run the build script and change to the script's final directory.
export const RUN_BUILD_SCRIPT = `
source /app/build.sh > /app/build.log 2>&1
`;

// Change to the top-level directory of the git repository.
export const CD_GIT_ROOT = `
cd $(git rev-parse --show-toplevel)
`

// Add and commit the build logs to the git repository.
export const ADD_BUILD_LOGS = `
mkdir _gitwit
cp /app/build.sh ./_gitwit/build.sh
git add -f ./_gitwit/build.sh
cp /app/build.log ./_gitwit/build.log
git add -f ./_gitwit/build.log
cp /app/info.json ./_gitwit/info.json
git add -f ./_gitwit/info.json
git commit -m "Finished code generation, adding logs"
`

// Configure the git credentials.
export const SETUP_GIT_CREDENTIALS = `
echo "https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com" >> ~/.git-credentials
git config --global credential.helper store
`

// Push the main branch to the remote repository.
export const PUSH_TO_REPO = `
git branch -M main
git remote add origin {REPO_URL}
git push -u origin main
`

// Clone an existing repository.
export const CLONE_PROJECT_REPO = `
cd ~
git clone https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com/{GITHUB_ACCOUNT}/{REPO_NAME}.git
cd {REPO_NAME}
`

// Get the git history of the repository.
export const GET_GIT_HISTORY = `
cd ~/{REPO_NAME}
git log -p -- . ":(exclude)_gitwit/"
`

// Create a new git branch.
export const CREATE_NEW_BRANCH = `
cd ~/{REPO_NAME}
git branch {BRANCH_NAME}
git checkout {BRANCH_NAME}
`

// Push the new branch to the remote repository.
export const PUSH_BRANCH = `
git push -u origin {BRANCH_NAME}
`
