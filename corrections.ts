// Post-processing:

function applyCorrections(buildScript: string) {

  // Detect commands like: echo -e "..." > ...
  const echoRedirection = /^((?<COMMAND>echo -e "(?:\\.|[^\\"])*") > (?<DIRECTORY>.*\/).*)$/mg;

  // What a hack! But small corrections like this will necessary for a while.
  return buildScript.replace(/^npx /mg, 'npx --yes ')
    .replace(/^echo /mg, 'echo -e ')
    .replace(echoRedirection, 'mkdir -p $<DIRECTORY> && $1')
    .replace(/^git push .*$/mg, '')
    .replace(/^git remote .*$/mg, '')
    .replace(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
    .replace(/^git commit (.*)$/mg, 'git commit -a $1');
}

export { applyCorrections };
