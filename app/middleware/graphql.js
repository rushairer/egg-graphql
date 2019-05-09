'use strict';

// Notice that this path is totally changed, because this function isn't
// directly exposed to the public, now we must still use that for the middle-
// ware.
const { graphqlKoa } = require('apollo-server-koa/dist/koaApollo');

// Use graphql playground in v2.
const {
  renderPlaygroundPage,
} = require('@apollographql/graphql-playground-html');
const { createPlaygroundOptions } = require('apollo-server-core');

/**
 * GraphQL Playground
 *
 * https://github.com/apollographql/apollo-server/blob/2f773625c0c608ea91fa1d184ed13d149044f545/packages/apollo-server-koa/src/ApolloServer.ts#L183
 * @param {Object} options The `options` of graphql playground.
 * @return {Promise} The result of the graphql playground.
 */
function graphqlPlayground(options) {
  return ctx => {
    const playgroundRenderPageOptions = {
      endpoint: options.endpointURL,
      subscriptionEndpoint: options.subscriptionsPath,
      ...createPlaygroundOptions(options),
    };
    ctx.set('Content-Type', 'text/html');
    const playground = renderPlaygroundPage(
      playgroundRenderPageOptions
    );
    ctx.body = playground;
    return;
  };
}

module.exports = (_, app) => {
  const options = app.config.graphql;
  const graphQLRouter = options.router;
  let graphiql = true;

  if (options.graphiql === false) {
    graphiql = false;
  }

  return async (ctx, next) => {
    /* istanbul ignore else */
    if (ctx.path === graphQLRouter) {
      if (ctx.request.accepts([ 'json', 'html' ]) === 'html' && graphiql) {
        if (options.onPreGraphiQL) {
          await options.onPreGraphiQL(ctx);
        }
        const playgroundOptions = Object.assign(
          {
            endpointURL: graphQLRouter,
            subscriptionsPath: options.subscriptions && options.subscriptions.path,
          },
          options.playgroundOptions
        );
        await graphqlPlayground(playgroundOptions)(ctx);
        await next();
        return;
      }
      if (options.onPreGraphQL) {
        await options.onPreGraphQL(ctx);
      }
      const apolloServerOptions = Object.assign(
        {},
        options.apolloServerOptions,
        {
          schema: app.schema,
          context: ctx,
        }
      );
      await graphqlKoa(apolloServerOptions)(ctx);
    }
    await next();
  };
};
