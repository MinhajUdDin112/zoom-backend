import { Logger } from "@nestjs/common";
import { join } from "path";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
export const dbConfig = (): PostgresConnectionOptions => ({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: process.env.POSTGRES_SSL === "true",
  schema: process.env.POSTGRES_SCHEMA,
  entities: [join(__dirname, "../**/*.entity{.ts,.js}")],
  // We are using migrations, synchronize should be set to false.
  synchronize: true,
  dropSchema: false,
  extra: {
    charset: "latin1",
    collation: "latin1_swedish_ci",
    max: 50, // Set the maximum number of connections in the pool
    idleTimeoutMillis: 30000, // 30 seconds for idle timeout
    connectionTimeoutMillis: 4000, // 2 seconds for connection timeout
  },
  // Run migrations automatically,
  // you can disable this if you prefer running migration manually.
  migrationsRun: false,
  logging: true,
  migrations: [join(__dirname, "../migrations/**/*{.ts,.js}")],
  // cli: {
  //   migrationsDir: join(__dirname, '../migrations'),
  //   entitiesDir: join(__dirname, '../**/*.entity{.ts,.js}'),
  // },
});

if (process.env.NODE_ENV === "development") {
  Logger.debug(dbConfig());
}

export default dbConfig();
