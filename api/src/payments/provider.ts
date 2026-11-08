import type { PaymentLink } from '../../../shared/types';
import type { Bindings } from '../env';
import { wireProvider } from './wire';

/**
 * Төлбөрийн систем (QPay гэх мэт). Шинэ систем холбохдоо энэ interface-ийг хэрэгжүүлээд paymentProvider()-д нэмнэ.
 * Төлбөр орсон эсэхийг зөвхөн isPaid()-ээр (системээс өөрөөс нь) шалгана: callback-ийн биеийг итгэхгүй.
 */
export interface PaymentProvider {
  /** payments.provider баганад хадгалагдана. */
  readonly name: string;
  createInvoice(req: InvoiceRequest): Promise<Invoice>;
  isPaid(invoiceId: string): Promise<boolean>;
  /**
   * Системийн webhook (нэг тогтмол хаяг: POST /payments/webhook/:name). Гарын үсгийг шалгаад аль нэхэмжлэлийн тухай болохыг
   * буцаана (invoiceId; хамааралгүй үйл явдал бол null). Гарын үсэг буруу бол null.
   */
  webhook?(rawBody: string, headers: Headers): Promise<{ invoiceId: string | null } | null>;
}

export interface InvoiceRequest {
  /** payments.id: системийн талд давтагдахгүй дугаар болгоно. */
  paymentId: number;
  amount: number;
  description: string;
  /** Төлбөр орход систем дуудах хаяг (/payments/callback/:id). */
  callbackUrl: string;
  /** Hosted төлбөрийн хуудаснаас буцах хаягууд: төлсөн бол /pay?payment=:id, болиулсан бол /plans. */
  successUrl: string;
  cancelUrl: string;
}

export interface Invoice {
  invoiceId: string;
  qrImage?: string;
  qrText?: string;
  links?: PaymentLink[];
  /** Hosted төлбөрийн хуудас (Wire гэх мэт): апп хэрэглэгчийг энд шилжүүлнэ. */
  checkoutUrl?: string;
}

/**
 * Туршилтын систем: нэхэмжлэл бүр шууд төлөгдсөн. Wire шиг төлбөрийн хуудас руу шилжүүлдэг (хуудасны оронд шууд буцах
 * хаяг руу), тиймээс шилжих, буцаж ирэх урсгалыг local дээр шалгана. Зөвхөн localhost дээр ажиллана.
 */
export const mockProvider: PaymentProvider = {
  name: 'mock',
  createInvoice: async ({ paymentId, successUrl }) => ({ invoiceId: `mock-${paymentId}`, checkoutUrl: successUrl }),
  isPaid: async () => true,
};

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * PAYMENT_PROVIDER (.dev.vars эсвэл `wrangler secret put`) аль системийг ашиглахыг заана. Хоосон бол худалдан авалт хаалттай.
 * 'wire': Wire (https://docs.wire.mn), WIRE_SECRET_KEY ба WIRE_WEBHOOK_SECRET шаардана. Шинэ систем холбохдоо энд case нэмнэ.
 */
export function paymentProvider(env: Bindings, requestUrl: string): PaymentProvider | null {
  switch (env.PAYMENT_PROVIDER) {
    case 'mock':
      return isLocal(requestUrl) ? mockProvider : null;
    case 'wire':
      // Хоёр түлхүүр хоёулаа тохируулагдсан үед л нээгдэнэ: webhook-гүйгээр төлбөр хүлээхгүй.
      return env.WIRE_SECRET_KEY && env.WIRE_WEBHOOK_SECRET ? wireProvider(env.WIRE_SECRET_KEY, env.WIRE_WEBHOOK_SECRET) : null;
    default:
      return null;
  }
}
