import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainExceptionFilter } from '../core/exceptions/domain-exception.filter.js';
import { DomainError } from '../core/exceptions/domain-error.js';
import { DomainExceptions } from '../core/exceptions/domain-exceptions.js';
import { HttpRequestLoggingMiddleware } from '../core/logging/http-request-logging.middleware.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export function setupApp(app: NestExpressApplication): void {
  const requestLogger = new HttpRequestLoggingMiddleware();
  app.use(requestLogger.use.bind(requestLogger));
  app.useStaticAssets(join(currentDirectory, '..', 'assets'), {
    prefix: '/api/v1/swagger-assets',
  });

  app.enableCors({
    origin: [
      'https://lumosapp.net',
      'https://dev.lumosapp.net:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalFilters(new DomainExceptionFilter());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true,
      whitelist: true,
      exceptionFactory: (errors): never => {
        const errorsMessages: DomainError[] = errors.map((err) => ({
          field: err.property,
          message: Object.values(err.constraints || {})[0],
        }));

        return DomainExceptions.validation(errorsMessages);
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lumosapp API')
    .setDescription('Documentation for the Lumosapp API.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT accessToken in Authorization Bearer header. Must be valid and not expired.',
      },
      'accessToken',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'JWT refreshToken inside cookie. Must be correct and not expired.',
      },
      'refreshToken',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document, {
    customCss: `
      body {
        background: #111827;
      }

      .swagger-ui {
        min-height: 100vh;
        position: relative;
        z-index: 1;
        background:
          linear-gradient(rgba(17, 24, 39, 0.72), rgba(17, 24, 39, 0.72)),
          url('/api/v1/swagger-assets/swagger-background.png') center / cover fixed !important;
      }

      #swagger-background-video {
        position: fixed;
        inset: 0;
        z-index: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #swagger-video-sound-toggle {
        position: fixed;
        top: 18px;
        right: 24px;
        z-index: 3;
        border: 1px solid #ff8a8a;
        border-radius: 8px;
        padding: 9px 14px;
        color: #fff;
        background: #e11d48;
        cursor: pointer;
        font: 600 14px sans-serif;
      }

      #swagger-video-sound-toggle:hover {
        background: #be123c;
      }

      .swagger-video-active .swagger-ui {
        background: rgba(17, 24, 39, 0.72) !important;
      }
    `,
    customJsStr: `
      let video;

      const preloadVideo = () => {
        if (video) {
          return video;
        }

        video = document.createElement('video');
        video.id = 'swagger-background-video';
        video.src =
          'https://storage.yandexcloud.net/lumus-media/lumos-media.mp4';
        video.preload = 'auto';
        video.loop = true;
        video.muted = true;
        video.volume = 0.05;
        video.playsInline = true;
        document.body.append(video);
        video.load();

        return video;
      };

      const preloadAfterSwaggerIsReady = () => {
        if (document.querySelector('.opblock-summary')) {
          preloadVideo();
          return;
        }

        const observer = new MutationObserver(() => {
          if (document.querySelector('.opblock-summary')) {
            preloadVideo();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      };

      if (document.readyState === 'complete') {
        preloadAfterSwaggerIsReady();
      } else {
        window.addEventListener('load', preloadAfterSwaggerIsReady, { once: true });
      }

      document.addEventListener('click', (event) => {
        const target = event.target;

        if (!(target instanceof Element) || !target.closest('.opblock-summary')) {
          return;
        }

        const currentVideo = preloadVideo();

        if (currentVideo.dataset.started === 'true') {
          return;
        }

        currentVideo.dataset.started = 'true';
        currentVideo.muted = false;
        document.body.classList.add('swagger-video-active');

        const soundToggle = document.createElement('button');
        soundToggle.id = 'swagger-video-sound-toggle';
        soundToggle.type = 'button';
        soundToggle.textContent = 'Минус Вайб';
        soundToggle.addEventListener('click', () => {
          currentVideo.muted = !currentVideo.muted;
          soundToggle.textContent = currentVideo.muted ? 'Плюс Вайб' : 'Минус Вайб';
        });
        document.body.append(soundToggle);

        currentVideo.play().catch(() => {
          delete currentVideo.dataset.started;
          currentVideo.muted = true;
          document.body.classList.remove('swagger-video-active');
          soundToggle.remove();
        });
      });
    `,
  });
}
