import type { GoogleSession, StorageAdapter } from '../types.ts';
import { GoogleAuthRequiredError, GoogleNotConfiguredError, GoogleSignInCancelledError } from './google-errors.ts';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientError {
  type?: string;
  message?: string;
}

interface GoogleTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: GoogleTokenClientError) => void;
}

interface GoogleOAuth2Namespace {
  initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
  revoke(accessToken: string, done?: () => void): void;
}

export interface GoogleIdentityGlobal {
  google?: {
    accounts?: {
      oauth2?: GoogleOAuth2Namespace;
    };
  };
}

interface GoogleAuthClientOptions {
  clientId: string;
  scopes: string[];
  identityScriptUrl: string;
  userInfoUrl: string;
  storage: StorageAdapter;
  storageKey: string;
  documentRoot: Document;
  globalScope: GoogleIdentityGlobal;
  fetcher: typeof fetch;
  now?: () => number;
}

const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/**
 * Browser-only Google sign-in using the Google Identity Services token model.
 * It never sees a refresh token: access tokens live for about an hour and are kept in
 * session storage, so a reload within that hour does not ask the user to sign in again.
 */
export class GoogleAuthClient {
  private readonly clientId: string;
  private readonly scopes: string[];
  private readonly identityScriptUrl: string;
  private readonly userInfoUrl: string;
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;
  private readonly document: Document;
  private readonly globalScope: GoogleIdentityGlobal;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private libraryLoading?: Promise<GoogleOAuth2Namespace>;

  constructor({
    clientId,
    scopes,
    identityScriptUrl,
    userInfoUrl,
    storage,
    storageKey,
    documentRoot,
    globalScope,
    fetcher,
    now = () => Date.now(),
  }: GoogleAuthClientOptions) {
    this.clientId = clientId;
    this.scopes = scopes;
    this.identityScriptUrl = identityScriptUrl;
    this.userInfoUrl = userInfoUrl;
    this.storage = storage;
    this.storageKey = storageKey;
    this.document = documentRoot;
    this.globalScope = globalScope;
    this.fetcher = fetcher;
    this.now = now;
  }

  get isConfigured(): boolean {
    return this.clientId.trim().length > 0;
  }

  /** The current session, or null when there is none or its token is about to expire. */
  get session(): GoogleSession | null {
    const session = this.readSession();
    if (!session) return null;
    if (session.expiresAt - EXPIRY_SAFETY_MARGIN_MS <= this.now()) return null;

    return session;
  }

  async signIn(): Promise<GoogleSession> {
    if (!this.isConfigured) throw new GoogleNotConfiguredError();

    const oauth2 = await this.loadLibrary();
    const response = await this.requestAccessToken(oauth2);
    const lifetimeSeconds = Number(response.expires_in) || DEFAULT_TOKEN_LIFETIME_SECONDS;
    const session: GoogleSession = {
      accessToken: response.access_token,
      expiresAt: this.now() + lifetimeSeconds * 1000,
    };

    const email = await this.fetchEmail(session.accessToken);
    if (email) session.email = email;

    this.saveSession(session);
    return session;
  }

  async getAccessToken(): Promise<string> {
    const session = this.session;
    if (!session) throw new GoogleAuthRequiredError();

    return session.accessToken;
  }

  invalidateSession(): void {
    this.storage.write(this.storageKey, '');
  }

  signOut(): void {
    const session = this.readSession();
    this.invalidateSession();

    const oauth2 = this.globalScope.google?.accounts?.oauth2;
    if (session && oauth2) {
      try {
        oauth2.revoke(session.accessToken);
      } catch {
        // Revocation is best effort; the local session is already gone.
      }
    }
  }

  private loadLibrary(): Promise<GoogleOAuth2Namespace> {
    const loaded = this.globalScope.google?.accounts?.oauth2;
    if (loaded) return Promise.resolve(loaded);

    this.libraryLoading ??= new Promise<GoogleOAuth2Namespace>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = this.identityScriptUrl;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => {
        const oauth2 = this.globalScope.google?.accounts?.oauth2;
        if (oauth2) {
          resolve(oauth2);
        } else {
          reject(new Error('Google Identity Services loaded but did not initialize.'));
        }
      });
      script.addEventListener('error', () => reject(new Error(`Could not load ${this.identityScriptUrl}.`)));
      this.document.head.append(script);
    }).catch((error: unknown) => {
      this.libraryLoading = undefined;
      throw error;
    });

    return this.libraryLoading;
  }

  private requestAccessToken(oauth2: GoogleOAuth2Namespace): Promise<GoogleTokenResponse & { access_token: string }> {
    return new Promise((resolve, reject) => {
      const client = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: this.scopes.join(' '),
        callback: (response) => {
          if (response.error === 'access_denied') {
            reject(new GoogleSignInCancelledError());
            return;
          }

          if (response.error || !response.access_token) {
            reject(new Error(response.error_description ?? response.error ?? 'Google did not return an access token.'));
            return;
          }

          resolve({ ...response, access_token: response.access_token });
        },
        error_callback: (error) => {
          if (error.type === 'popup_closed') {
            reject(new GoogleSignInCancelledError());
            return;
          }

          reject(new Error(error.message ?? `Google sign-in failed (${error.type ?? 'unknown error'}).`));
        },
      });

      client.requestAccessToken();
    });
  }

  private async fetchEmail(accessToken: string): Promise<string | undefined> {
    try {
      const response = await this.fetcher(this.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return undefined;

      const payload = (await response.json()) as { email?: unknown };
      return typeof payload.email === 'string' ? payload.email : undefined;
    } catch {
      return undefined;
    }
  }

  private readSession(): GoogleSession | null {
    const value = this.storage.read(this.storageKey);
    if (!value) return null;

    try {
      const parsed = JSON.parse(value) as Partial<GoogleSession>;
      if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number') return null;

      const session: GoogleSession = { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
      if (typeof parsed.email === 'string') session.email = parsed.email;
      return session;
    } catch {
      return null;
    }
  }

  private saveSession(session: GoogleSession): void {
    this.storage.write(this.storageKey, JSON.stringify(session));
  }
}
