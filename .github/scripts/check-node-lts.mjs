import https from 'node:https';
import fs from 'node:fs';

const url = 'https://nodejs.org/dist/index.json';

https.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) throw new Error(`Node index request failed: ${res.statusCode}`);
    const releases = JSON.parse(data);
    const lts = releases.find(r => r.lts !== false);
    if (!lts) throw new Error('No Node LTS release found');

    const major = lts.version.match(/^v(\d+)/)?.[1];
    if (!major) throw new Error(`Invalid Node version: ${lts.version}`);

    fs.writeFileSync('node-lts-version.txt', `${major}\n`);
    console.log(`Current Node LTS: ${lts.version} (major ${major})`);
  });
}).on('error', err => { throw err; });
