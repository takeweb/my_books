import { useState, useEffect } from "react";
import { normalizeTag, tagPath } from "../libs/tagUtil";

const MAX_SUGGESTIONS = 20;

/**
 * タグの入力欄。既存タグを候補から選ぶか、新しいタグ名を入力して Enter / カンマ / 読点で追加する
 * value は { id, tag_name } の配列（新しいタグは id が null）
 */
function TagInput({ tags, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // 候補リストで選択中の位置（-1 は未選択）
  const [active, setActive] = useState(-1);

  const tagById = new Map(tags.map((t) => [Number(t.id), t]));
  const selectedIds = new Set(value.filter((v) => v.id != null).map((v) => Number(v.id)));
  const selectedNewNames = new Set(value.filter((v) => v.id == null).map((v) => v.tag_name));

  const typed = normalizeTag(query);
  // 親タグの名前でも子タグが引けるよう、パス全体で絞り込む
  const suggestions = (() => {
    const q = typed.toLowerCase();
    return tags
      .filter((t) => !selectedIds.has(Number(t.id)))
      .map((t) => ({ tag: t, path: tagPath(tagById, t) }))
      .filter(({ path }) => !q || path.toLowerCase().includes(q))
      .sort((a, b) => a.path.localeCompare(b.path, "ja"))
      .slice(0, MAX_SUGGESTIONS);
  })();
  const isNewTag =
    typed !== "" &&
    !tags.some((t) => t.tag_name === typed) &&
    !selectedNewNames.has(typed);

  useEffect(() => {
    setActive(-1);
  }, [query]);

  const addTag = (tag) => {
    if (!selectedIds.has(Number(tag.id))) {
      onChange([...value, { id: tag.id, tag_name: tag.tag_name }]);
    }
    setQuery("");
    setActive(-1);
  };

  // 入力した名前を追加する。同名の既存タグがあればそれを、なければ新しいタグとして追加する
  const addName = (name) => {
    const tagName = normalizeTag(name);
    setQuery("");
    setActive(-1);
    if (!tagName) return;
    const existing =
      tags.find((t) => t.tag_name === tagName && !selectedIds.has(Number(t.id))) ??
      tags.find((t) => t.tag_name === tagName);
    if (existing) {
      if (!selectedIds.has(Number(existing.id))) {
        onChange([...value, { id: existing.id, tag_name: existing.tag_name }]);
      }
    } else if (!selectedNewNames.has(tagName)) {
      onChange([...value, { id: null, tag_name: tagName }]);
    }
  };

  const remove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const commit = () => {
    const picked = suggestions[active];
    if (picked) addTag(picked.tag);
    else addName(query);
  };

  const move = (step) => {
    setOpen(true);
    const size = suggestions.length;
    if (size > 0) setActive((prev) => (prev + step + size) % size);
  };

  // 入力したまま Enter を押さずに更新ボタンなどを押しても、入力中のタグが失われないようにする
  const handleBlur = () => {
    setOpen(false);
    if (typed) addName(typed);
  };

  const handleKeyDown = (e) => {
    // 日本語入力の変換確定の Enter でタグが追加されないよう、変換中は何もしない
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    switch (e.key) {
      case "Enter":
      case ",":
      case "、":
        e.preventDefault();
        commit();
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Backspace":
        if (query === "" && value.length > 0) onChange(value.slice(0, -1));
        break;
      default:
        break;
    }
  };

  const chipLabel = (item) => {
    if (item.id == null) return item.tag_name;
    const tag = tagById.get(Number(item.id));
    return tag ? tagPath(tagById, tag) : item.tag_name;
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-gray-300 bg-white px-2 py-1.5 focus-within:border-blue-500">
        {value.map((item, i) => (
          <span
            key={item.id ?? `new:${item.tag_name}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${
              item.id == null ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
            }`}
          >
            #{chipLabel(item)}
            <button
              type="button"
              className={item.id == null ? "text-green-400 hover:text-green-800" : "text-blue-400 hover:text-blue-800"}
              aria-label={`${item.tag_name} を外す`}
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="min-w-32 flex-1 px-1 py-0.5 text-sm outline-none"
          placeholder={value.length ? "" : "タグを入力（Enter で追加）"}
          aria-label="タグ"
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* onMouseDown の preventDefault で入力欄のフォーカスを保ったまま選べるようにする */}
      {open && (suggestions.length > 0 || isNewTag) && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {suggestions.map(({ tag, path }, i) => (
            <li key={tag.id}>
              <button
                type="button"
                className={`block w-full px-3 py-1.5 text-left hover:bg-gray-100 ${
                  i === active ? "bg-gray-100" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
              >
                #{path}
              </button>
            </li>
          ))}
          {isNewTag && (
            <li>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-blue-700 hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addName(typed);
                }}
              >
                ＋ 新しいタグ「{typed}」を追加
              </button>
            </li>
          )}
        </ul>
      )}
      <p className="mt-1 text-xs text-gray-500">新しいタグは「更新」を押したときに作成されます。</p>
    </div>
  );
}

export default TagInput;
