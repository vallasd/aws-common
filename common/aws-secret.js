// aws-secret.js (helper class to save and store secrets to AWS SecretManager)

// The MIT License (MIT)
// Copyright (c) 2018 David C. Vallas (david_vallas@yahoo.com) (dcvallas@twitter)

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
// following conditions:

// The above copyright notice and this permission notice shall be included in all copies
// or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const fs = require('fs');
const debug = (process.env.debug == 'true');

module.exports = {

  // returns a promise to get the secret for a specific secretId in AWS
  secret: function(secretId) {
    return _secret(secretId);
  }

}

// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/

// Load the AWS SDK
var AWS = require('aws-sdk'),
    endpoint = "https://secretsmanager.us-east-1.amazonaws.com",
    region = "us-east-1",
    secret,
    binarySecretData;

// Load the config file if debug is simulator (we don't include this file in production)
if (fs.existsSync('./aws_config.json')) AWS.config.loadFromPath('./aws_config.json');

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    endpoint: endpoint,
    region: region
});

// returns a promise to get the secret for a specific secretId in AWS
function _secret(secretId) {

  let promise = new Promise(function(resolve, reject) {
    var params = { SecretId: secretId };
    client.getSecretValue(params, function(err, data) {

      if (debug) console.log(Date(), 'retrieving: |' + secretId + '| from AWS Secret Manager');

      if(err) {
        console.log(Date(), "Error: " + err.message);
      } else {
        if(data.SecretString !== "") secret = data.SecretString;
        else binarySecretData = data.SecretBinary;
      }

      if (secret != null) {
        let json = JSON.parse(secret);
        if (debug) console.log(Date(), '|' + secretId + '| secret: ' + JSON.stringify(json));
        resolve(json);
        return;
      }

      if (binarySecretData != null) {
        // we are not currently handling binarySecretData
      }

      console.log(Date(), 'Error: |' + secretId + '| not retrieved from AWS Secret Manager');
      resolve({});
    });
  });

  return promise;
}
