// Post-processing:

function applyCorrections(buildScript: string) {
  // What a hack! But small corrections like this will necessary for a while.
  return buildScript.replace(/^npx /mg, 'npx --yes ')
    .replace(/^echo /mg, 'echo -e ')
    .replace(/^git push .*$/mg, '')
    .replace(/^git remote .*$/mg, '')
    .replace(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
    .replace(/^git commit (.*)$/mg, 'git commit -a $1');
}

export { applyCorrections };
