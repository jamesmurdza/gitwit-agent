// Post-processing:

function applyCorrections(buildScript: string) {
    // What a hack! But small corrections like this will necessary for a while.
    return buildScript.replaceAll(/^npx /mg, 'npx --yes ')
        .replaceAll(/^echo /mg, 'echo -e ')
        .replaceAll(/^git push .*$/mg, '')
        .replaceAll(/^git remote .*$/mg, '')
        .replaceAll(/^git commit -m "(.*)$/mg, 'git commit -m "👷🏼 $1')
        .replaceAll(/^git commit (.*)$/mg, 'git commit -a $1');
}

export { applyCorrections };
