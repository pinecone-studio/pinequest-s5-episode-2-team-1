// `npm run dev` / `npm run dev:ai`: wrangler dev-ийг LAN (0.0.0.0:8787) дээр асаана.
// Нууц утгуудыг api/.dev.vars, дараа нь repo-ийн root дээрх .env.local-оос уншина — зөвхөн
// байгаа файлуудыг дамжуулна (wrangler байхгүй --env-file-д алдаа өгдөг тул шинэ clone дээр эвдрэхгүй).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFiles = [join(apiDir, '.dev.vars'), join(apiDir, '..', '.env.local')].filter((f) => existsSync(f));

const extra = process.argv.slice(2);
const args = ['dev', ...extra];
if (!extra.includes('--ip')) args.push('--ip', '0.0.0.0');
if (!extra.includes('--port')) args.push('--port', '8787');
for (const f of envFiles) args.push('--env-file', f);

// .bin/wrangler.cmd-г Windows-д shell-гүйгээр spawn хийж болохгүй (Node ≥ 20: EINVAL), shell-ээр бол зайтай замыг
// задална. Тиймээс wrangler-ийн JS entry-г одоогийн node-оор шууд ажиллуулна: бүх үйлдлийн системд ижил.
const wrangler = join(apiDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wrangler)) {
  console.error('wrangler олдсонгүй: api/ дотор `npm install` хийнэ үү.');
  process.exit(1);
}
const child = spawn(process.execPath, [wrangler, ...args], { cwd: apiDir, stdio: 'inherit' });
child.on('error', (e) => {
  console.error(e.message);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(signal ? 0 : (code ?? 0)));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
