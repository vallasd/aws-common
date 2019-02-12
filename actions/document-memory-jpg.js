exports.action = (previousResponse) => {
  if (previousResponse == null) {
    return {
      nextAction: 1,
      document: {
        path: 'documents/document.jpg',
      },
    };
  }

  return {
    document: {
      path: 'documents/document.jpg',
    },
  };
};
