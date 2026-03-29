import { io } from 'socket.io-client';

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://localhost:3001',
    auctionId: '',
    joinColdA: 200,
    joinColdB: 500,
    joinWarm: 500,
    fanoutA: 200,
    fanoutB: 500,
    timeoutMs: 15000,
    skipFanout: false,
    bidderAEmail: 'buyer@auction.com',
    bidderBEmail: 'buyer2@auction.com',
    bidderPassword: 'user123456',
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    switch (token) {
      case '--baseUrl':
        if (next) {
          options.baseUrl = next;
          index += 1;
        }
        break;
      case '--auctionId':
        if (next) {
          options.auctionId = next;
          index += 1;
        }
        break;
      case '--joinColdA':
        if (next) {
          options.joinColdA = Number(next);
          index += 1;
        }
        break;
      case '--joinColdB':
        if (next) {
          options.joinColdB = Number(next);
          index += 1;
        }
        break;
      case '--joinWarm':
        if (next) {
          options.joinWarm = Number(next);
          index += 1;
        }
        break;
      case '--fanoutA':
        if (next) {
          options.fanoutA = Number(next);
          index += 1;
        }
        break;
      case '--fanoutB':
        if (next) {
          options.fanoutB = Number(next);
          index += 1;
        }
        break;
      case '--timeoutMs':
        if (next) {
          options.timeoutMs = Number(next);
          index += 1;
        }
        break;
      case '--skipFanout':
        options.skipFanout = true;
        break;
      default:
        if (!token.startsWith('--')) {
          positional.push(token);
        }
        break;
    }
  }

  if (positional.length >= 1) options.joinColdA = Number(positional[0]);
  if (positional.length >= 2) options.joinColdB = Number(positional[1]);
  if (positional.length >= 3) options.joinWarm = Number(positional[2]);
  if (positional.length >= 4) options.fanoutA = Number(positional[3]);
  if (positional.length >= 5) options.fanoutB = Number(positional[4]);

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function buildStats(name, expected, latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    name,
    expected,
    received: latencies.length,
    dropped: Math.max(0, expected - latencies.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] || 0,
    avg: sorted.length ? Math.round(sorted.reduce((sum, item) => sum + item, 0) / sorted.length) : 0,
  };
}

async function jsonFetch(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `HTTP ${response.status}`);
  }
  return body;
}

async function resolveAuctionId(baseUrl, explicitAuctionId) {
  if (explicitAuctionId) return explicitAuctionId;

  const body = await jsonFetch(baseUrl, '/api/auctions?status=ACTIVE&page=1&limit=1');
  const first = Array.isArray(body?.data) ? body.data[0] : undefined;
  if (!first?.id) {
    throw new Error('Không tìm thấy phiên ACTIVE. Hãy seed dữ liệu trước khi benchmark.');
  }
  return first.id;
}

async function connectClients(baseUrl, count, timeoutMs) {
  const sockets = [];

  await Promise.all(
    Array.from({ length: count }, () =>
      new Promise((resolve) => {
        const socket = io(baseUrl, {
          transports: ['websocket'],
          reconnection: false,
          timeout: timeoutMs,
        });
        sockets.push(socket);

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve(undefined);
        };

        socket.on('connect', finish);
        socket.on('connect_error', finish);
        setTimeout(finish, timeoutMs);
      }),
    ),
  );

  return sockets;
}

async function runConnectCold(baseUrl, count, timeoutMs) {
  const sockets = [];
  const latencies = [];

  await Promise.all(
    Array.from({ length: count }, () =>
      new Promise((resolve) => {
        const startedAt = Date.now();
        const socket = io(baseUrl, {
          transports: ['websocket'],
          reconnection: false,
          timeout: timeoutMs,
        });
        sockets.push(socket);

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve(undefined);
        };

        socket.on('connect', () => {
          latencies.push(Date.now() - startedAt);
          finish();
        });
        socket.on('connect_error', finish);
        socket.on('error', finish);
        setTimeout(finish, timeoutMs);
      }),
    ),
  );

  for (const socket of sockets) {
    socket.disconnect();
  }

  return buildStats(`connect_cold_${count}`, count, latencies);
}

async function runJoinCold(baseUrl, auctionId, count, timeoutMs) {
  const sockets = [];
  const latencies = [];

  await Promise.all(
    Array.from({ length: count }, () =>
      new Promise((resolve) => {
        let startedAt = 0;
        const socket = io(baseUrl, {
          transports: ['websocket'],
          reconnection: false,
          timeout: timeoutMs,
        });
        sockets.push(socket);

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve(undefined);
        };

        socket.on('connect', () => {
          startedAt = Date.now();
          socket.emit('auction:join', { auctionId });
        });
        socket.on('auction:snapshot', () => {
          if (startedAt > 0) {
            latencies.push(Date.now() - startedAt);
          }
          finish();
        });
        socket.on('connect_error', finish);
        socket.on('error', finish);
        setTimeout(finish, timeoutMs);
      }),
    ),
  );

  for (const socket of sockets) {
    socket.disconnect();
  }

  return buildStats(`join_cold_${count}`, count, latencies);
}

