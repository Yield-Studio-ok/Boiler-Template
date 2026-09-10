import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

function corsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return fromEnv;
  }

  return [...fromEnv, "http://localhost:3000", "http://127.0.0.1:3000"];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === "production";

  app.use(
    helmet({
      contentSecurityPolicy: isProd,
    }),
  );

  const allowedOrigins = corsOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle("Boilerplate API")
      .setDescription("API documentation")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, "0.0.0.0");

  console.log(`Application is running on: http://localhost:${port}`);
  if (!isProd) {
    console.log(`Swagger docs at: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
