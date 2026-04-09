import 'dotenv/config';
import { buildApp } from './app';

async function bootstrap() {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3333);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`BarbUP backend running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
