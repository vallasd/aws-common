exports.action = (previousResponse) => {
  if (previousResponse == null) {
    return {
      nextAction: 1,
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Failed',
        statusCode: 500,
      },
    };
  }

  // return second response
  if (previousResponse.nextAction === 1) {
    return {
      nextAction: 2,
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Failed',
        statusCode: 500,
      },
    };
  }

  // return third response (final response should be returned)
  if (previousResponse.nextAction === 2) {
    return {
      response: {
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test Passed',
        statusCode: 200,
      },
    };
  }

  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: 'Test Failed',
      statusCode: 500,
    },
  };
};
