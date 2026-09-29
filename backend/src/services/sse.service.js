const clients = new Set();

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
