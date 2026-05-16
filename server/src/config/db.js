import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';

// On some Windows setups, Node sees DNS server as 127.0.0.1 (nothing listening),
// so c-ares-backed queries like resolveSrv() fail with ECONNREFUSED — which breaks
// mongodb+srv:// connection strings. If we detect that, fall back to public DNS.
function ensureDnsServers() {
  try {
    const servers = dns.getServers();
    const allLoopback = servers.length === 0 || servers.every((s) => s.startsWith('127.') || s === '::1');
    if (allLoopback) {
      dns.setServers(['1.1.1.1', '8.8.8.8']);
      console.log('[db] DNS servers set to public resolvers (was loopback only)');
    }
  } catch (e) {
    console.warn('[db] could not adjust DNS servers:', e.message);
  }
}

export async function connectDB() {
  ensureDnsServers();
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => console.error('[db] error', err));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
}
