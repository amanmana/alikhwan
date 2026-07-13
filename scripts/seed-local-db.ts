import { execSync } from 'child_process';
import * as path from 'path';

try {
  console.log('--- Memulakan Penyemaian Data Mock (Seeding Local DB) ---');
  const sqlFilePath = path.resolve('scripts/seed.sql');
  
  // Execute the seed SQL script via Wrangler on local D1
  execSync(`npx wrangler d1 execute alikhwan-db --file="${sqlFilePath}" --local`, { stdio: 'inherit' });
  
  console.log('--- Penyemaian Data Mock Berjaya Diisi! ---');
} catch (error) {
  console.error('Ralat semasa menyemai database lokal:', error);
  process.exit(1);
}
