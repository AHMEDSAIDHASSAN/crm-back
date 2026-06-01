import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';

export type WAStatus = 'idle' | 'qr' | 'ready' | 'disconnected' | 'loading';

type SessionState = {
  client: Client;
  status: WAStatus;
  qrDataUrl: string | null;
  connectedNumber: string | null;
};

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-extensions',
];

@Injectable()
export class WhatsAppWebService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppWebService.name);

  /** userId → session state */
  private sessions = new Map<string, SessionState>();

  /** userId → status broadcast callback (set by gateway per user room) */
  private statusHandlers = new Map<string, (status: WAStatus, extra?: any) => void>();

  /** userId → connected socket ids (to know when to remove handler) */
  private socketsByUser = new Map<string, Set<string>>();

  onModuleInit() {
    this.initializeSession('system').catch((err) =>
      this.logger.warn('System WhatsApp auto-init failed: ' + err.message),
    );
  }

  // ─── Handler registry ─────────────────────────────────────────────────────

  registerSocket(userId: string, socketId: string, handler: (status: WAStatus, extra?: any) => void) {
    if (!this.socketsByUser.has(userId)) this.socketsByUser.set(userId, new Set());
    this.socketsByUser.get(userId)!.add(socketId);
    this.statusHandlers.set(userId, handler);
  }

  unregisterSocket(userId: string, socketId: string) {
    const sockets = this.socketsByUser.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.socketsByUser.delete(userId);
        this.statusHandlers.delete(userId);
      }
    }
  }

  private emitStatus(userId: string, status: WAStatus, extra?: any) {
    const session = this.sessions.get(userId);
    if (session) session.status = status;
    this.statusHandlers.get(userId)?.(status, extra);
  }

  // ─── Session lifecycle ─────────────────────────────────────────────────────

  async initializeSession(userId: string) {
    const existing = this.sessions.get(userId);
    if (existing) await this.destroySession(userId);

    this.emitStatus(userId, 'loading');

    // System session uses the original path (no clientId) to preserve existing auth
    const authStrategy = userId === 'system'
      ? new LocalAuth({ dataPath: './.wwebjs_auth' })
      : new LocalAuth({ clientId: `user_${userId}`, dataPath: './.wwebjs_auth' });

    const client = new Client({
      authStrategy,
      puppeteer: {
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: PUPPETEER_ARGS,
      },
    });

    const state: SessionState = { client, status: 'loading', qrDataUrl: null, connectedNumber: null };
    this.sessions.set(userId, state);

    client.on('qr', async (qr: string) => {
      try {
        state.qrDataUrl = await QRCode.toDataURL(qr);
        state.status = 'qr';
        this.emitStatus(userId, 'qr', { qr: state.qrDataUrl });
        this.logger.log(`[${userId}] QR ready`);
      } catch (err) {
        this.logger.error(`[${userId}] QR generation failed`, err);
      }
    });

    client.on('ready', () => {
      state.qrDataUrl = null;
      state.connectedNumber = (client as any).info?.wid?.user ?? null;
      state.status = 'ready';
      this.emitStatus(userId, 'ready', { number: state.connectedNumber });
      this.logger.log(`[${userId}] WhatsApp ready — ${state.connectedNumber}`);
    });

    client.on('disconnected', (reason: string) => {
      state.qrDataUrl = null;
      state.connectedNumber = null;
      state.status = 'disconnected';
      this.emitStatus(userId, 'disconnected', { reason });
      this.logger.warn(`[${userId}] Disconnected: ${reason}`);
    });

    client.on('auth_failure', (msg: string) => {
      state.qrDataUrl = null;
      state.connectedNumber = null;
      state.status = 'disconnected';
      this.emitStatus(userId, 'disconnected', { reason: msg });
      this.logger.error(`[${userId}] Auth failure: ${msg}`);
    });

    client.initialize().catch((err) => {
      this.logger.error(`[${userId}] Init error`, err);
      state.status = 'disconnected';
      this.emitStatus(userId, 'disconnected', { reason: 'initialization_failed' });
    });
  }

  async destroySession(userId: string) {
    const session = this.sessions.get(userId);
    if (session?.client) {
      try { await session.client.destroy(); } catch (_) {}
    }
    this.sessions.delete(userId);
    this.emitStatus(userId, 'idle');
  }

  async logoutSession(userId: string) {
    const session = this.sessions.get(userId);
    if (session?.client) {
      try { await session.client.logout(); } catch (_) {}
    }
    await this.destroySession(userId);
  }

  getState(userId: string) {
    const session = this.sessions.get(userId);
    if (!session) return { status: 'idle' as WAStatus, qr: null, number: null };
    return {
      status: session.status,
      qr: session.status === 'qr' ? session.qrDataUrl : null,
      number: session.connectedNumber,
    };
  }

  // ─── Sending ───────────────────────────────────────────────────────────────

  private normalizePhone(raw: string): string {
    let p = raw.replace(/\s+/g, '').replace(/-/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('01') && p.length === 11) p = '2' + p;
    return p.replace(/\D/g, '');
  }

  private async sendViaClient(client: Client, to: string, message: string): Promise<boolean> {
    const { ok } = await this.sendViaClientDetailed(client, to, message);
    return ok;
  }

  private async sendViaClientDetailed(client: Client, to: string, message: string): Promise<{ ok: boolean; error?: string }> {
    const chatId = to.includes('@c.us') ? to : `${this.normalizePhone(to)}@c.us`;
    this.logger.log(`Sending to ${chatId}`);
    try {
      await client.sendMessage(chatId, message);
      this.logger.log(`✓ Sent to ${chatId}`);
      return { ok: true };
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      this.logger.error(`✗ Send failed to ${chatId}: ${errMsg}`);
      return { ok: false, error: errMsg };
    }
  }

  async sendMessageWithError(userId: string, to: string, message: string): Promise<{ ok: boolean; error?: string }> {
    const session = this.sessions.get(userId);
    if (session?.status === 'ready') {
      return this.sendViaClientDetailed(session.client, to, message);
    }
    const system = this.sessions.get('system');
    if (system?.status === 'ready') {
      this.logger.log(`Fallback to system session for user ${userId}`);
      return this.sendViaClientDetailed(system.client, to, message);
    }
    return { ok: false, error: 'no_ready_session' };
  }

  /**
   * Send from a specific user's session.
   * Falls back to system session if the user's session is not ready.
   */
  async sendMessage(userId: string, to: string, message: string): Promise<boolean> {
    const session = this.sessions.get(userId);
    if (session?.status === 'ready') {
      return this.sendViaClient(session.client, to, message);
    }
    // Fall back to system session
    const system = this.sessions.get('system');
    if (system?.status === 'ready') {
      this.logger.log(`Falling back to system session for user ${userId}`);
      return this.sendViaClient(system.client, to, message);
    }
    this.logger.warn(`No ready session for user "${userId}" or system`);
    return false;
  }

  // ─── System notifications (always use system session) ─────────────────────

  async notifySalesRepTransferred(phone: string | null | undefined, firstName: string, count: number): Promise<void> {
    if (!phone?.trim()) { this.logger.warn(`notifySalesRepTransferred: no phone for "${firstName}"`); return; }
    const msg = count === 1
      ? `مرحباً ${firstName}،\nتم تحويل ليد منك إلى مندوب آخر في نظام SIRA.`
      : `مرحباً ${firstName}،\nتم تحويل ${count} ليدز منك إلى مندوب آخر في نظام SIRA.`;
    await this.sendMessage('system', phone.trim(), msg);
  }

  async notifySalesRepRetracted(phone: string | null | undefined, firstName: string, count: number): Promise<void> {
    if (!phone?.trim()) { this.logger.warn(`notifySalesRepRetracted: no phone for "${firstName}"`); return; }
    const msg = count === 1
      ? `مرحباً ${firstName}،\nتم سحب ليد منك في نظام SIRA.`
      : `مرحباً ${firstName}،\nتم سحب ${count} ليدز منك في نظام SIRA.`;
    await this.sendMessage('system', phone.trim(), msg);
  }
}
