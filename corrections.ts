// Post-processing:

function applyCorrections(buildScript: string) {

  // Detect commands like: echo -e "..." > ...
  const echoRedirection = /^((?<COMMAND>echo -e "(?:\\.|[^\\"])*") > (?<DIRECTORY>.*\/).*)$/mg;

  // What a hack! But small corrections like this will necessary for a while.
  return buildScript.replace(/^npx /mg, 'npx --yes ')
    .replace(/^echo( -e)? /mg, 'echo -e ')
    .replace(/^npm install /mg, 'npm install --package-lock-only ')
    .replace(echoRedirection, 'mkdir -p $<DIRECTORY> && $1')
    .replace(/^git (remote|push|checkout|merge|branch) .*$/mg, '')
    .replace(/^(az|aws|systemctl) .*$/mg, '')
    .replace(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
    .replace(/^git commit (.*)$/mg, 'git commit -a $1');
}

export { applyCorrections };
