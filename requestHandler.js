// requestHandler.js (handles naturalword requests)

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

const p = process.env;

function testText() {
  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: 'Test Passed',
      statusCode: 200,
    },
  };
}

function testJSON() {
  const body = {
    message: 'Test Passed',
  };

  return {
    response: {
      headers: { 'Content-Type': 'text/json' },
      body,
      statusCode: 200,
    },
  };
}

function testHTML() {
  return {
    response: {
      headers: { 'Content-Type': 'text/html' },
      body: '<html><header><title>Test HTML Call</title></header><body>Test Passed</body></html>',
      statusCode: 200,
    },
  };
}

function testXML() {
  return {
    response: {
      headers: { 'Content-Type': 'text/xml' },
      body: '<xml><message>Test Passed</message></xml>',
      statusCode: 200,
    },
  };
}

function testResponseIdentifier1(previousResponse) {
  console.log(`previousResponse: ${previousResponse}`);
  if (previousResponse == null) {
    return {
      responseIdentifier: 1,
      request: {
        requestName: 'testResponseIdentifier1',
        url: 'https://reqres.in/api/users/2',
      },
    };
  }

  let message = 'Test Failed';
  let code = 500;
  if (previousResponse.body.data.first_name === 'Janet' && previousResponse.responseIdentifier === 1) {
    message = 'Test Passed';
    code = 200;
  }

  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: message,
      statusCode: code,
    },
  };
}

function testResponseIdentifier2(previousResponse) {
  console.log(`previousResponse: ${previousResponse}`);
  console.log('TEST1');
  // return first response
  if (previousResponse === null || previousResponse === undefined) {
    return {
      responseIdentifier: 1,
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Failed',
        statusCode: 500,
      },
    };
  }

  // return second response
  console.log('TEST2');
  if (previousResponse.responseIdentifier === 1) {
    return {
      responseIdentifier: 2,
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Failed',
        statusCode: 500,
      },
    };
  }

  // return third response (final response should be returned)
  console.log('TEST3');
  if (previousResponse.responseIdentifier === 2) {
    return {
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Passed',
        statusCode: 200,
      },
    };
  }

  console.log('TEST4');
  return {
    responseIdentifier: 2,
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: 'Test Failed',
      statusCode: 500,
    },
  };
}

module.exports = {

  hasSecret: false,

  secretPath() {
    return `${p.apiName}/${p.environment}`;
  },

  basePath() {
    return `${p.apiName}/${p.version}`;
  },

  endpointData: [
    { name: 'testText', methods: ['GET'] },
    { name: 'testJSON', methods: ['GET'] },
    { name: 'testHTML', methods: ['GET'] },
    { name: 'testXML', methods: ['GET'] },
    { name: 'testResponseIdentifier1', methods: ['GET'] },
    { name: 'testResponseIdentifier2', methods: ['GET'] },
  ],

  actionParameters(event, secret, endpoint, previousResponse) {
    if (endpoint === 'testText') return testText();
    if (endpoint === 'testJSON') return testJSON();
    if (endpoint === 'testHTML') return testHTML();
    if (endpoint === 'testXML') return testXML();
    if (endpoint === 'testResponseIdentifier1') return testResponseIdentifier1(previousResponse);
    if (endpoint === 'testResponseIdentifier2') return testResponseIdentifier2(previousResponse);

    // we should never get here
    const err = `|${endpoint}| endpoint unknown`;
    throw new Error(err);
  },
};
