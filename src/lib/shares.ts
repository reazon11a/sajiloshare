export type ShareKind = "text" | "file";

export type ShareRow = {
  id: string;
  short_code: number;
  token: string;
  kind: ShareKind;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  content_type: string | null;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

export function isExpired(expiresAtIso: string) {
  return new Date(expiresAtIso).getTime() <= Date.now();
}

export function computeExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
