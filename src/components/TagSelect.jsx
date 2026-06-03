import { useState, useEffect, useRef } from "react";

function TagSelect({ tags, selectedTag, setSelectedTag, setCurrentPage }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const initialized = useRef(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  const scrollPos = useRef(0);

  const tagById = new Map(tags.map((t) => [Number(t.id), t]));

  // ルートタグ用のセンチネルキーは、実際のタグID(0など)と衝突しないよう文字列を使う
  const ROOT_KEY = "__ROOT__";
  const childrenByParent = tags.reduce((acc, t) => {
    const pid = t.parent_id == null ? ROOT_KEY : String(t.parent_id);
    (acc[pid] = acc[pid] || []).push(t);
    return acc;
  }, {});

  const sortRoot = (a, b) => {
    const ga = Number(a.genre_id) || 0;
    const gb = Number(b.genre_id) || 0;
    if (ga !== gb) return ga - gb;
    return a.tag_name.localeCompare(b.tag_name, "ja");
  };
  const sortChild = (a, b) => a.tag_name.localeCompare(b.tag_name, "ja");

  const rootTags = (childrenByParent[ROOT_KEY] || []).slice().sort(sortRoot);

  // 初回 tags を受け取ったら、子を持つタグを全て畳んだ状態で初期化
  useEffect(() => {
    if (initialized.current || tags.length === 0) return;
    const allParents = new Set();
    for (const t of tags) {
      const key = t.parent_id == null ? ROOT_KEY : String(t.parent_id);
      // この t.parent_id が指す親に子が存在する＝親IDを畳み対象に
      if (key !== ROOT_KEY) allParents.add(Number(t.parent_id));
    }
    setCollapsed(allParents);
    initialized.current = true;
  }, [tags]);

  const selectedLabel = (() => {
    if (!selectedTag) return "全て";
    const tag = tagById.get(Number(selectedTag));
    if (!tag) return "全て";
    const path = [];
    const visited = new Set();
    let cur = tag;
    while (cur && !visited.has(Number(cur.id))) {
      visited.add(Number(cur.id));
      path.unshift(cur.tag_name);
      cur = cur.parent_id ? tagById.get(Number(cur.parent_id)) : null;
    }
    const hasChildren = (childrenByParent[String(tag.id)] || []).length > 0;
    const label = path.join(" › ");
    return hasChildren ? `${label}(全て)` : label;
  })();

  const select = (value) => {
    if (listRef.current) scrollPos.current = listRef.current.scrollTop;
    setSelectedTag(value);
    setCurrentPage(1);
    setOpen(false);
  };

  const toggleCollapse = (id) => {
    if (listRef.current) scrollPos.current = listRef.current.scrollTop;
    setCollapsed((prev) => {
      const next = new Set(prev);
      const key = Number(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 開いた時、選択中タグの祖先チェーンを展開しておく（畳まれていても見えるように）
  useEffect(() => {
    if (!open || !selectedTag) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      let cur = tagById.get(Number(selectedTag));
      const seen = new Set();
      while (cur && cur.parent_id && !seen.has(Number(cur.parent_id))) {
        seen.add(Number(cur.parent_id));
        next.delete(Number(cur.parent_id));
        cur = tagById.get(Number(cur.parent_id));
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // 前回のスクロール位置を復元
    if (listRef.current) listRef.current.scrollTop = scrollPos.current;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        if (listRef.current) scrollPos.current = listRef.current.scrollTop;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, collapsed]);

  const renderNode = (tag, depth, visited) => {
    const id = Number(tag.id);
    if (visited.has(id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(id);

    const children = (childrenByParent[String(id)] || []).slice().sort(sortChild);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(id);

    if (hasChildren) {
      const indicator = isCollapsed ? "▶" : "▼";
      return (
        <>
          {depth === 0 ? (
            <button
              type="button"
              onClick={() => toggleCollapse(id)}
              className="w-full text-left px-3 pt-2 pb-0.5 text-xs font-bold text-gray-600 uppercase tracking-wide bg-gray-50 hover:bg-gray-100 flex items-center gap-1"
            >
              <span className="text-gray-500 text-[10px] w-3 inline-block">
                {indicator}
              </span>
              <span>{tag.tag_name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toggleCollapse(id)}
              className="w-full text-left py-1.5 pr-3 text-xs font-bold text-gray-500 uppercase tracking-wide hover:bg-gray-50 flex items-center gap-1"
              style={{ paddingLeft: 12 + depth * 16 }}
            >
              <span className="text-gray-500 text-[10px] w-3 inline-block">
                {indicator}
              </span>
              <span>{tag.tag_name}</span>
            </button>
          )}
          {!isCollapsed && (
            <>
              <MenuItem
                label="(全て)"
                selected={String(selectedTag) === String(id)}
                onClick={() => select(String(id))}
                depth={depth + 1}
              />
              {children.map((child) => renderNode(child, depth + 1, nextVisited))}
            </>
          )}
        </>
      );
    }

    return (
      <MenuItem
        label={tag.tag_name}
        selected={String(selectedTag) === String(id)}
        onClick={() => select(String(id))}
        depth={depth}
      />
    );
  };

  return (
    <div className="flex flex-row items-center gap-2 mb-4" ref={ref}>
      <span className="text-gray-700 font-semibold whitespace-nowrap">タグ：</span>
      <div className="relative">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-800 shadow-sm w-72 text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate">{selectedLabel}</span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div ref={listRef} className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg w-72 max-h-80 overflow-y-auto">
            <MenuItem
              label="全て"
              selected={!selectedTag}
              onClick={() => select("")}
              depth={0}
            />
            {rootTags.map((tag, i) => (
              <div
                key={tag.id}
                className={i === 0 ? "" : "border-t border-gray-200 mt-1 pt-1"}
              >
                {renderNode(tag, 0, new Set())}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ label, selected, onClick, depth = 0 }) {
  const paddingLeft = 12 + depth * 16;
  return (
    <button
      type="button"
      data-selected={selected ? "true" : undefined}
      className={`w-full text-left py-1.5 pr-3 text-sm hover:bg-blue-50 transition-colors
        ${selected ? "bg-blue-100 text-blue-800 font-semibold" : "text-gray-800"}`}
      style={{ paddingLeft }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default TagSelect;
