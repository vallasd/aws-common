// lambda.js (index class for AWS lambdas)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const fs = require('fs');
const helper = require('./common/aws-helper.js');
const processor = require('./common/aws-response-processor.js');
const actionHandler = require('./actionHandler.js');

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
    // Processes the response from the actionHandler
    REQUEST HANDLER CAN RETURN
    { request: requestParams Dictionary (as outlined by helperMethods.returnResponse) }
    OPTIONAL USED IN ADDITION TO response: (used to let processResponse know that we will
    make additional requests)
    { responseIdentifier: any }
    OR
    { response: { body: , returnType: (type of body), statusCode: number, headers: dictionary } }
*/
async function processResponse(event, endpoint, previousResponse) {
  // determine the response
  let response = {};

  try {
    // get action parameters from request handler
    const action = actionHandler.action(
      event,
      secret,
      endpoint,
      previousResponse,
    );

    // log process
    if (debug && previousResponse == null) console.log(Date(), `processing |${endpoint}| method: |${event.httpMethod}|`);

    // process an the action
    if (action.request) response = await processor.request(action.request);
    else if (action.response) response = action.response; // eslint-disable-line
    else if (action.secret) response = await processor.secret(action.secret, actionHandler.admin);
    else if (action.document) response = await processor.document(action.document);
    else throw new Error(`|${endpoint}| failed to process`);

    // continue next actionHandler processing step (recursive)
    if (action.nextAction) {
      if (debug) console.log(Date(), `processing next action: |${action.nextAction}|`);
      response.nextAction = action.nextAction;
      response = await processResponse(event, endpoint, response);
    }
  } catch (err) { throw err; }

  return response;
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

  // set && event.queryStringParameters and body to {}
  if (processedEvent.queryStringParameters == null) processedEvent.queryStringParameters = {};
  if (processedEvent.body == null) processedEvent.body = {};

  // define a response that is returned if we don't process one
  let response = null;

  try {
    // check if the lambda needs initialization
    if (needsInitialization) {
      // load environment
      if (fs.existsSync('./aws-environment.json')) {
        if (debug) console.log(Date(), 'loading aws-environment');
        loadEnvironment(require('./aws-environment.json')); // eslint-disable-line import/no-unresolved
      }

      // load secrets into memory
      if (actionHandler.secretInMemory) {
        const secretParams = {
          secretId: `${process.env.apiName}/${process.env.environment}`,
          method: 'GET',
        };
        const secretResponse = await processor.secret(secretParams);
        secret = secretResponse.body;
      }
    }

    // set basePath
    const basePath = `${process.env.apiName}/${process.env.version}`;

    // get endpoint based off of actionHandler supplied endpointData
    const endpoint = helper.endpointName(processedEvent,
      basePath,
      actionHandler.endpointData);

    // process the request to get the response
    response = await processResponse(processedEvent, endpoint);

    // check if response is valid, if not throw error
    if (response == null
      || response.body == null
      || response.headers == null
      || response.statusCode == null) {
      throw new Error('response not processed properly');
    }

    // get docType from header
    const docType = helper.docTypeForHeaders(response.headers);

    // convert json to string, TODO: make checking more robust
    if (typeof response.body === 'object'
    && docType === helper.docType.json) {
      if (debug) console.log(Date(), 'converting JSON body to string');
      response.body = JSON.stringify(response.body);
    }

    // images need base64Encoded set to true
    if (docType === helper.docType.jpg) {
      if (debug) console.log(Date(), 'converting IMAGE body to base64Encoded');
      response.isBase64Encoded = true;
    }

    // determine if intialization is needed during next call
    setInitialization();
  } catch (err) {
    // create a valid error response
    response = helper.serverError(err, processedEvent, secret);
  }

  // return response
  return response;
};
