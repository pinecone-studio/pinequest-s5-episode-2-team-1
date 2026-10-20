/** D1 алдааны мессежээс constraint төрлийг танина (batch бүхэлдээ rollback болсон байна). */
export function isConstraintError(e: unknown, kind: 'CHECK' | 'UNIQUE'): boolean {
  return String(e instanceof Error ? e.message : e).includes(`${kind} constraint failed`);
}

/** Төлөв шилжүүлэх statement-д бичих nonce; бусад statement `EXISTS(... tx = nonce)`-оор хамаарна. */
export function newTx(): string {
  return crypto.randomUUID();
}
