// aws-secret.js (helper class to retrieve and store secrets to AWS SecretManager)

// The MIT License (MIT)
// Copyright (c) 2018 David C. Vallas (david_vallas@yahoo.com) (dcvallas@twitter)

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies
// or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const fs = require('fs');
const aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved

// set debug
const debug = (process.env.debug === 'true');

// load the config file if debug is simulator (we don't include this file in production)
if (fs.existsSync('./aws-config.json')) aws.config.loadFromPath('./aws-config.json');

// create a Secrets Manager client
function client(region) {
  return new aws.SecretsManager({
    endpoint: `https://secretsmanager.${region}.amazonaws.com`,
    region,
  });
}

// returns a promise to get the secret for a specific secretId in AWS
function get(secretId, regionOverride) {
  const region = (regionOverride || process.env.region || 'us-east-1');
  // create promise to retrieve secret
  const promise = new Promise(((resolve) => {
    const params = { SecretId: secretId };
    client(region).getSecretValue(params, (err, data) => {
      // initialize secret vars
      let secret = null;
      let binarySecretData = null;

      // console log
      if (debug) console.log(Date(), `retrieving |${secretId}| from AWS Secret Manager`);

      // attempt to retrieve secret data
      if (err) {
        console.log(Date(), `Error: ${err.message}`);
      } else if (data.SecretString !== '') {
        secret = data.SecretString;
      } else {
        binarySecretData = data.SecretBinary;
      }

      // handle secret, convert to json and resolve
      if (secret != null) {
        const json = JSON.parse(secret);
        if (debug) console.log(Date(), `|${secretId}| secret: ${JSON.stringify(json)}`);
        resolve(json);
        return;
      }

      // handle binary secret
      if (binarySecretData != null) {
        // we are not currently handling binarySecretData
      }

      // no secret found, return empty json, log, and resolve
      console.log(Date(), `Error: |${secretId}| secret not retrieved from |${region}|`);
      resolve({});
    });
  }));

  return promise;
}

// returns a promise to store the secret for a specific secretId in AWS.
// Logs error if storage fails.
function store(secretId, secretString, regionOverride) {
  const region = (regionOverride || process.env.region || 'us-east-1');
  const promise = new Promise(((resolve) => {
    const params = { SecretId: secretId, SecretString: secretString };
    client(region).putSecretValue(params, (err) => {
      if (err) {
        console.log(Date(), `Error: secret storage: ${err}`);
        console.log(Date(), `Error: |${secretId}| secret not stored at |${region}|`);
        resolve({});
        return;
      }
      resolve(JSON.parse(secretString));
    });
  }));

  return promise;
}

module.exports = {

  // returns a promise to get the secret for a specific secretId in AWS
  get(secretId, regionOverride) { return get(secretId, regionOverride); },

  // returns a promise to store the secret for a specific secretId in AWS
  store(secretId, secretString, regionOverride) {
    return store(secretId, secretString, regionOverride);
  },
};
