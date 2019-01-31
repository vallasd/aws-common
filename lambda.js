// lambda.js (index class for AWS lambdas)

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

// we have unresolved files that will be add when combined with other libraries
/* eslint import/no-unresolved: 2 */

const fs = require('fs');
const helper = require('./common/aws-helper.js');
const secretManager = require('./common/aws-secret.js');
const requestHandler = require('./requestHandler.js');

const debug = (process.env.debug === 'true');

// used determine if Lambda needs initialization like AWS secret request
let needsInitialization = true;
let lastInitialization = new Date(); // when last initialization was performed
let secret = {}; // AWS secret manager secret for this Lambda

// will make handler reinitialize every 30 minutes (update secrets every 30 minutes)
function setInitialization() {
  // check if we just initialized
  if (needsInitialization === true) {
    lastInitialization = new Date();
    needsInitialization = false;
    if (debug) console.log(Date(), 'initialization set to false');
    return 'initialization set to false';
  }

  // check to see if initialization was done more than 30 minutes ago
  const diff = new Date().getTime() - lastInitialization.getTime();
  if (diff > 1800000) {
    if (debug) console.log(Date(), 'initialization set to true');
    needsInitialization = true;
    return 'initialization set to true';
  }

  if (debug) console.log(Date(), 'initialization not set');
  return `initialization not set, diff: ${diff} expects: >1800000`;
}

// assign json from environment to process.env environment variables
function loadEnvironment(environment) {
  Object.keys(environment).forEach((key) => {
    process.env[key] = environment[key];
  });
}

/*
    // Processes the response from the requestHandler
    REQUEST HANDLER CAN RETURN
    { request: requestParams Dictionary (as outlined by helperMethods.returnResponse) }
    OPTIONAL USED IN ADDITION TO response: (used to let processResponse know that we will
    make additional requests)
    { responseIdentifier: any }
    OR
    { response: { body: , returnType: (type of body), statusCode: number, headers: dictionary } }
*/
async function processResponse(event, endpoint, response) {
  // set the currentResponse
  let currentResponse = response;

  try {
    // get response parameters from handler
    currentResponse = await requestHandler.response(event, secret, endpoint, response);
    const { responseIdentifier } = currentResponse;

    // log response
    if (debug) console.log(Date(), `Processing |${endpoint}| method: |${event.httpMethod}| nextIdentifier: |${responseIdentifier}|`);

    // process request from requestHandler
    if (currentResponse.request) {
      currentResponse = await helper.returnResponse(currentResponse.request);
      // continue next requestHandler processing step (recursive)
      if (responseIdentifier) {
        currentResponse.responseIdentifier = responseIdentifier;
        if (debug) console.log(Date(), `passing |${endpoint}|`);
        currentResponse = await processResponse(event, endpoint, currentResponse);
      }
    // assign response from requestHandler
    } else if (currentResponse.response) {
      delete currentResponse.response.responseIdentifier;
      currentResponse = currentResponse.response;
    // we dont know how to process requestHandler data, throw err
    } else {
      throw new Error(`requestHandler for |${endpoint}| did not process`);
    }
  } catch (err) { throw err; }

  return currentResponse;
}

exports.handler = async (event) => {
  // reassign event to processedEvent
  let processedEvent = event;

  // allows the user to spoof the event, so we can directly test errors
  // from the logs, use with sam client
  if (needsInitialization && fs.existsSync('./aws-event.json')) {
    console.log(Date(), 'WARNING: loading aws-event');
    processedEvent = require('./aws-event.json');
  }

  // define a response that is returned if we don't process one
  const error = new Error('response not processed');
  error.code = 501;
  let response = helper.internalServerErrorResponse(error, event);

  try {
    // check if the lambda needs initialization
    if (needsInitialization) {
      // load environment
      if (fs.existsSync('./aws-environment.json')) {
        if (debug) console.log('loading aws-environment');
        loadEnvironment(require('./aws-environment.json'));
      }

      // load secrets
      if (requestHandler.hasSecret) {
        secret = await secretManager.secret(requestHandler.secretPath());
      }
    }

    // get endpoint based off of requestHandler supplied endpointData
    const endpoint = helper.endpointName(processedEvent,
      requestHandler.basePath(),
      requestHandler.endpointData);

    // process the request to get the response
    response = await processResponse(processedEvent, endpoint);

    // determine if intialization is needed during next call
    setInitialization();

    // convert json to string
    if (typeof response.body === 'object') {
      if (debug) console.log(Date(), 'converting JSON body to string');
      response.body = JSON.stringify(response.body);
    }
  } catch (err) {
    // create an error response
    response = helper.internalServerErrorResponse(err, processedEvent, secret);
  }

  // return response
  return response;
};
