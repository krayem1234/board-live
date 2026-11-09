import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true })
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`Board Live backend running on http://localhost:${port}`)
}
bootstrap()
