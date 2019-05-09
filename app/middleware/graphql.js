'use strict';

const { ApolloServer } = require('apollo-server-koa');
const { get } = require('lodash');

module.exports = (_, app) => {
  const options = app.config.graphql;
  const graphQLRouter = options.router || '/graphql';
  let apolloServer;

  return async (ctx, next) => {
    // init apollo server
    if (!apolloServer) {
      const { getApolloServerOptions } = options;
      const apolloServerOptions = Object.assign(
        {
          // log the error stack by default
          formatError: error => {
            const stacktrace = (get(error, 'extensions.exception.stacktrace') || []).join('\n');
            ctx.logger.error('egg-graphql', stacktrace);
            return error;
          },
        },
        options.apolloServerOptions,
        // pass ctx to getApolloServerOptions
        getApolloServerOptions && getApolloServerOptions(ctx),
        // pass schema and context to apollo server
        {
          schema: app.schema,
          context: ctx,
        }
      );
      apolloServer = new ApolloServer(apolloServerOptions);
      apolloServer.applyMiddleware({ app, path: graphQLRouter });
    }

    const { onPreGraphQL, onPrePlayground, playground } = options;
    if (ctx.path === graphQLRouter) {
      if (ctx.request.accepts([ 'json', 'html' ]) === 'html') {
        playground && onPrePlayground && onPrePlayground(ctx);
      } else {
        onPreGraphQL && onPreGraphQL(ctx);
      }
    }

    await next();
  };
};
