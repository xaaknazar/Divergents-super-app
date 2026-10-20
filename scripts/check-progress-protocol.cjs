// Read-only: prevent shipping a v2 client against a v1/unmigrated production API.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

async function checkProgressProtocol(fetcher = fetch) {
  const config = readFileSync(resolve(__dirname, '../src/config.ts'), 'utf8');
  const base = config.match(/export const API_BASE = ['"]([^'"]+)['"]/u)?.[1];
  if (!base) throw new Error('Не удалось определить API_BASE приложения. Проверка релиза остановлена.');
  const response = await fetcher(`${base}/api/mobile/challenges/protocol`, {
    method: 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.protocol !== 2 || data.ready !== true || data.operationReceipts !== true
    || data.conditionalWrites !== true || data.explicitDay !== true || data.activeMemberships !== true) {
    throw new Error(`API отметок не готов к этой сборке (HTTP ${response.status}). Сначала нужен совместимый серверный релиз и additive-миграция. Сборка остановлена.`);
  }
  return base;
}
module.exports = { checkProgressProtocol };
if (require.main === module) {
  if (process.argv.includes('--eas') && ['development', 'development-device'].includes(process.env.EAS_BUILD_PROFILE)) {
    console.log('Development build: production release gate is not required.');
  } else {
    checkProgressProtocol().then(base => console.log(`API отметок v2 готов: ${base}`))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
