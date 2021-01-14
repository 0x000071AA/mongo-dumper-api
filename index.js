/**
 * author: Tim Weber
 * created on 02/16/2018
 *
 * Entry point for application
 */
const express = require('express');

const app = express();
const http = require('http');
const swaggerTools = require('swagger-tools');
const jsyaml = require('js-yaml');
const fs = require('fs');
const { handleErrors, authenticate } = require('./middlewares/middleware');

// init configurations and data containers
require('./configs/global');
require('./helpers/Cache');

const serverPort = 3001;

// swaggerRouter configuration
const options = {
  swaggerUi: '/swagger.json',
  controllers: './controllers',
  useStubs: process.env.NODE_ENV === 'development'
};

const spec = fs.readFileSync('./api/swagger/swagger.yaml', 'utf8');
const swaggerDoc = jsyaml.safeLoad(spec);

swaggerTools.initializeMiddleware(swaggerDoc, (middleware) => {
  /**
   * Initialize Swagger and other middleware
   */
  // middleware for setting headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-access-token');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  app.use(middleware.swaggerMetadata());
  app.use(middleware.swaggerValidator());
  app.use(authenticate);
  app.use(middleware.swaggerRouter(options));
  app.use(middleware.swaggerUi());
  app.use(handleErrors);
  http.createServer(app).listen(serverPort, () => {
    console.log('Environment: ', process.env.NODE_ENV);
    if (process.env.NODE_ENV !== 'test') {
      console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
      console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
    }
    if (process.env.NODE_ENV === 'production') {
      console.log('MongoDB-dumper-api started');
    }
  });
});

module.exports = app;
