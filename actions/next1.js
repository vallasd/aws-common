exports.action = (previousResponse) => {
  if (previousResponse == null) {
    return {
      nextAction: 1,
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
