// types/web-push.d.ts
declare module 'web-push' {
  export interface WebPushOptions {
    headers?: Record<string, string>;
    gcmAPIKey?: string;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
    TTL?: number;
    contentEncoding?: 'aesgcm' | 'aes128gcm';
    proxy?: string;
    timeout?: number;
  }

  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription | Record<string, any>,
    payload?: string | Buffer | Uint8Array,
    options?: WebPushOptions
  ): Promise<SendResult>;

  export function getVapidHeaders(
    audience: string,
    subject: string,
    publicKey: string,
    privateKey: string,
    expiration?: number
  ): Record<string, string>;

  export function encrypt(
    userPublicKey: string,
    userAuth: string,
    payload: string | Buffer | Uint8Array,
    contentEncoding?: 'aesgcm' | 'aes128gcm'
  ): {
    localPublicKey: string;
    salt: string;
    ciphertext: string;
  };

  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
}