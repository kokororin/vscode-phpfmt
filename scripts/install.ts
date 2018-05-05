import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const url = 'https://api.kotori.love/github/fmt.phar';

console.log('Fetching fmt.phar from: ' + url);

fetch(url)
  .then(res => {
    const dest = fs.createWriteStream(path.join(__dirname, '/../fmt.phar'), {
      autoClose: true
    });
    res.body.pipe(dest);
    console.log('fmt.phar successfully installed!\n');
  })
  .catch(err => {
    console.error('Error installing fmt.phar: ' + err.toString());
    process.exit(1);
  });
