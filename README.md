# @switchdog/egg-graphql
---
[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@switchdog/egg-graphql.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@switchdog/egg-graphql
[download-image]: https://img.shields.io/npm/dm/@switchdog/egg-graphql.svg?style=flat-square
[download-url]: https://npmjs.org/package/@switchdog/egg-graphql

> [🎺体验 3.2 版本，更愉快的 apollo-server 使用体验](https://github.com/Carrotzpc/egg-graphql/tree/next#readme)

[GraphQL](http://facebook.github.io/graphql/)使用 Schema 来描述数据，并通过制定和实现 GraphQL 规范定义了支持 Schema 查询的 DSQL （Domain Specific Query Language，领域特定查询语言，由 FACEBOOK 提出。

![graphql](http://upload-images.jianshu.io/upload_images/551828-8d055caea7562605.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

传统 web 应用通过开发服务给客户端提供接口是很常见的场景。而当需求或数据发生变化时，应用需要修改或者重新创建新的接口。长此以后，会造成服务器代码的不断增长，接口内部逻辑复杂难以维护。而 GraphQL 则通过以下特性解决这个问题：

- 声明式。查询的结果格式由请求方（即客户端）决定而非响应方（即服务器端）决定。你不需要编写很多额外的接口来适配客户端请求
- 可组合。GraphQL 的查询结构可以自由组合来满足需求。
- 强类型。每个 GraphQL 查询必须遵循其设定的类型才会被执行。

也就是说，通过以上的三个特性，当需求发生变化，客户端只需要编写能满足新需求的查询结构，如果服务端能提供的数据满足需求，服务端代码几乎不需要做任何的修改。

目前 egg-graphql 已经完全支持在 egg 中使用 GraphQL 查询语法，可直接查看文末参考链接，下文为插件设计。

## 技术选型

我们会使用 [GraphQL Tools](http://dev.apollodata.com/tools/graphql-tools/index.html)配合 eggjs 完成 GraphQL 服务的搭建。 GraphQL Tools 建立了一种 GraphQL-first 的开发哲学，主要体现在以下三个方面：

- 使用官方的 GraphQL schema 进行编程。 GraphQL Tools 提供工具，让你可以书写标准的 GraphQL schema，并完全支持里面的特性。
- schema 与业务逻辑分离。 GraphQL Tools 建议我们把 GraphQL 逻辑分为四个部分: Schema, Resolvers, Models, 和 Connectors。
- 为很多特殊场景提供标准解决方案。最大限度标准化 GraphQL 应用。

我们也会使用 [GraphQL Server](http://dev.apollodata.com/tools/graphql-server/index.html) 来完成 GraphQL 查询语言 DSQL 的解析。

同时我们会使用 [dataloader](https://github.com/facebook/dataloader) 来优化数据缓存。(例子可见 `test/fixtures/app/graphql-app` 目录)

GraphQl Tools 新增了对自定义 directive 的支持，通过 directive 我们可以实现一些切面相关的事情：权限、缓存等。(例子可见 `test/fixtures/app/graphql-app/app/graphql/directives` 目录)

这些我们都会集成到 [egg-graphql](https://github.com/eggjs/egg-graphql) 插件中。

### 安装与配置

安装对应的依赖 [egg-graphql] ：

```bash
$ npm i --save @switchdog/egg-graphql
```

开启插件：

```js
// config/plugin.js
exports.graphql = {
  enable: true,
  package: '@switchdog/egg-graphql',
};
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
  // 是否加载开发者工具 graphiql, 默认开启。路由同 router 字段。使用浏览器打开该可见。
  graphiql: true,
  // graphQL 路由前的拦截器
  onPreGraphQL: function* (ctx) {},
  // 开发工具 graphiQL 路由前的拦截器，建议用于做权限操作(如只提供开发者使用)
  onPreGraphiQL: function* (ctx) {},
  // apollo server 的配置，除 `schema` `context` 外均可配置
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
  },
  /*
   * 开发者工具 graphiql 的配置
   * Arguments:
   *
   * - endpointURL: the relative or absolute URL for the endpoint which GraphiQL will make queries to
   * - (optional) query: the GraphQL query to pre-fill in the GraphiQL UI
   * - (optional) variables: a JS object of variables to pre-fill in the GraphiQL UI
   * - (optional) operationName: the operationName to pre-fill in the GraphiQL UI
   * - (optional) result: the result of the query to pre-fill in the GraphiQL UI
   * - (optional) passHeader: a string that will be added to the header object.
   * For example "'Authorization': localStorage['Meteor.loginToken']" for meteor
   * - (optional) editorTheme: a CodeMirror theme to be applied to the GraphiQL UI
   * - (optional) websocketConnectionParams: an object to pass to the web socket server
  */
  graphiqlOptions: {
    endpointURL: string;
    subscriptionsEndpoint?: string;
    query?: string;
    variables?: Object;
    operationName?: string;
    result?: Object;
    passHeader?: string;
    editorTheme?: string;
    websocketConnectionParams?: Object;
    rewriteURL?: boolean;
  }
};

// 添加中间件拦截请求
exports.middleware = [ 'graphql' ];
```

## 使用方式

请将 graphql 相关逻辑放到 app/graphql 下，请参考测试用例，里面有 connector/schema 的目录结构, 以及 dataloader 的使用。

目录结构如下

```
.
├── app
│   ├── graphql
|   |   ├── common
|   |   |   └── directive.js  // 自定义directive
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
