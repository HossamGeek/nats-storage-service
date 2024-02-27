import { NestFactory } from '@nestjs/core';
import { NatsStorageModule } from './natsStorage.module';

async function bootstrap() {
  const app = await NestFactory.create(NatsStorageModule);
  await app.listen(5000);
}
bootstrap();

