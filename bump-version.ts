// deno run --allow-read --allow-write bump-version.ts [major|minor|patch]

let [bumpType] = Deno.args;
if (!bumpType) {
  const answer = prompt('No argument provided. Default to patch? [Y/n]')?.trim().toLowerCase();
  if (answer === '' || answer === 'y' || answer === 'yes') {
    bumpType = 'patch';
    console.log('Defaulting to patch.');
  } else {
    console.log('Aborted.');
    Deno.exit(0);
  }
}
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: deno task bump [major|minor|patch]');
  Deno.exit(1);
}

const denoJsonPath = './deno.json';
const denoJsonRaw = await Deno.readTextFile(denoJsonPath);
const denoJson = JSON.parse(denoJsonRaw);

if (!denoJson.version) {
  console.error('No version key found in deno.json');
  Deno.exit(1);
}

const versionParts = denoJson.version.split('.').map(Number);
if (versionParts.length !== 3 || versionParts.some(isNaN)) {
  console.error('Invalid version format in deno.json. Expected format: x.y.z');
  Deno.exit(1);
}

const oldVersion = denoJson.version;
let [major, minor, patch] = versionParts;

switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
denoJson.version = newVersion;

await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoJson, null, 2) + '\n');
console.log(`Bumped version from ${oldVersion} to ${newVersion}`);
