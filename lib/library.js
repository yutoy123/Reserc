import { query } from "./db.js";

export async function saveItem(userId, type, title, topic, region, payload, countryA, countryB) {
  const result = await query(
    `INSERT INTO research_items (user_id, type, title, topic, region, country_a, country_b, payload, saved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE) RETURNING id`,
    [userId, type, title, topic || null, region || null, countryA || null, countryB || null, JSON.stringify(payload)]
  );
  return result.rows[0].id;
}

export async function recordHistory(userId, type, title, topic, region, payload, countryA, countryB) {
  const result = await query(
    `INSERT INTO research_items (user_id, type, title, topic, region, country_a, country_b, payload, saved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE) RETURNING id`,
    [userId, type, title, topic || null, region || null, countryA || null, countryB || null, JSON.stringify(payload)]
  );
  return result.rows[0].id;
}

export async function toggleSaved(userId, itemId) {
  const result = await query(
    `UPDATE research_items SET saved = NOT saved
     WHERE id=$1 AND user_id=$2 RETURNING id, saved`,
    [itemId, userId]
  );
  return result.rows[0] || null;
}

export async function deleteItem(userId, itemId) {
  await query("DELETE FROM research_items WHERE id=$1 AND user_id=$2", [itemId, userId]);
}

export async function getLibrary(userId) {
  const result = await query(
    `SELECT id, type, title, topic, region, country_a, country_b, saved, created_at
     FROM research_items WHERE user_id=$1 AND saved=TRUE
     ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return result.rows;
}

export async function getHistory(userId) {
  const result = await query(
    `SELECT id, type, title, topic, region, country_a, country_b, saved, created_at
     FROM research_items WHERE user_id=$1
     ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function getItem(userId, itemId) {
  const result = await query(
    `SELECT * FROM research_items WHERE id=$1 AND user_id=$2`,
    [itemId, userId]
  );
  return result.rows[0] || null;
}