async function runJoinWarm(baseUrl, auctionId, count, timeoutMs) {
  const sockets = await connectClients(baseUrl, count, timeoutMs);
  const latencies = [];
  const startAt = Date.now();

  await Promise.all(
    sockets.map(
      (socket) =>
        new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve(undefined);
          };

          const handleSnapshot = () => {
            latencies.push(Date.now() - startAt);
            socket.off('auction:snapshot', handleSnapshot);
            finish();
          };

          socket.on('auction:snapshot', handleSnapshot);
          socket.emit('auction:join', { auctionId });

          setTimeout(() => {
            socket.off('auction:snapshot', handleSnapshot);
            finish();
          }, timeoutMs);
        }),
    ),
  );

  for (const socket of sockets) {
    socket.disconnect();
  }

  return buildStats(`join_warm_${count}`, count, latencies);
}

async function login(baseUrl, email, password) {
  const body = await jsonFetch(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = body?.data?.tokens?.accessToken;
  if (!token) {
    throw new Error(`Đăng nhập thất bại cho tài khoản ${email}`);
  }
  return token;
}

async function getAuction(baseUrl, auctionId) {
  const body = await jsonFetch(baseUrl, `/api/auctions/${auctionId}`);
  return body.data;
}

async function placeBid(baseUrl, token, auctionId, amount, clientRequestId) {
  return jsonFetch(baseUrl, '/api/bids', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ auctionId, amount, clientRequestId }),
  });
}

async function runBidFanout(baseUrl, auctionId, count, timeoutMs, bidderEmail, bidderPassword) {
  const sockets = await connectClients(baseUrl, count, timeoutMs);
  try {
    await Promise.all(
      sockets.map(
        (socket) =>
          new Promise((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              resolve(undefined);
            };

            const handleSnapshot = () => {
              socket.off('auction:snapshot', handleSnapshot);
              finish();
            };

            socket.on('auction:snapshot', handleSnapshot);
            socket.emit('auction:join', { auctionId });
            setTimeout(() => {
              socket.off('auction:snapshot', handleSnapshot);
              finish();
            }, timeoutMs);
          }),
      ),
    );

    const token = await login(baseUrl, bidderEmail, bidderPassword);
    const auction = await getAuction(baseUrl, auctionId);
    const nextAmount = Number(auction.currentPrice) + Number(auction.minBidStep);
    const latencies = [];
    const startAt = Date.now();

    const receivePromises = sockets.map(
      (socket) =>
        new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve(undefined);
          };

          const handleBidNew = (payload) => {
            if (payload?.bid?.amount === nextAmount) {
              latencies.push(Date.now() - startAt);
              socket.off('bid:new', handleBidNew);
              finish();
            }
          };

          socket.on('bid:new', handleBidNew);
          setTimeout(() => {
            socket.off('bid:new', handleBidNew);
            finish();
          }, timeoutMs);
        }),
    );

    await placeBid(baseUrl, token, auctionId, nextAmount, `bench-${Date.now()}-${count}`);
    await Promise.all(receivePromises);

    return buildStats(`fanout_${count}`, count, latencies);
  } finally {
    for (const socket of sockets) {
      socket.disconnect();
    }
  }
}

function printResult(result) {
  console.log(
    `${result.name.padEnd(20)} | received ${String(result.received).padStart(4)}/${String(result.expected).padEnd(4)} | p95=${String(result.p95).padStart(4)} ms | p99=${String(result.p99).padStart(4)} ms | max=${String(result.max).padStart(4)} ms`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const auctionId = await resolveAuctionId(options.baseUrl, options.auctionId);
  const results = [];

  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Auction ID: ${auctionId}`);
  console.log('---');

  results.push(await runConnectCold(options.baseUrl, options.joinColdA, options.timeoutMs));
  await sleep(1200);

  results.push(await runConnectCold(options.baseUrl, options.joinColdB, options.timeoutMs));
  await sleep(1200);

  results.push(await runJoinCold(options.baseUrl, auctionId, options.joinColdA, options.timeoutMs));
  await sleep(1200);

  results.push(await runJoinCold(options.baseUrl, auctionId, options.joinColdB, options.timeoutMs));
  await sleep(1200);

  results.push(await runJoinWarm(options.baseUrl, auctionId, options.joinWarm, options.timeoutMs));
  await sleep(1200);

  if (!options.skipFanout) {
    results.push(
      await runBidFanout(
        options.baseUrl,
        auctionId,
        options.fanoutA,
        options.timeoutMs,
        options.bidderAEmail,
        options.bidderPassword,
      ),
    );
    await sleep(1600);

    results.push(
      await runBidFanout(
        options.baseUrl,
        auctionId,
        options.fanoutB,
        options.timeoutMs,
        options.bidderBEmail,
        options.bidderPassword,
      ),
    );
  }

  console.log('KẾT QUẢ TÓM TẮT');
  for (const result of results) {
    printResult(result);
  }

  console.log('---');
  console.log('JSON');
  console.log(JSON.stringify({ baseUrl: options.baseUrl, auctionId, results }, null, 2));
}

main().catch((error) => {
  console.error('Benchmark failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
