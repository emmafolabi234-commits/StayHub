// src/middleware/swagger.js
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../docs/openapi.json');

module.exports = [swaggerUi.serve, swaggerUi.setup(swaggerDocument)];
