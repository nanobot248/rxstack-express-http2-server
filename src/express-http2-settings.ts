export class ExpressHttp2Settings {
    host ?= 'localhost';
    port ?= 3000;
    prefix?: string;
    http2 ?= true;
    https ?= false;
    tlsCertificateFile?: string;
    tlsKeyFile?: string;
  }