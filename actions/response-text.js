exports.action = () => ({
  response: {
    headers: { 'Content-Type': 'text/plain' },
    body: 'Test Passed',
    statusCode: 200,
  },
});
