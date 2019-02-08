// aws-secret.js (helper class to retrieve and store secrets to AWS SecretManager)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

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

// determines the region to be used
function determineRegion(regionOverride) {
  return (regionOverride || process.env.region || 'us-east-1');
}

// returns a promise to get the secret for a specific secretId in AWS
function get(secretId, regionOverride) {
  const region = determineRegion(regionOverride);
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
  const region = determineRegion(regionOverride);
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
