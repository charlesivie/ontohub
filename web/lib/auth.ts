import { cookies } from "next/headers";

export interface Session {
  userId: string;
  githubLogin: string;
  avatarUrl?: string;
}

// Reads the session cookie set by the Express auth backend.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("ontohub_session")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(
      Buffer.from(raw, "base64").toString("utf8")
    ) as Session;
  } catch {
    return null;
  }
}
