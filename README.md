# @switchdog/egg-graphql
---
[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@switchdog/egg-graphql.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@switchdog/egg-graphql
[download-image]: https://img.shields.io/npm/dm/@switchdog/egg-graphql.svg?style=flat-square
[download-url]: https://npmjs.org/package/@switchdog/egg-graphql

## 关于 v3.2 版本

新的 v3.2 版本使用 apollo-server-koa 重写了中间件的实现方式，使用 GraphQL Playground 作为开发工具，可以在 eggjs 中更愉快的使用 apollo-server-koa:

```js
// app/middleware/graphql.js
const { ApolloServer } = require('apollo-server-koa');
const { get } = require('lodash');
const compose = require('koa-compose');

module.exports = (_, app) => {
  const options = app.config.graphql;
  const graphQLRouter = options.router || '/graphql';
  // get apollo server options
  const { getApolloServerOptions } = options;
  const apolloServerOptions = Object.assign(
    {
      // log the error stack by default
      formatError: error => {
        const stacktrace = (get(error, 'extensions.exception.stacktrace') || []).join('\n');
        app.logger.error('egg-graphql', stacktrace);
        return error;
      },
    },
    options.apolloServerOptions,
    // pass app to getApolloServerOptions
    getApolloServerOptions && getApolloServerOptions(app),
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
```

### v3.2 版本的优势：

* 基于 apollo-server，具有 apollo-server 的所有优势
* 使用 Apollo Playground 作为调试界面，体验更佳
* 完全兼容 egg-graphql，支持 `onPreGraphQL(ctx)` 和 `onPrePlayground(ctx)` （`onPrePlayground` 替代原来的 `onPreGraphiQL`）
* 默认打印错误日志，方便定位问题，可通过 `apolloServerOptions.formatError` 覆盖默认逻辑
* 可以以函数的方式传递 apollo-server 配置：`getApolloServerOptions(app)`，且能在函数中拿到 eggjs 的 app 实例
* 支持 Directive 以及 SchemaDirective
* 支持 Subscriptions by@[Abenx](https://github.com/rushairer)
* 支持默认 `Query` 等的定义，方便组织代码目录，可通过 `extend` 的方式将 `Query`、`Mutation` 以及 `Subscription` 等定义到各自的文件夹中。默认关闭，可以通过设置 `defaultTypeDefsEnabled` 为 `true` 开启

## 安装与配置

安装对应的依赖 [egg-graphql] ：

```bash
$ yarn add @switchdog/egg-graphql@latest
# or
$ npm i @switchdog/egg-graphql@latest
```

开启插件：

```js
// config/plugin.js
exports.graphql = {
  enable: true,
  package: '@switchdog/egg-graphql',
};
// 添加中间件拦截请求
exports.middleware = [ 'graphql' ];
```

在 `config/config.${env}.js` 配置提供 graphql 的路由。

```js
// config/config.${env}.js
exports.graphql = {
  router: '/graphql',
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
  // 是否添加默认的 `Query`、`Mutation` 以及 `Subscription` 定义，默认关闭
  // 开启后可通过 `extend` 的方式将 `Query`、`Mutation` 以及 `Subscription` 定义到各自的文件夹中
  defaultTypeDefsEnabled: false,
  // graphQL 路由前的拦截器
  onPreGraphQL: function* (ctx) {},
  // 开发工具 apollo playground 路由前的拦截器，建议用于做权限操作(如只提供开发者使用)
  onPrePlayground: function* (ctx) {},
  // apollo server 的配置，除 `schema` `context` 外均可配置
  // 详见 https://www.apollographql.com/docs/apollo-server/api/apollo-server
  apolloServerOptions: {
    rootValue, // the value passed to the first resolve function
    formatError, // a function to apply to every error before sending the response to clients
    validationRules, // additional GraphQL validation rules to be applied to client-specified queries
    formatParams, // a function applied for each query in a batch to format parameters before execution
    formatResponse, // a function applied to each response after execution
    tracing, // when set to true, collect and expose trace data in the Apollo Tracing format
    logFunction, // a function called for logging events such as execution times
    fieldResolver, // a custom default field resolver
    debug, // a boolean that will print additional debug logging if execution errors occur
    cacheControl, // when set to true, enable built-in support for Apollo Cache Control
    subscriptions, // String defining the path for subscriptions or an Object to customize the subscriptions server. Set to false to disable subscriptions
    playground, // GraphQL Playground 开发工具配置，详见 https://github.com/prisma/graphql-playground#usage
    // ...
  },
  // 用于获取 apollo server 的配置，`app` 会作为参数传进来，可以用来做一些特殊操作，例如 `formatError` 时利用 `app.logger` 打印错误日志
  // `getApolloServerOptions` 方式获取的配置最终会通过 Object.assign() 的方式 merge 到 apolloServerOptions 上
  getApolloServerOptions: function (app) {
    // 如果想使用订阅，在进行 websocket 连接的时候传递 Authorization
    return {
      subscriptions: {
        onConnect: (connectionParams, webSocket, context) => {
          const ctx = app.createAnonymousContext()
          ctx.request.header.Authorization = connectionParams.Authorization
          return ctx
        },
      },
    }
  },
};
```
## 开发调试

使用 GraphQL Playground 工具进行开发调试，详见 https://www.apollographql.com/docs/apollo-server/features/graphql-playground

<img alt="GraphQL Playground" src="https://raw.githubusercontent.com/apollographql/apollo-server/HEAD/docs/source/images/graphql-playground.png">

## 使用方式

请将 graphql 相关逻辑放到 app/graphql 下，请参考测试用例，里面有 connector/schema 的目录结构, 以及 dataloader 的使用。

目录结构如下

```
.
├── app
│   ├── graphql
|   |   ├── common
|   |   |   └── directive.js  // 自定义 directive
│   │   ├── project
│   │   │   └── schema.graphql
│   │   ├── schemaDirectives
│   │   │   └── schemaDirective.js  // 自定义 SchemaDirective
│   │   │ 
│   │   └── user  // 一个graphql模型
│   │       ├── connector.js
│   │       ├── resolver.js
│   │       └── schema.graphql
│   ├── model
│   │   └── user.js
│   ├── public
│   └── router.js

```

## 参考文章

- [graphql 官网](http://facebook.github.io/graphql)

- [如何在 egg 中使用 graphql](https://zhuanlan.zhihu.com/p/30604868)

- [项目例子：结合 sequelize](https://github.com/freebyron/egg-graphql-boilerplate)

## 协议

MIT
