// lambda.js (index class for AWS lambdas)

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

const helper = require('./common/aws-helper.js');
const secretManager = require('./common/aws-secret.js');
const requestHandler = require('./requestHandler.js');
const fs = require('fs');
const debug = (process.env.debug == 'true');

// used determine if Lambda needs initialization like AWS secret request
var needsInitialization = true,
    lastInitialization = new Date(), // when last initialization was performed
    secret = {}; // AWS secret manager secret for this Lambda

exports.handler = async (event, context) => {

  try {

    // check if the lambda needs initialization
    if (needsInitialization) {

      // load environment
      if (fs.existsSync('./aws-environment.json')) {
        if (debug) console.log('loading aws-environment');
        let environment = require('./aws-environment.json');
        loadEnvironment(environment);
      }

      // allows the user to spoof the event, so we can directly test errors from the logs, use with sam client
      if (fs.existsSync('./aws-event.json')) {
        console.log(Date(), 'WARNING: loading aws-event');
        event = require('./aws-event.json');
      }

      // load secrets
      if (requestHandler.hasSecret) secret = await secretManager.secret(requestHandler.secretPath());
    }

    // get endpoint based off of requestHandler supplied endpointData
    let endpoint = helper.endpointName(event, requestHandler.basePath(), requestHandler.endpointData);

    // process the request to get the response
    var response = await processResponse(event, secret, endpoint);

    // determine if intialization is needed during next call
    setInitialization();

    // convert xml to json
    if (response.returnType == helper.returnType.xml) {
      console.log(Date(), 'we need to convert xml body to JSON');
      // if (debug) console.log('converting XML body to JSON');
      // let json = helper.convertXMLToJSON(response.body);
      // response.body = json;
      // response.returnType = helper.returnType.json;
      // helper.updateContentTypeHeader(response.headers, helper.returnType.json);
    }

    // convert json to string
    if (response.returnType == helper.returnType.json) {
      if (debug) console.log(Date(), 'converting JSON body to string');
      let string = JSON.stringify(response.body);
      response.body = string;
    }
  }

  catch(err) {

    // scrub secrets from err message in case they were passed from a thrown err
    let scrubbed = helper.scrub(secret, err.message);
    err.message = scrubbed;

    // set the err code to 500 if it wasn't already set
    err.code = (err.code ? err.code : 500);

    // log error codes of 500
    if (err.code == 500) {
      console.log('Date: ' + Date());
      console.log(err);
      console.log(Date(), 'event data: ' + JSON.stringify(event)); // get event data for later testing
    }

    // create an error response
    response = helper.internalServerErrorResponse(err);
  }

  // remove returnType, we dont need to pass it to client
  delete response.returnType;

  // return response
  return response;
};

// will make handler reinitialize every 30 minutes (update secrets every 30 minutes)
function setInitialization() {

  // check if we just initialized
  if (needsInitialization == true) {
    lastInitialization = new Date();
    needsInitialization = false;
    if (debug) console.log(Date(), 'initialization set to false');
    return 'initialization set to false';
  }

  // check to see if initialization was done more than 30 minutes ago
  let diff = new Date().getTime() - lastInitialization.getTime();
  if (diff > 1800000) {
    if (debug) console.log(Date(), 'initialization set to true');
    needsInitialization = true;
    return 'initialization set to true';
  }

  if (debug) console.log(Date(), 'initialization not set');
  return 'initialization not set, diff: ' + diff + ' expects: >1800000';
}

// assign json from environment to process.env environment variables
function loadEnvironment(environment) {
  for (var key in environment) {
    if (environment.hasOwnProperty(key)) process.env[key] = environment[key];
  }
}

/*
    // Processes the response from the requestHandler
    REQUEST HANDLER CAN RETURN
    { request: requestParams Dictionary (as outlined by helperMethods.returnResponse) }
    OPTIONAL USED IN ADDITION TO response: (used to let processResponse know that we will make additional requests)
    { responseIdentifier: any }
    OR
    { response: { body: , returnType: (type of body), statusCode: number, headers: dictionary } }
*/
async function processResponse(event, secret, endpoint) {

  try {

    var lastResponse = null; // set if we are making multiple requests internally

    while(true) {

      var response = null;

      // get response parameters from handler
      let handlerResponse = await requestHandler.response(event, secret, endpoint, lastResponse);

      // requestHandler sent a response, return response
      if (handlerResponse.response != null) {
        if (debug) console.log(Date(), 'processRequestParameters: return response (internal response)');
        delete handlerResponse.response.responseIdentifier;
        return handlerResponse.response;
      }

      // requestHandler sent a request, handle the request and get response
      else if (handlerResponse.request != null) {
        response = await helper.returnResponse(handlerResponse.request);
      }

      // requestHandler sent parameters that aren't recognized, throw err
      else {
        throw new Error('requestHandler for |' + endpoint + '| does not have a request or response');
      }

      // requestHandler returned a responseIdentifier, assign lastResponse and repeat loop
      if (handlerResponse.responseIdentifier != null) {
        if (debug) console.log(Date(), 'processRequestParameters: continue');
        lastResponse = response;
        // pass for requestHandler to know which response we are on
        lastResponse.responseIdentifier = handlerResponse.responseIdentifier;
      }

      // requestHandler has no responseIdentifier, just return the response
      else {
        if (debug) console.log(Date(), 'processRequestParameters: return response (external request)');
        return response;
      }
    }
  }

  // throw any errors up
  catch(err) { throw err; }
}
