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
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Safely clean only stale assets directory to prevent leftover hashed files
  const targetAssetsDir = path.join(targetDir, 'assets');
  if (fs.existsSync(targetAssetsDir)) {
    fs.rmSync(targetAssetsDir, { recursive: true, force: true });
  }

  // Copy all dist files into backend/public
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  // Verify critical production files exist
  const targetIndex = path.join(targetDir, 'index.html');
  if (!fs.existsSync(targetIndex)) {
    throw new Error('index.html missing after copying build artifacts');
  }

  const copiedAssets = fs.existsSync(targetAssetsDir) ? fs.readdirSync(targetAssetsDir) : [];
  console.log(`✓ Successfully synced React production build to backend/public (${copiedAssets.length} assets synced)`);
} catch (err) {
  console.error(`❌ Failed to sync build files to backend/public: ${err.message}`);
  process.exit(1);
}
