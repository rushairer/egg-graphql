'use strict';

const { ApolloServer } = require('apollo-server-koa');
const { get } = require('lodash');
const compose = require('koa-compose');

module.exports = (_, app) => {
  const options = app.config.graphql;
  const graphQLRouter = options.router || '/graphql';
  let apolloServer;
  const middlewares = [];

  return async (ctx, next) => {
    const { onPreGraphQL, onPrePlayground, playground } = options;
    if (ctx.path === graphQLRouter) {
      if (ctx.request.accepts([ 'json', 'html' ]) === 'html') {
        playground && onPrePlayground && await onPrePlayground(ctx);
      } else {
        onPreGraphQL && await onPreGraphQL(ctx);
      }
    }

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
          context: ({ ctx }) => ctx, // use ctx of each request
        }
      );
      apolloServer = new ApolloServer(apolloServerOptions);
      apolloServer.applyMiddleware({
        app: {
          use: middleware => middlewares.push(middleware) // collecting middlewares
        },
        path: graphQLRouter,
      });
    }

    await compose(middlewares)(ctx, next)
  };
};
