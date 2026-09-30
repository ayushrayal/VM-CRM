const clients = new Set();

// Send SSE heartbeat comment every 25 seconds to keep connections alive through proxies (Render has 100s idle timeout)
const heartbeatTimer = setInterval(() => {
  if (clients.size === 0) return;
  for (const client of clients) {
    try {
      client.write(': ping\n\n');
    } catch {
      clients.delete(client);
    }
  }
}, 25000);

// Unref timer so it does not block Node process exit (useful for tests and graceful shutdown)
if (heartbeatTimer.unref) {
  heartbeatTimer.unref();
}

export const addSseClient = (res) => {
  clients.add(res);

  res.on('close', () => {
    clients.delete(res);
  });
};

export const broadcastEvent = (eventType, data) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
};
