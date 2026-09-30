import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, 'dist');
const targetDir = path.resolve(__dirname, '../backend/public');

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Build output directory not found: ${sourceDir}`);
  process.exit(1);
}

try {
  // Ensure target directory exists and is clean
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy all dist files into backend/public
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`✓ Successfully synced React production build to backend/public`);
} catch (err) {
  console.error(`❌ Failed to sync build files to backend/public: ${err.message}`);
  process.exit(1);
}
