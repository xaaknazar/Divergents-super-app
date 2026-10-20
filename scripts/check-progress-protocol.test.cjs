const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkProgressProtocol } = require('./check-progress-protocol.cjs');
const ready = { protocol: 2, ready: true, operationReceipts: true, conditionalWrites: true, explicitDay: true, activeMemberships: true };
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
test('gate only reads the configured API and requires all capabilities', async () => {
  assert.equal(await checkProgressProtocol(async (url, options) => {
    assert.equal(url, 'https://divergents-lms.kz/api/mobile/challenges/protocol');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    return response(ready);
  }), 'https://divergents-lms.kz');
  for (const body of [null, { ready: true }, { ...ready, ready: false }, { ...ready, protocol: 1 }, { ...ready, explicitDay: false }, { ...ready, activeMemberships: undefined }]) {
    await assert.rejects(checkProgressProtocol(async () => response(body)), /не готов/);
  }
});
test('404, failed migrations, redirects and network failures stop release', async () => {
  for (const status of [404, 503, 302]) await assert.rejects(checkProgressProtocol(async () => response(ready, status)));
  await assert.rejects(checkProgressProtocol(async () => { throw Error('network'); }));
});
