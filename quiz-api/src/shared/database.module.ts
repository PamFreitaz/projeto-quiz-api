import { Inject, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mssql',
        host: cfg.get('DB_HOST'), // 'localhost'
        port: Number(cfg.get('DB_PORT')), // 1433
        username: cfg.get('DB_USER'),
        password: cfg.get('DB_PASS'),
        database: cfg.get('DB_NAME'),
        options: {
          encrypt: false, // instância local, sem TLS
          trustServerCertificate: true,
        },
        synchronize: false,
        logging: true,
        migrations: ['dist/migrations/*.js'],
      }),
    }),
  ],
})
export class DatabaseModule {}
