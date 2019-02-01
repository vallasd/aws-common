// aws-helper.js (helper class to create requests and save data)

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

const fetch = require('node-fetch'); // eslint-disable-line import/no-unresolved

const debug = (process.env.debug === 'true');

const returnType = {
  text: 'text',
  html: 'html',
  xml: 'xml',
  json: 'json',
};

function returnTypeForContentType(contentType) {
  const c = contentType.split(';')[0];
  if (c === 'application/json') return returnType.json;
  if (c === 'text/json') return returnType.json;
  if (c === 'application/xml') return returnType.xml;
  if (c === 'text/xml') return returnType.xml;
  if (c === 'text/plain') return returnType.text;
  if (c === 'text/html') return returnType.html;
  return returnType.json;
}

function updateContentTypeHeader(headers, rt) {
  const newHeaders = headers;
  if (rt === 'text') newHeaders['Content-Type'] = 'text/plain';
  else if (rt === 'json') newHeaders['Content-Type'] = 'text/json';
  else if (rt === 'html') newHeaders['Content-Type'] = 'text/html';
  else if (rt === 'xml') newHeaders['Content-Type'] = 'text/xml';
  else throw new Error(`returnType |${returnType}| not recognized`);
  return newHeaders;
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

function urlRequest(requestParams) {
  // create async request
  const request = async () => {
    try {
      // set initial variables
      let rp = requestParams;

      // if requestParams wasn't passed, we will create a blank dictionary and cleanly fail
      if (rp === null) rp = {};

      // create the full url and make a copy of requestName for error and logs
      const url = createURL(rp.url, rp.parameters);

      // create a timeout of seven seconds if no timeout supplied
      const timeout = (rp.timeout ? rp.timeout : 7000);
      rp.timeout = timeout;

      // create headers and Content-Type header based on returnType in requestParams
      // (default will be json)
      let headers = {};

      // display debug
      if (debug) console.log(Date(), `returnResponse |${rp.requestName}| url: |${url}|`);
      if (debug) console.log(Date(), `returnResponse |${rp.requestName}| params: |${JSON.stringify(rp)}|`);

      // remove parameters not needed for fetch
      delete rp.url;
      delete rp.requestName;
      delete rp.parameters;

      // fetch the request and save as result
      const result = await fetch(url, rp);

      // log the content-type
      if (debug) console.log(Date(), `returnResponse |${rp.requestName}| Content-Type: |${result.headers.get('Content-Type')}|`);

      // determine the returnType from content-type (if no content-type, uses json)
      const rt = returnTypeForContentType(result.headers.get('Content-Type'));

      // log the returnType
      if (debug) console.log(Date(), `returnResponse |${rp.requestName}| returning: ${rt}`);

      // update headers content-type with returnType
      headers = updateContentTypeHeader(headers, rt);

      // create return body
      let body = {};
      if (rt === returnType.json) {
        body = await result.json();
      } else if (rt === returnType.text || rt === returnType.xml || rt === returnType.html) {
        body = await result.text();
      } else {
        throw new Error(`|${rp.requestName}| unable to parse returnType |${rt}|`);
      }

      // return a lambda response
      return {
        headers,
        body,
        statusCode: result.status,
      };
    } catch (error) { throw error; }
  };

  return request();
}

// scrubs all secrets from a string and replaces them with SECRET text
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

function internalServerErrorResponse(error, event, secret) {
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
    console.log(`${Date()} error: ${err}`);
    console.log(`${Date()} event data: ${JSON.stringify(event)}`); // get event data for later testing
  }

  // create body
  const body = {
    code: err.code,
    message: err.message,
  };

  // create headers with content-type json
  const headers = updateContentTypeHeader({}, returnType.json);

  // return lambda response
  return {
    headers,
    body: JSON.stringify(body),
    statusCode: err.code,
  };
}

function convertBodyData(bodyData) {
  if (bodyData === [] || bodyData === null) return null; // return null for empty bodies
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

module.exports = {

  /*
      *These properties are part of the Fetch Standard (requestParams)
      method: 'GET',
      headers: {},              request headers. format is the identical to
                                that accepted by the Headers constructor (see below)
      body: null,               request body. can be null, a string, a Buffer, a Blob,
                                or a Node.js Readable stream
      redirect: 'follow',       set to `manual` to extract redirect headers, `error` to
                                reject redirect
      parameters: dictionary    a dictionary of parameters and their values

      *The following properties are node-fetch extensions
      follow: 20,               maximum redirect count. 0 to not follow redirect
      timeout: 7000,            req/res timeout in ms, it resets on redirect. 0 to disable
                                (OS limit applies)
      compress: true,           support gzip/deflate content encoding. false to disable
      size: 0,                  maximum response body size in bytes. 0 to disable
      agent: null               http(s).Agent instance, allows custom proxy, certificate,
                                lookup, family etc.

      *Used when creating the response
      requestName: string,      used for logging
  */

  // returns promise for the result of a request, formatted for AWS Lambda response
  urlRequest(requestParams) { return urlRequest(requestParams); },

  // returns an internal Server Error response for a thrown error, formatted for AWS Lambda response
  internalServerErrorResponse(err, event, secret) {
    return internalServerErrorResponse(err, event, secret);
  },

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

  // scrubs a dictionary of secrets from the string, anywhere a secret is
  // shown in string, 'SECRET' will be displayed
  scrub(secret, string) { return scrub(secret, string); },

  // converts potentialJSON in body to JSON structure.  Throws error if it can not convert.
  convertToJSON(potentialJSON) { return convertToJSON(potentialJSON); },
};
