'use strict';

const getApolloServerOptsFromApp = app => {
  const {
    apolloServerOptions, getApolloServerOptions,
  } = app.config.graphql;
  return Object.assign(
    {},
    apolloServerOptions,
    typeof getApolloServerOptions === 'function' && getApolloServerOptions(app)
  );
};
exports.getApolloServerOptsFromApp = getApolloServerOptsFromApp;
