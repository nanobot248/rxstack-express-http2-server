import 'reflect-metadata';
import {ExpressHttp2Server} from '../src/express-http2-server';
import {Injector} from 'injection-js';
import {IncomingMessage} from 'http';
import {Application, ServerManager} from '@rxstack/core';
import {EXPRESS_APP_OPTIONS} from './mocks/express-app-options';
import * as _ from 'lodash';
import {Exception} from '@rxstack/exceptions';

const rp = require('request-promise');

describe('ExpressServer', () => {

  // Setup application
  const app = new Application(EXPRESS_APP_OPTIONS);
  let injector: Injector;
  let host: string;
  let expressServer: ExpressHttp2Server;

  before(async() =>  {
    await app.start();
    injector = app.getInjector();
    expressServer = <ExpressHttp2Server>injector.get(ServerManager).getByName('express');
    host = 'https://localhost:3200/api';
  });

  after(async() =>  {
    await app.stop();
  });

  it('should get the engine', async () => {
    (typeof expressServer.getEngine()).should.not.be.undefined;
  });

  it('should call mock_text', async () => {
    const options = {
      uri: host + '/mock/text',
      resolveWithFullResponse: true,
      json: true
    };

    const response: IncomingMessage = await rp(options);
    const headers = response.headers;
    headers['x-powered-by'].should.be.equal('Express');
    headers['content-type'].should.be.equal('text/html; charset=utf-8');
    response['statusCode'].should.be.equal(200);
    response['body'].should.be.equal('something');

  });

  it('should call mock_json', async () => {
    const options = {
      uri: host + '/mock/json',
      resolveWithFullResponse: true,
      json: true
    };

    const response: IncomingMessage = await rp(options);
    const headers = response.headers;
    headers['content-type'].should.be.equal('application/json; charset=utf-8');
    response['statusCode'].should.be.equal(200);
    _.isEqual(response['body'], { id: 'json' }).should.be.equal(true);
  });

  it('should call express middleware', async () => {
    const options = {
      uri: host + '/express-middleware',
      resolveWithFullResponse: true,
      json: true
    };
    const response: IncomingMessage = await rp(options);
    const headers = response.headers;
    headers['x-powered-by'].should.be.equal('Express');
    headers['content-type'].should.be.equal('application/json; charset=utf-8');
    response['statusCode'].should.be.equal(200);
    _.isEqual(response['body'], { id: 'express' }).should.be.equal(true);
  });

  it('should download file', async () => {
    const options = {
      uri: host + '/mock/download',
      method: 'GET',
      resolveWithFullResponse: true,
    };
    const response: IncomingMessage = await rp(options);
    const headers = response.headers;
    response['statusCode'].should.be.equal(200);
    headers['content-disposition'].should.be.equal('attachment; filename="video.mp4"');
    headers['content-type'].should.be.equal('video/mp4');
  });

  it('should stream video', async () => {
    const options = {
      uri: host + '/mock/stream',
      headers: {
        'Range': 'bytes=1-200'
      },
      method: 'GET',
      resolveWithFullResponse: true,
    };

    const response: IncomingMessage = await rp(options);
    response['statusCode'].should.be.equal(206);
    response['headers']['content-range'].should.be.equal('bytes 1-200/424925');
    response['headers']['content-length'].should.be.equal('200');
  });

  it('should throw an 404 exception', async () => {
    const options = {
      uri: host + '/mock/exception',
      method: 'GET',
      resolveWithFullResponse: true,
      qs: {
        'code': 404
      },
      json: true
    };

    let err: Exception;
    try {
      await rp(options);
    } catch (e) {
      err = e;
    }
    err['statusCode'].should.be.equal(404);
    err['response']['body']['message'].should.be.equal('Not Found');
  });

  it('should throw an exception', async () => {
    const options = {
      uri: host + '/mock/exception',
      method: 'GET',
      resolveWithFullResponse: true,
      json: true
    };

    let err: Exception;
    try {
      await rp(options);
    } catch (e) {
      err = e;
    }

    err['statusCode'].should.be.equal(500);
    err['response']['body']['message'].should.be.equal('something');
  });

  it('should throw an exception in production', async () => {
    process.env.NODE_ENV = 'production';
    const options = {
      uri: host + '/mock/exception',
      method: 'GET',
      resolveWithFullResponse: true,
      json: true
    };

    let err: Exception;
    try {
      await rp(options);
    } catch (e) {
      err = e;
    }

    err['statusCode'].should.be.equal(500);
    err['response']['body']['message'].should.be.equal('Internal Server Error');

    process.env.NODE_ENV = 'testing';
  });

  it('should handle middleware exception', async () => {
    const options = {
      uri: host + '/express-middleware-error',
      method: 'GET',
      resolveWithFullResponse: true,
      json: true
    };

    let err: Exception;
    try {
      await rp(options);
    } catch (e) {
      err = e;
    }
    err['statusCode'].should.be.equal(500);
  });
});
