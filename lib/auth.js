import bcrypt from "bcrypt";
import crypto from "crypto";
import { query } from "./db.js";

const SALT_ROUNDS = 12;
const SESSION_DAYS = 30;

function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
  }
  return cookies;
}

function setCookieHeader(sessionId) {
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toUTCString();
  return `reserc_sid=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires}`;
}

function clearCookieHeader() {
  return `reserc_sid=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export async function signup(name, email, password) {
  if (!name?.trim() || !email?.trim() || !password)
    return { ok: false, error: "All fields are required." };
  if (password.length < 8)
    return { ok: false, error: "Password must be at least 8 characters." };

  const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length > 0)
    return { ok: false, error: "An account with that email already exists." };

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
    [name.trim(), email.toLowerCase(), hash]
  );
  const user = result.rows[0];
  const sessionId = generateSessionId();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, user.id, expires]
  );
  return { ok: true, user: { id: user.id, name: user.name, email: user.email }, sessionId };
}

export async function signin(email, password) {
  if (!email?.trim() || !password)
    return { ok: false, error: "Please enter your email and password." };

  const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (result.rows.length === 0)
    return { ok: false, error: "No account found for that email address." };

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return { ok: false, error: "Incorrect password." };

  const sessionId = generateSessionId();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [sessionId, user.id, expires]
  );
  return { ok: true, user: { id: user.id, name: user.name, email: user.email }, sessionId };
}

export async function getSession(cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies["reserc_sid"];
  if (!sessionId) return null;

  const result = await query(
    `SELECT s.id, s.expires_at, u.id AS user_id, u.name, u.email
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

export async function signout(cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies["reserc_sid"];
  if (sessionId) {
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  }
}

export { setCookieHeader, clearCookieHeader };
