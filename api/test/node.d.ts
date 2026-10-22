// grade.test.ts нь migration-уудыг Node-ийн SQLite (D1-тэй ижил) дээр ажиллуулдаг. api-ийн tsconfig зөвхөн Worker-ийн
// төрөлтэй (@types/node-ийг оруулбал Worker-ийнхтэй зөрчилдөнө) тул хэрэглэсэн хэсгийг л зарлана.
declare module 'node:fs' {
  export function readdirSync(path: URL): string[];
  export function readFileSync(path: URL, encoding: 'utf8'): string;
}

declare module 'node:sqlite' {
  type Value = string | number | null;
  interface Statement {
    run(...params: Value[]): unknown;
    all(...params: Value[]): unknown[];
    get(...params: Value[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): Statement;
  }
}

interface ImportMeta {
  url: string;
}
