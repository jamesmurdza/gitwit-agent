const newProjectPrompt = `
Help me to create a repository containing the code for:
- {DESCRIPTION}

The project name is: {REPOSITORY_NAME}

Give me instructions to generate complete, working code for this project, but use only shell commands. No need to give further explanation. All of your output should be given as a single /bin/sh script.

For example, when want to edit a file, use the command \`echo "file contents" > filename.ext\`. Create intermediate directories before writing files.

At the beginning of the script, create a git repo in the current directory before running any other commands. Then, create a .gitignore file.

Assume all commands will be run on a clean \`{BASE_IMAGE}\` system with no packages installed.

Follow each command in the instructions with a git commit command including a detailed commit message. Follow each file change in the instructions with a git commit command including a detailed commit message.

The repository should also contain a helpful README.md file. The README should include a high-level descrition of the code, a list of software needed to run the code, and basic instructions on how to run the application. The README should not include any text or information about a software license. This project has no license.

Do not include any commands to run, start or deploy or test the app.

Do not use an exit command at the end of the script.
`;

const changeProjectPrompt = `
{GIT_HISTORY}

The above is my git change history. Help me to modify the repository with the following changes only:
- {DESCRIPTION}

Give me instructions to modify the repository, but use only shell commands. Use as few commands as possible. Use the shortest commands possible. Provide a single /bin/sh script with no extra explanation.

Do not include any commands to run, start or deploy or test the app.

Follow each command in the instructions with a git commit command including a detailed commit message.
`;

export { newProjectPrompt, changeProjectPrompt };
