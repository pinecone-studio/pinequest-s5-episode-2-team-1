import type { PaymentLink } from '../../../shared/types';
import type { Bindings } from '../env';

/**
 * Төлбөрийн систем (QPay гэх мэт). Шинэ систем холбохдоо энэ interface-ийг хэрэгжүүлээд paymentProvider()-д нэмнэ.
 * Төлбөр орсон эсэхийг зөвхөн isPaid()-ээр (системээс өөрөөс нь) шалгана: callback-ийн биеийг итгэхгүй.
 */
export interface PaymentProvider {
  /** payments.provider баганад хадгалагдана. */
  readonly name: string;
  createInvoice(req: InvoiceRequest): Promise<Invoice>;
  isPaid(invoiceId: string): Promise<boolean>;
}

export interface InvoiceRequest {
  /** payments.id: системийн талд давтагдахгүй дугаар болгоно. */
  paymentId: number;
  amount: number;
  description: string;
  /** Төлбөр орход систем дуудах хаяг (/payments/callback/:id). */
  callbackUrl: string;
}

export interface Invoice {
  invoiceId: string;
  qrImage?: string;
  qrText?: string;
  links?: PaymentLink[];
}

/** Туршилтын систем: нэхэмжлэл бүр шууд төлөгдсөн. Зөвхөн localhost дээр ажиллана. */
export const mockProvider: PaymentProvider = {
  name: 'mock',
  createInvoice: async ({ paymentId }) => ({ invoiceId: `mock-${paymentId}`, qrText: `mock-${paymentId}` }),
  isPaid: async () => true,
};

const isLocal = (url: string) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

/**
 * PAYMENT_PROVIDER (.dev.vars эсвэл `wrangler secret put`) аль системийг ашиглахыг заана. Хоосон бол худалдан авалт хаалттай.
 * Жинхэнэ систем холбохдоо энд case нэмнэ, жишээ нь: case 'qpay': return qpayProvider(env).
 */
export function paymentProvider(env: Bindings, requestUrl: string): PaymentProvider | null {
  switch (env.PAYMENT_PROVIDER) {
    case 'mock':
      return isLocal(requestUrl) ? mockProvider : null;
    default:
      return null;
  }
}
