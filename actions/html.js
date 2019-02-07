exports.action = () => { // eslint-disable-line
  return {
    response: {
      headers: { 'Content-Type': 'text/html' },
      body: '<html><header><title>Test HTML Call</title></header><body>Test Passed</body></html>',
      statusCode: 200,
    },
  };
};
