import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST, // 'localhost'
  port: Number(process.env.DB_PORT), // 1433
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // instância local, sem TLS
    trustServerCertificate: true,
  },
  synchronize: false,
  logging: true,
  migrations: ['src/migrations/*.ts'],
});
