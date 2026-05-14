// Cloudflare Worker bindings — pouze pro Pages Functions, ne pro frontend.
// Frontend tenhle soubor nikdy neimportuje, takže nepotřebuje
// @cloudflare/workers-types ve svém tsconfigu.
export interface Env {
  DB: D1Database;
}
