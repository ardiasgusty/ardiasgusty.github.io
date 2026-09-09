const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export class Multiplayer {
  constructor(onState = () => {}) {
    this.client = null;
    this.channel = null;
    this.roomCode = null;
    this.playerId = crypto.randomUUID();
    this.name = 'Player';
    this.isHost = false;
    this.players = new Map();
    this.settings = { mapId: 'jakarta', laps: 3 };
    this.onState = onState;
    this.messageHandlers = new Set();
  }

  getConfig() {
    return {
      url: localStorage.getItem('hsr_supabase_url') || '',
      key: localStorage.getItem('hsr_supabase_key') || ''
    };
  }

  saveConfig(url, key) {
    localStorage.setItem('hsr_supabase_url', url.trim());
    localStorage.setItem('hsr_supabase_key', key.trim());
  }

  async connect() {
    const { url, key } = this.getConfig();
    if (!url || !key) throw new Error('Supabase belum dikonfigurasi.');
    const { createClient } = await import(CDN);
    this.client = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
    return true;
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async createRoom(name, carId) {
    this.roomCode = this.generateCode();
    this.isHost = true;
    await this.joinChannel(name, carId);
    return this.roomCode;
  }

  async joinRoom(code, name, carId) {
    this.roomCode = code.trim().toUpperCase();
    this.isHost = false;
    await this.joinChannel(name, carId);
    return this.roomCode;
  }

  async joinChannel(name, carId) {
    if (!this.client) await this.connect();
    this.name = name || 'Player';
    this.channel = this.client.channel(`race:${this.roomCode}`, {
      config: {
        presence: { key: this.playerId },
        broadcast: { self: false, ack: false }
      }
    });

    this.channel
      .on('presence', { event: 'sync' }, () => this.syncPresence())
      .on('broadcast', { event: 'game' }, ({ payload }) => this.handleMessage(payload));

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Gagal terhubung ke room.')), 10000);
      this.channel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          await this.channel.track({
            id: this.playerId,
            name: this.name,
            carId,
            ready: false,
            host: this.isHost,
            joinedAt: Date.now()
          });
          resolve();
        }
      });
    });
  }

  syncPresence() {
    if (!this.channel) return;
    const state = this.channel.presenceState();
    this.players.clear();
    Object.values(state).flat().forEach(p => this.players.set(p.id, p));
    this.onState(this.snapshot());
  }

  snapshot() {
    return {
      roomCode: this.roomCode,
      isHost: this.isHost,
      players: [...this.players.values()],
      settings: { ...this.settings }
    };
  }

  async updateSelf(patch) {
    if (!this.channel) return;
    const current = this.players.get(this.playerId) || { id: this.playerId, name: this.name };
    await this.channel.track({ ...current, ...patch, id: this.playerId, name: this.name, host: this.isHost });
  }

  async broadcast(type, data = {}) {
    if (!this.channel) return;
    await this.channel.send({ type: 'broadcast', event: 'game', payload: { type, from: this.playerId, data, ts: Date.now() } });
  }

  handleMessage(msg) {
    if (msg.type === 'SETTINGS') {
      this.settings = { ...this.settings, ...msg.data };
      this.onState(this.snapshot());
    }
    this.messageHandlers.forEach(fn => fn(msg));
  }

  onMessage(fn) { this.messageHandlers.add(fn); return () => this.messageHandlers.delete(fn); }

  async setSettings(settings) {
    if (!this.isHost) return;
    this.settings = { ...this.settings, ...settings };
    await this.broadcast('SETTINGS', this.settings);
    this.onState(this.snapshot());
  }

  async leave() {
    if (this.channel) {
      try { await this.channel.untrack(); } catch {}
      try { await this.client.removeChannel(this.channel); } catch {}
    }
    this.channel = null; this.players.clear(); this.roomCode = null; this.isHost = false;
    this.onState(this.snapshot());
  }
}
