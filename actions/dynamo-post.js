exports.action = (event) => {
  const { body } = event;
  const { table, keys, values } = body;

  return {
    dynamo: {
      method: 'POST',
      table,
      keys,
      values,
    },
  };
};
