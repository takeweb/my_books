import { useState, useEffect, useRef } from "react";

function TagSelect({ tags, selectedTag, setSelectedTag, setCurrentPage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  const scrollPos = useRef(0);

  const rootTags = tags
    .filter((t) => !t.parent_id)
    .sort((a, b) => {
      const genreA = Number(a.genre_id) || 0;
      const genreB = Number(b.genre_id) || 0;
      if (genreA !== genreB) return genreA - genreB;
      return a.tag_name.localeCompare(b.tag_name, "ja");
    });

  const childrenByParent = tags.reduce((acc, t) => {
    if (t.parent_id) {
      (acc[t.parent_id] = acc[t.parent_id] || []).push(t);
    }
    return acc;
  }, {});

  const selectedLabel = (() => {
    if (!selectedTag) return "すべて";
    const tag = tags.find((t) => String(t.id) === String(selectedTag));
    if (!tag) return "すべて";
    if (tag.parent_id) {
      const parent = tags.find((t) => t.id === tag.parent_id);
      return parent ? `${parent.tag_name} › ${tag.tag_name}` : tag.tag_name;
    }
    const hasChildren = tags.some((t) => Number(t.parent_id) === Number(tag.id));
    return hasChildren ? `${tag.tag_name}（全て）` : tag.tag_name;
  })();

  const select = (value) => {
    setSelectedTag(value);
    setCurrentPage(1);
    if (listRef.current) scrollPos.current = listRef.current.scrollTop;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    // スクロール位置を復元
    if (listRef.current) listRef.current.scrollTop = scrollPos.current;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        if (listRef.current) scrollPos.current = listRef.current.scrollTop;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
              label="すべて"
              value=""
              selected={!selectedTag}
              onClick={() => select("")}
            />
            {rootTags.map((tag) => {
              const children = (childrenByParent[tag.id] || []).sort((a, b) =>
                a.tag_name.localeCompare(b.tag_name, "ja")
              );

              if (children.length > 0) {
                return (
                  <div key={tag.id}>
                    <div className="px-3 pt-2 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wide border-t border-gray-100 first:border-t-0">
                      {tag.tag_name}
                    </div>
                    <MenuItem
                      label="（全て）"
                      value={String(tag.id)}
                      selected={String(selectedTag) === String(tag.id)}
                      onClick={() => select(String(tag.id))}
                      indent
                    />
                    {children.map((child) => (
                      <MenuItem
                        key={child.id}
                        label={child.tag_name}
                        value={String(child.id)}
                        selected={String(selectedTag) === String(child.id)}
                        onClick={() => select(String(child.id))}
                        indent
                      />
                    ))}
                  </div>
                );
              }

              return (
                <MenuItem
                  key={tag.id}
                  label={tag.tag_name}
                  value={String(tag.id)}
                  selected={String(selectedTag) === String(tag.id)}
                  onClick={() => select(String(tag.id))}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ label, value, selected, onClick, indent = false }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors
        ${indent ? "pl-6" : ""}
        ${selected ? "bg-blue-100 text-blue-800 font-semibold" : "text-gray-800"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default TagSelect;
