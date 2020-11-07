import {ExpressHttp2Server} from './express-http2-server';
import {ExpressHttp2Settings} from './express-http2-settings';
import {Module, ModuleWithProviders, SERVER_REGISTRY} from '@rxstack/core';

@Module()
export class ExpressHttp2Module {
  static configure(configuration?: ExpressHttp2Settings): ModuleWithProviders {
    return {
      module: ExpressHttp2Module,
      providers: [
        {
          provide: ExpressHttp2Settings,
          useFactory: () => {
            return Object.assign(new ExpressHttp2Settings(), configuration);
          },
          deps: []
        },
        { provide: SERVER_REGISTRY, useClass: ExpressHttp2Server, multi: true },
      ],
    };
  }
}