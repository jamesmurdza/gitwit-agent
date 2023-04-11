const newProjectPrompt = `
Help me to create a repository containing the code for:
- {DESCRIPTION}

The project name is: {REPOSITORY_NAME}

Give me instructions to generate the code for this project, but use only shell commands. No need to give further explanation. All of your output should be given as a single /bin/sh script.

For example, when want to edit a file, use the command \`echo "file contents" > filename.ext\`. Create intermediate directories before writing files.

At the beginning of the script, create a git repo before running any other commands. Then, create a .gitignore file.

Assume all commands will be run on a clean \`{BASE_IMAGE}\` system with no packages installed.

Follow each command in the instructions with a git commit command including a detailed commit message. Follow each file change in the instructions with a git commit command including a detailed commit message.

Do not include any commands to run, start or deploy or test the app.

Do not use an exit command at the end of the script.
`;

const changeProjectPrompt = `
Given the git history above, help me to modify the project in the following manner:
- {DESCRIPTION}

Give me instructions to modify the project, but use only shell commands. No need to give further explanation. All of your output should be given as a single /bin/sh script.

For example, when want to edit a file, use the command \`echo "file contents" > filename.ext\`. Create intermediate directories before writing files.

Follow each command in the instructions with a git commit command including a detailed commit message. Follow each file change in the instructions with a git commit command including a detailed commit message.

Do not include any commands to run, start or deploy or test the app.

Do not use an exit command at the end of the script.
`;

export { newProjectPrompt, changeProjectPrompt };
