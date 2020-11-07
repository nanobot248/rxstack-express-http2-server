export const express_server_environment = {
  servers: ['express-http2'],
  express_http2_server: {
    port: 3200,
    http2: true,
    https: true,
    tlsCertificateFile: "../data/server.crt.pem",
    tlsKeyFile: "../data/server.key.pem"
  }
};