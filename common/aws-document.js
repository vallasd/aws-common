// aws-documents.js (class to documents around)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const fs = require('fs');

const debug = (process.env.debug === 'true');

const documents = {};

function read(filePath, extension) {
  const promise = new Promise(((resolve) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(Date(), `Error: ${err.message}`);
        resolve(null);
        return;
      }

      if (extension === 'json'
      || extension === 'html'
      || extension === 'text'
      || extension === 'txt') {
        resolve(data.toString());
        return;
      }

      if (extension === 'jpg') {
        resolve(data.toString('base64'));
        return;
      }

      resolve(data);
    });
  }));

  return promise;
}

async function get(path, name, extension) {
  const docPath = documents[path];
  // attempt to retrieve document from memory
  if (docPath) {
    const docName = docPath[name];
    if (docName) {
      const doc = docName[extension];
      if (doc) {
        if (debug) console.log(Date(), `retrieving document |${path}${name}.${extension}| from memory`);
        return doc;
      }
    }
  }

  // attempt to retrieve document from file system
  const filePath = `./${path}/${name}.${extension}`;
  if (fs.existsSync(filePath)) {
    // get document from file system
    const doc = await read(filePath, extension);

    // save document to memory
    if (!docPath) documents[path] = {};
    const docName = documents[path][name];
    if (!docName) documents[path][name] = {};
    documents[path][name][extension] = doc;

    // return the document
    if (debug) console.log(Date(), `retrieving document |./${path}/${name}.${extension}| from file`);
    return doc;
  }

  return null;
}

module.exports = {
  // retrieves a document from memory or file system if it exists, return null if not found
  get(path, name, extension) { return get(path, name, extension); },
};
