exports.action = (previousResponse) => { // eslint-disable-line
  if (previousResponse == null) {
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
  if (previousResponse.responseIdentifier === 2) {
    return {
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Passed',
        statusCode: 200,
      },
    };
  }

  return {
    responseIdentifier: 2,
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: 'Test Failed',
      statusCode: 500,
    },
  };
};
