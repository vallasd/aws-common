exports.action = (event) => {
  const params = event.queryStringParameters;
  const { table, item, queryValue } = params;
  const { queryType } = params;

  return {
    dynamo: {
      method: 'QUERY',
      table,
      item,
      queryValue,
      queryType,
    },
  };
};
