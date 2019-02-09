exports.action = secret => ({
  response: {
    headers: { 'Content-Type': 'text/json' },
    body: secret,
    statusCode: 200,
  },
});
