/**
 * タグ名を正規化する（前後の空白・連続する空白・先頭の # を除く）。空になれば ""
 * @param {string} name タグ名
 * @returns {string} 正規化したタグ名
 */
export function normalizeTag(name) {
  return (name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[#＃]+/, "")
    .trim();
}

/**
 * ルートから自身までのタグ名を「›」でつないだパスを返す（例: 小説 › ミステリー）
 * @param {Map<number, object>} tagById - ID → タグ
 * @param {object} tag - 対象のタグ
 * @returns {string} タグのパス
 */
export function tagPath(tagById, tag) {
  const names = [];
  const visited = new Set();
  let cur = tag;
  while (cur && !visited.has(Number(cur.id))) {
    visited.add(Number(cur.id));
    names.unshift(cur.tag_name);
    cur = cur.parent_id != null ? tagById.get(Number(cur.parent_id)) : null;
  }
  return names.join(" › ");
}
