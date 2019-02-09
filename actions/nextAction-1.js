exports.action = (previousResponse) => {
  if (previousResponse == null) {
    return {
      nextAction: 1,
      request: {
        url: 'https://jsonplaceholder.typicode.com/todos/1',
      },
    };
  }

  const body = {
    currentAction: previousResponse.nextAction,
    name: previousResponse.body.title,
  };

  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body,
      statusCode: 200,
    },
  };
};
