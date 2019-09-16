'use strict';

const { ApolloServer } = require('apollo-server-koa');
const { get } = require('lodash');
const compose = require('koa-compose');
const { getApolloServerOptsFromApp } = require('../../lib/utils');

module.exports = (_, app) => {
  const options = app.config.graphql;
  const graphQLRouter = options.router || '/graphql';
  // get apollo server options
  const apolloServerOptions = Object.assign(
    {
      // log the error stack by default
      formatError: error => {
        const stacktrace = (get(error, 'extensions.exception.stacktrace') || []).join('\n');
        app.logger.error('egg-graphql', stacktrace);
        return error;
      },
    },
    // pass app to getApolloServerOptions
    getApolloServerOptsFromApp(app),
    // pass schema and context to apollo server
    {
      schema: app.schema,
      context: ({ ctx, connection }) => {
        if (connection) {
          return connection.context;
        }
        return ctx;
      },
    }
  );
  const onPreMiddleware = async (ctx, next) => {
    const { onPreGraphQL, onPrePlayground } = options;
    const { playground } = apolloServerOptions;
    if (ctx.path === graphQLRouter) {
      if (ctx.request.accepts([ 'json', 'html' ]) === 'html') {
        playground && onPrePlayground && await onPrePlayground(ctx);
      } else {
        onPreGraphQL && await onPreGraphQL(ctx);
      }
    }
    await next();
  };
  const middlewares = [ onPreMiddleware ];

  // init apollo server
  const apolloServer = new ApolloServer(apolloServerOptions);
  apolloServer.applyMiddleware({
    app: {
      use: middleware => middlewares.push(middleware), // collecting middlewares
    },
    path: graphQLRouter,
  });
  // add Subscription support
  if (apolloServerOptions.subscriptions) {
    app.once('server', server => {
      // websocket
      apolloServer.installSubscriptionHandlers(server);
    });
  }

  return compose(middlewares);
};
