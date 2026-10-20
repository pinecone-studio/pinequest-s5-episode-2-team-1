/** wrangler types-ийн Env + заавал биш нууц утгууд (.dev.vars эсвэл `wrangler secret put`). */
export type Bindings = Omit<Env, 'GEMINI_API_KEY' | 'ADMIN_TOKEN'> & {
  GEMINI_API_KEY?: string;
  ADMIN_TOKEN?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: number };
};
