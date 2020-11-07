import * as express from 'express';
import * as http from 'http';
import * as https from "https";
import * as http2 from "spdy";
import * as fs from "fs";

import {
  ErrorRequestHandler,
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import * as bodyParser from 'body-parser';
import {
  Request, Response, HttpDefinition,
  AbstractServer, ServerConfigurationEvent, ServerEvents, Transport, Kernel
} from '@rxstack/core';
import * as compress from 'compression';
import {AsyncEventDispatcher} from '@rxstack/async-event-dispatcher';
import {ExpressHttp2Settings} from './express-http2-settings';
import {Injectable} from 'injection-js';
import {Stream} from 'stream';
import {exceptionToObject, transformToException} from '@rxstack/exceptions';
import { ExpressHttp2Events } from './express-http2-events';
import { TransformRequestEvent } from './transform_request.event';
import { TransformResponseEvent } from './transform_response.event';

const winston = require('winston');

@Injectable()
export class ExpressHttp2Server extends AbstractServer {

  static readonly serverName = 'express-http2';

  public httpsServer: https.Server;
  public http2Server: http2.Server;

  getTransport(): Transport {
    return 'HTTP';
  }

  getName(): string {
    return ExpressHttp2Server.serverName;
  }

  protected async configure(routeDefinitions: HttpDefinition[]): Promise<void> {
    const configuration = this.injector.get(ExpressHttp2Settings);
    const dispatcher = this.injector.get(AsyncEventDispatcher);
    this.host = configuration.host;
    this.port = configuration.port;

    this.engine = express();
    this.engine.use(compress());
    this.engine.use(bodyParser.json());
    this.engine.use(bodyParser.urlencoded({ extended: true }));

    await dispatcher
      .dispatch(ServerEvents.CONFIGURE, new ServerConfigurationEvent(this));
    // register routes
    routeDefinitions.forEach(routeDefinition => this.registerRoute(routeDefinition, configuration));
    // important!!!
    this.engine.use(this.errorHandler());

    if (configuration.http2 === true) {
        if (configuration.tlsCertificateFile == null || configuration.tlsKeyFile == null) {
            throw new Error("Cannot create HTTP/2 server without certificate and key file.");
        }
        const certificateData = fs.readFileSync(configuration.tlsCertificateFile);
        const keyData = fs.readFileSync(configuration.tlsKeyFile);
        this.http2Server = http2.createServer({
            cert: certificateData,
            key: keyData,
            spdy: {
                protocols: ["h2", "http/1.1"]
            }
        }, this.engine);
    } else if (configuration.https === true) {
        if (configuration.tlsCertificateFile == null || configuration.tlsKeyFile == null) {
            throw new Error("Cannot create HTTP/2 server without certificate and key file.");
        }
        const certificateData = fs.readFileSync(configuration.tlsCertificateFile);
        const keyData = fs.readFileSync(configuration.tlsKeyFile);
        this.http2Server = https.createServer({
            cert: certificateData,
            key: keyData
        }, this.engine);
    } else {
        this.httpServer = http.createServer(<any>(this.engine));
    }
  }

  async startEngine(): Promise<void> {
    if (this.http2Server != null) {
        this.http2Server.listen(this.port, this.host, () => this.logMessage('Starting HTTP/2 server.'));
    } else if (this.httpsServer != null) {
        this.httpsServer.listen(this.port, this.host, () => this.logMessage('Starting HTTPS server.'));
    } else if (this.httpServer != null) {
        this.httpServer.listen(this.port, this.host, () => this.logMessage('Starting HTTP server.'));
    }
  }

  async stopEngine(): Promise<void> {
    if (this.http2Server != null) {
        this.http2Server.close(() => this.logMessage('Closing HTTP/2 server.'));
    } else if (this.httpsServer != null) {
        this.httpsServer.close(() => this.logMessage('Closing HTTPS server.'));
    } else if (this.httpServer != null) {
        this.httpServer.close(() => this.logMessage('Closing HTTP server.'));
    }
  }

  private createRequest(req: ExpressRequest, routeDefinition: HttpDefinition): Request {
    const request = new Request('HTTP');
    request.path = routeDefinition.path;
    request.headers.fromObject(req.headers);
    request.params.fromObject(Object.assign(req.query, req.params));
    request.body = req.body;
    return request;
  }

  private async registerRoute(routeDefinition: HttpDefinition, configuration: ExpressHttp2Settings): Promise<void> {
    const prefix: string = configuration.prefix;
    const path: string = prefix ? (prefix + routeDefinition.path) : routeDefinition.path;

    return this.engine[routeDefinition.method.toLowerCase()](path,
      async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
        try {
          const request = this.createRequest(req, routeDefinition);
          const dispatcher = this.injector.get(AsyncEventDispatcher);
          const requestTransformEvent = new TransformRequestEvent(req, request);
          await dispatcher.dispatch(ExpressHttp2Events.TRANSFORM_REQUEST, requestTransformEvent);
          const response = await routeDefinition.handler(request);
          const responseTransformEvent = new TransformResponseEvent(response, res);
          await dispatcher.dispatch(ExpressHttp2Events.TRANSFORM_RESPONSE, responseTransformEvent);
          this.responseHandler(response, req, res, next);
        } catch (e) {
          this.errorHandler()(e, req, res, next);
        }
    });
  }

  private responseHandler(response: Response, req: ExpressRequest, res: ExpressResponse, next: NextFunction): void {
    response.headers.forEach((value, key) => res.header(key, value));
    res.status(response.statusCode);
    if (response.content instanceof Stream.Readable) {
      response.content.pipe(res);
      response.content.on('error', (err: any) => next(transformToException(err)));
    } else {
      res.send(response.content);
    }
  }

  private errorHandler(): ErrorRequestHandler {
    return (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction): void => {
      const status = err.statusCode ? err.statusCode : 500;
      const transformedException = exceptionToObject(err, {status: status});
      if (status >= 500) {
        res.getHeaderNames().forEach((name) => res.removeHeader(name));
        winston.error(err.message, transformedException);
      } else {
        winston.debug(err.message, transformedException);
      }

      if (process.env.NODE_ENV === 'production' && status >= 500) {
        res.status(status).send({
          'statusCode': status,
          'message': 'Internal Server Error'
        });
      } else {
        res.status(status).send(err);
      }
    };
  }
}