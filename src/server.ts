import app from './app';
import { env } from './config/env';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const port = env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${env.NODE_ENV} mode.`);
});

process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
