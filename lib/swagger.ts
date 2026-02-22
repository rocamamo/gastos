import swaggerJsDoc from 'swagger-jsdoc';

export const getApiDocs = () => {
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Gastos Colaborativo API',
                version: '1.0.0',
                description: 'API documentation for the collaborative expense tracker',
            },
            servers: [
                {
                    url: '/api',
                },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
            security: [
                {
                    bearerAuth: [],
                },
            ],
        },
        apis: ['app/api/**/*.ts'],
    };

    return swaggerJsDoc(swaggerOptions);
};
