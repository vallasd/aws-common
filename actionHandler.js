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

const actionText = require('./actions/text.js');
const actionJSON = require('./actions/json.js');
const actionHTML = require('./actions/html.js');
const actionXML = require('./actions/xml.js');
const actionNext1 = require('./actions/next1.js');
const actionNext2 = require('./actions/next2.js');
const actionSecretGet = require('./actions/secretGet.js');
const actionSecretPost = require('./actions/secretPost.js');
const actionSecretMemory = require('./actions/secretMemory.js');

const p = process.env;

module.exports = {

  hasSecret: false,

  secretId() {
    return `${p.apiName}/${p.environment}`;
  },

  basePath() {
    return `${p.apiName}/${p.version}`;
  },

  endpointData: [
    { name: 'text', methods: ['GET'] },
    { name: 'json', methods: ['GET'] },
    { name: 'html', methods: ['GET'] },
    { name: 'xml', methods: ['GET'] },
    { name: 'next1', methods: ['GET'] },
    { name: 'next2', methods: ['GET'] },
    { name: 'secret', methods: ['GET', 'POST'] },
    { name: 'secretFromMemory', methods: ['GET'] },
  ],

  action(event, secret, endpoint, previousResponse) {
    if (endpoint === 'text') return actionText.action();
    if (endpoint === 'json') return actionJSON.action();
    if (endpoint === 'html') return actionHTML.action();
    if (endpoint === 'xml') return actionXML.action();
    if (endpoint === 'next1') return actionNext1.action(previousResponse);
    if (endpoint === 'next2') return actionNext2.action(previousResponse);
    if (endpoint === 'secret' && event.httpMethod === 'GET') return actionSecretGet.action(event);
    if (endpoint === 'secret' && event.httpMethod === 'POST') return actionSecretPost.action(event);
    if (endpoint === 'secretFromMemory') return actionSecretMemory.action(secret);

    // we should never get here
    const err = `|${endpoint}| endpoint unknown`;
    throw new Error(err);
  },
};
