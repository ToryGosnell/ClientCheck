const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

async function check(path, expected = 200) {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  if (res.status !== expected) {
    throw new Error(`${path} expected ${expected} got ${res.status}: ${text}`);
  }
  return text;
}

async function main() {
  await check('/api/health');
  console.log('health ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
