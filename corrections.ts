// Post-processing:

function applyCorrections(buildScript: string) {

  // Detect commands like: echo -e "..." > ...
  const echoRedirection = /^((?<COMMAND>echo -e "(?:\\.|[^\\"])*") > (?<DIRECTORY>.*\/).*)$/mg;
  // Detect commands like: echo -e '...' > ...
  const echoRedirectionSingleQuote = /^((?<COMMAND>echo -e '(?:\\.|[^\\'])*') > (?<DIRECTORY>.*\/).*)$/mg;

  // What a hack! But small corrections like this will necessary for a while.
  return buildScript.replace(/^npx /mg, 'npx --yes ')
    .replace(/(^\`\`\`[a-z]*\n|\n\`\`\`$)/g, '')
    .replace(/^echo( -e)? /mg, 'echo -e ')
    .replace(/^npm install /mg, 'npm install --package-lock-only ')
    .replace(echoRedirection, 'mkdir -p $<DIRECTORY> && $1')
    .replace(echoRedirectionSingleQuote, 'mkdir -p $<DIRECTORY> && $1')
    .replace(/^git (remote|push|checkout|merge|branch) .*$/mg, '')
    .replace(/^(az|aws|systemctl) .*$/mg, '')
    .replace(/^git commit (.*)$/mg, 'git commit -a $1')
    .replace(/^sed -i '' /mg, 'sed -i ');
}

export { applyCorrections };
