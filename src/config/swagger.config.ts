import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Credit Assessment API')
  .setDescription('AI-Powered Credit Worthiness Assessment Platform')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('Auth', 'Authentication endpoints')
  .addTag('Users', 'User management endpoints')
  .addTag('Documents', 'Document upload and management')
  .addTag('Credit Assessment', 'Credit scoring and assessment')
  .build();