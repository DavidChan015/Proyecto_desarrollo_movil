import { app } from './app.js';
import { initDatabase } from './src/infrastructure/database/initDatabase.js';
import { getJwtSecret } from './src/config/auth.js';

async function start() {
  getJwtSecret();
  await initDatabase();
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });
}

start().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});

