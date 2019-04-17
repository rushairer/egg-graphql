
declare module 'egg' {
  export interface IConnector extends PlainObject {}

  // extend context
  interface Context {
    connector: IConnector;
  }

  // extend your config
  interface EggAppConfig {
    graphql: any;
  }

}
