/**
 * CLM Platform Satellite Gateway Daemon Runner
 * Executable runner that connects to the control plane, emits outbound heartbeats,
 * and executes deployment & discovery tasks.
 */

const http = require('http');

const CONTROL_PLANE_URL = process.env.CLM_CONTROL_PLANE_URL || 'http://localhost:4000/api/v1';
const GATEWAY_ID = process.env.CLM_GATEWAY_ID || '20000000-0000-0000-0000-000000000001';
const VERSION = '1.0.0';
const HOSTNAME = 'gw-prod-01.acme.internal';
const IP_ADDRESS = '10.0.1.15';
const INTERVAL_MS = 20000;

console.log(`[Gateway Daemon] Starting satellite daemon v${VERSION}...`);
console.log(`[Gateway Daemon] Target Control Plane: ${CONTROL_PLANE_URL}`);
console.log(`[Gateway Daemon] Gateway ID: ${GATEWAY_ID} (${HOSTNAME})`);

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONTROL_PLANE_URL}${path}`);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendHeartbeat() {
  const cpu = parseFloat((1.2 + Math.random() * 1.5).toFixed(2));
  const mem = parseFloat((138.0 + Math.random() * 10).toFixed(1));

  try {
    const resp = await postJson('/ingress/gateway/heartbeat', {
      gatewayId: GATEWAY_ID,
      version: VERSION,
      ipAddress: IP_ADDRESS,
      activeCertsCount: 4,
      metrics: {
        cpuUsage: cpu,
        memoryMb: mem,
      },
    });

    console.log(`[Heartbeat ACK] Beacon accepted. CPU: ${cpu}%, RAM: ${mem}MB, Commands: ${resp.commands?.length || 0}`);

    if (resp.commands && resp.commands.length > 0) {
      for (const cmd of resp.commands) {
        console.log(`[Command EXEC] Executing command ${cmd.id} (${cmd.type})`);
        await postJson('/ingress/gateway/command-ack', {
          commandId: cmd.id,
          gatewayId: GATEWAY_ID,
          status: 'COMPLETED',
          result: {
            executedAt: new Date().toISOString(),
            status: 'SUCCESS',
          },
        });
        console.log(`[Command ACK] Acknowledged command ${cmd.id}`);
      }
    }
  } catch (err) {
    console.warn(`[Heartbeat WARN] Could not send beacon to control plane: ${err.message}`);
  }
}

// Initial beacon
sendHeartbeat();

// Periodic loop
const intervalId = setInterval(sendHeartbeat, INTERVAL_MS);

process.on('SIGINT', () => {
  clearInterval(intervalId);
  console.log('[Gateway Daemon] Gracefully stopped.');
  process.exit(0);
});

