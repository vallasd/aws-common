exports.action = (previousResponse) => { // eslint-disable-line
  if (previousResponse == null) {
    return {
      responseIdentifier: 1,
      request: {
        url: 'https://reqres.in/api/users/2',
      },
    };
  }

  const body = {
    currentAction: previousResponse.nextAction,
    name: previousResponse.body.data.first_name,
  };

  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body,
      statusCode: 200,
    },
  };
};
