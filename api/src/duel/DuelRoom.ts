import { DurableObject } from 'cloudflare:workers';
import type { Bindings } from '../env';

// M4-т бүрэн хэрэгжинэ.
export class DuelRoom extends DurableObject<Bindings> {
  async fetch(): Promise<Response> {
    return new Response('not implemented', { status: 501 });
  }
}
