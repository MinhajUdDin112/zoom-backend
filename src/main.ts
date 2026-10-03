import * as bodyParser from "body-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as helmet from "helmet";
import { Logger } from "nestjs-pino";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import firebase from "firebase-admin";
import { ConfigService } from "@nestjs/config";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  // Enable CORS with options
  const corsOptions: CorsOptions = {
    origin: true, // Allow all origins. You can set specific origins instead.
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Set the allowed HTTP methods
    allowedHeaders: "*", // Set the allowed request headers
    exposedHeaders: "*", // Set the exposed response headers
    credentials: true, // Allow credentials (e.g., cookies, authorization headers)
  };
  app.enableCors(corsOptions);

  const rawBodyBuffer = (req, res, buffer, encoding) => {
    if (buffer && buffer.length) {
      req.rawBody = buffer.toString(encoding || "utf8");
    }
  };

  // app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
  // app.use(bodyParser.json({ verify: rawBodyBuffer }));
  app.use(bodyParser.json({ verify: rawBodyBuffer, limit: "10mb" }));
  app.use(
    bodyParser.urlencoded({
      verify: rawBodyBuffer,
      limit: "10mb",
      extended: true,
    })
  );
  app.use(helmet());
  app.setGlobalPrefix("");
  var serviceAccount = require("../zoom-cars-2c98b-firebase-adminsdk-1poch-3d5181ce5d.json");
  const firebaseConfig = {
    apiKey: configService.get<string>("FIREBASE_API_KEY"),
    authDomain: configService.get<string>("FIREBASE_AUTH_DOMAIN"),
    projectId: configService.get<string>("FIREBASE_PROJECT_ID"),
    storageBucket: configService.get<string>("FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: configService.get<string>("FIREBASE_MESSAGINGSENDER_ID"),
    appId: configService.get<string>("FIREBASE_APP_ID"),
  };
  if (!firebase.apps.length) {
    try {
      firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.log("Error in initializing firebase ", e);
    }
  }
  const config = new DocumentBuilder()
    .setTitle("Tekrowe")
    .setDescription("Tekrowe")
    .setVersion("1.0")
    .addTag("api")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);
  app.useLogger(app.get(Logger));

  app.listen(process.env.PORT, "0.0.0.0").then(() => {
    console.log(
      "Listening from zoom car  server on Host: " +
        process.env.HOST +
        " Port: " +
        process.env.PORT
    );
  });
}

bootstrap();
