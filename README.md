# RxStack express server module with HTTP2 support

The ExpressServer module integrates [`expressjs`](https://expressjs.com) in rxstack framework
and uses `spdy` for HTTP2 support.
Based on the `express-server` moudule of the [RxStack project](https://github.com/rxstack/rxstack).
Tests have not yet been adapted as the originally used `request-promise` package is deprecated.

## Installation

```
npm install @nanobot248/rxstack-express-http2-server --save

// peerDependencies
npm install @rxstack/async-event-dispatcher@^0.5 @rxstack/core@^0.6 @rxstack/exceptions@^0.5 winston@^3.2.1
```

## Documentation

* [Setup](#setup)
* [Module options](#module-options)
* [Express options](#express-options)
* [Express middleware](#express-middleware)

### <a name="setup"></a>  Setup
`ExpressHttp2Server` module needs to be registered in the `application`. Let's create the application:

```typescript
import {Application, ApplicationOptions} from '@rxstack/core';
import {ExpressHttp2Module} from '@nanobot248/rxstack-express-http2-server';

export const EXPRESS_APP_OPTIONS: ApplicationOptions = {
  imports: [
    ExpressHttp2Module.configure({
      'host': 'localhost',
      'port': 3000,
      'prefix': '/api',
      'http2': true,
      'http': true,
      'tlsCertificateFile': './path/to/certificate.pem',
      'tlsKeyFile': './path/to/key.pem'
    })
  ],
  servers: ['express-http2'], //enables the server
  providers: [
    // ...
  ]
};

new Application(EXPRESS_APP_OPTIONS).start();
```

### <a name="module-options"></a>  Module Options
The module accepts the following options:
- `host`: the server host, ex: `127.0.0.1` or `0.0.0.0` (for docker). By default is set to `localhost`
- `port`: the server port. By default is set to `3000`
- `prefix`: the prefix for each route, ex: '/api/products. By default is set to `null`
- `http2`: activate HTTP2 (and HTTP 1.1) support. `tlsCertificateFile` and `tlsKeyFile` are required
  in this case as only secure HTTP2/HTTP1.1 over TLS are supported.
- `https`: if `http2` is false, only HTTP 1.1 will be made available over TLS (aka HTTPS). If neither `http2`
  nor `https` are true, a simple HTTP 1.1 server without TLS will be created.
- `tlsCertificateFile`: the path of the PEM formatted certificate file.
- `tlsKeyFile`: the path of the PEM formatted key file.

### <a name="express-options"></a>  Express Options
In order to configure `expressjs` application you need to listen to `ServerEvents.CONFIGURE`.

```typescript
import {ServerEvents, ServerConfigurationEvent, InjectorAwareInterface} from '@rxstack/core';
import {ExpressHttp2Server} from '@rxstack/express-http2-server';
import {Observe} from '@rxstack/async-event-dispatcher';
import {Injectable, Injector} from 'injection-js';
import {Application} from 'express';

@Injectable()
export class ConfigurationListener implements InjectorAwareInterface {

  private injector: Injector;

  setInjector(injector: Injector): void {
    this.injector = injector;
  }
  
  @Observe(ServerEvents.CONFIGURE)
  async onConfigure(event: ServerConfigurationEvent): Promise<void> {
    if (event.server.getName() !== ExpressHttp2Server.serverName) {
      return;
    }

    const app: Application = event.server.getEngine();
    
    // register any express middleware
  }
}
```

### <a name="express-middleware"></a>  Express Middleware
In addition to rxstack controllers you can register express middleware to you application.

> Important: If response is sent then native express middleware will bypass [`kernel`](../core/docs/kernel.md).

```typescript
import {
  Request as ExpressRequest, Response as ExpressResponse,
  NextFunction, RequestHandler
} from 'express';
import {Injector} from 'injection-js';

export function myCustomExpressMiddleware(injector: Injector): RequestHandler {
  return (request: ExpressRequest, response: ExpressResponse, next: NextFunction): void => {
    response.json({'id': 'express'});
  };
}
```
You need to register `myCustomExpressMiddleware` in the `express` application by using `ConfigurationListener`.

```typescript
/// ... 

const app: Application;
app.get('/my-custom-express-middleware', expressMiddleware(this.injector));
```

> You need to register the listener in the application providers

You can get any of the registered services from `injector`.



## License

Licensed under the [MIT license](../../LICENSE).