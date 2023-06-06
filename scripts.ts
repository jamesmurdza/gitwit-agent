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

export const GET_BUILD_LOG = `
cat /app/build.log
`

// Configure the git credentials.
export const SETUP_GIT_CREDENTIALS = `
echo "https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com" >> ~/.git-credentials
git config --global credential.helper store
`

// Push the main branch to the remote repository.
export const PUSH_TO_REPO = `
git branch -M main
git remote add origin {PUSH_URL}
git push -u origin main
`

// Clone an existing repository.
export const CLONE_PROJECT_REPO = `
cd ~
git clone https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com/{FULL_REPO_NAME}.git
cd {REPO_NAME}
`

// Get the contents of the repository.
export const GET_FILE_LIST = `
cd ~/{REPO_NAME}
find . -path "./.git" -prune -o -type f -print
`

// Create a new git branch.
export const CREATE_NEW_BRANCH = `
cd ~/{REPO_NAME}
git checkout {SOURCE_BRANCH_NAME}
git checkout -b {BRANCH_NAME}
`

// Push the new branch to the remote repository.
export const PUSH_BRANCH = `
git push -u origin {BRANCH_NAME}
`
