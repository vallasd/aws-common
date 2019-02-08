// aws-helper.js (helper class to create requests and save data)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

function scrub(secret, string) {
  let scrubbed = string;
  Object.keys(secret).forEach((key) => {
    const value = secret[key];
    if (typeof value === 'string' && value !== 'undefined') {
      scrubbed = scrubbed.replace(value, 'SECRET');
    }
  });
  return scrubbed;
}

function serverError(error, event, secret) {
  // initialize variables
  const err = error;

  // scrub secrets from err message in case they were passed from a thrown err
  if (secret != null) {
    err.message = scrub(secret, error.message);
  }

  // set the err code to 500 if it wasn't already set
  err.code = (err.code ? err.code : 500);

  // log error codes of 500
  if (err.code === 500) {
    console.log(`${Date()} ${err}`);
    console.log(`${Date()} event data: ${JSON.stringify(event)}`); // get event data for later testing
  }

  // create body
  const body = {
    code: err.code,
    message: err.message,
  };

  // create headers with content-type json
  const headers = { 'Content-Type': 'text/json' };

  // return lambda response
  return {
    headers,
    body: JSON.stringify(body),
    statusCode: err.code,
  };
}

function convertBodyData(bodyData) {
  if (bodyData === [] || bodyData == null) return null; // return null for empty bodies
  let string = null;

  try {
    string = Buffer.concat(bodyData).toString();
    const json = JSON.parse(string);
    return json;
  } catch (err) {
    if (string != null) return string;
    return bodyData;
  }
}

function createURL(baseURL, parameters) {
  // returns null if we dont have a baseURL
  if (baseURL == null) return null;

  // if parameters is null just return the baseurl
  if (parameters == null) return baseURL;

  // return concatenated string of just orderedParameters that have values
  let fullurl = `${baseURL}?`;
  Object.keys(parameters).forEach((key) => {
    fullurl = `${fullurl}${key}=${parameters[key]}&`;
  });

  // remove last character if it is a ? or &
  const last = fullurl.slice(-1);
  if (last === '?' || last === '&') {
    fullurl = fullurl.slice(0, -1);
  }

  return fullurl;
}

function parseQueryStringToDictionary(qs) {
  // initialize variables
  const dictionary = {};
  let queryString = qs;

  // If the query string is null, log a return empty dictionary
  if (queryString == null) {
    return {};
  }

  // remove the '?' from the beginning of the
  // if it exists
  if (queryString.indexOf('?') === 0) {
    queryString = queryString.substr(1);
  }

  // Step 1: separate out each key/value pair
  const parts = queryString.split('&');

  Object.keys(parts).forEach((index) => {
    // Step 1b: Get individual part
    const p = parts[index];

    // Step 2: Split Key/Value pair
    const keyValuePair = p.split('=');

    // Step 3: Add Key/Value pair to Dictionary object
    const key = keyValuePair[0];
    let value = keyValuePair[1];

    // decode URI encoded string
    value = decodeURIComponent(value);
    value = value.replace(/\+/g, ' ');

    dictionary[key] = value;
  });

  // Step 4: Return Dictionary Object
  return dictionary;
}

function endpointName(event, endpointBase, endpointData) {
  // initialize variables
  let ep = event.path;
  let epb = endpointBase;

  // check for null endpointBase
  if (epb === null) epb = '';

  if (event.path == null) {
    const error = new Error(`path not found eventpath: |${event.path}| basePath: |/${epb}/|`);
    error.code = 404;
    throw error;
  }

  // add apiName to event.path if it doesn't exist (AWS doesn't include, sam client does)
  const apiName = epb.split('/')[0];
  if (ep.includes(apiName) === false) ep = `/${apiName}${ep}`;

  // attempt to find name requestHandler endpoint and make sure it is the correct method
  for (let i1 in endpointData) { // eslint-disable-line
    const endpoint = endpointData[i1];
    const requestPath = `/${epb}/${endpoint.name}`;
    if (requestPath === ep) {
      // determine if method exists for endpoint
      for (let i2 in endpoint.methods) { // eslint-disable-line
        if (event.httpMethod === endpoint.methods[i2]) {
          return endpoint.name;
        }
      }

      // throw error
      const error = new Error(`|${event.httpMethod}| method not available for |${endpoint.name}|`);
      error.code = 400;
      throw error;
    }
  }

  // we didn't find the endpoint, return null
  const error = new Error(`path not found eventpath: |${event.path}| basePath: |/${epb}/|`);
  error.code = 404;
  throw error;
}

function convertToJSON(potentialJSON) {
  // check if JSON is null, return {}
  if (potentialJSON == null) return {};

  // check if JSON is string and attempt to parse
  if (typeof potentialJSON === 'string') {
    try {
      const json = JSON.parse(potentialJSON);
      return json;
    } catch (err) {
      const error = new Error('delivered JSON is not parsable');
      error.code = 400;
      throw error;
    }
  }

  // return the original object if we were unable to determine typeof
  return potentialJSON;
}

function isEmpty(json) {
  const j = convertToJSON(json);
  for (let key in j) { // eslint-disable-line
    if (json.hasOwnProperty(key)) return false; // eslint-disable-line
  }
  return true;
}

module.exports = {

  // scrubs all secrets from a string and replaces them with SECRET text
  scrub(secret, string) { return scrub(secret, string); },

  // returns an internal Server Error response for a thrown error, formatted for AWS Lambda response
  serverError(err, event, secret) { return serverError(err, event, secret); },

  // will attempt to turn bodyData to a string or JSON, if it fails returns body data as a binary
  convertBodyData(bodyData) { return convertBodyData(bodyData); },

  // parses QueryString using string splitting to return a dictionary of parameters
  parseQueryStringToDictionary(queryString) { return parseQueryStringToDictionary(queryString); },

  // creates a URL with parameters given a baseURL and dictionary of parameters
  createURL(baseURL, parameters) { return createURL(baseURL, parameters); },

  // returns endpoint string, throws err if endpoint can not be determined
  // or method is inappropriate
  endpointName(event, endpointBase, endpointData) {
    return endpointName(event, endpointBase, endpointData);
  },

  // checks if JSON is null or empty, throws if json is not an object
  isEmpty(json) { return isEmpty(json); },

  // converts potentialJSON in body to JSON structure.  Throws error if it can not convert.
  convertToJSON(potentialJSON) { return convertToJSON(potentialJSON); },
};
