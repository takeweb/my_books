function TagSelect({ tags, selectedTag, setSelectedTag, setCurrentPage }) {
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

  return (
    <div className="w-full max-w-sm mx-auto mb-4 flex flex-row items-center justify-center gap-2">
      <label
        htmlFor="tag-select"
        className="text-gray-700 font-semibold whitespace-nowrap"
      >
        タグ：
      </label>
      <select
        id="tag-select"
        className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm min-w-32"
        value={selectedTag}
        onChange={(e) => {
          setSelectedTag(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="">すべて</option>
        {rootTags.map((tag) => {
          const children = (childrenByParent[tag.id] || []).sort((a, b) =>
            a.tag_name.localeCompare(b.tag_name, "ja")
          );

          if (children.length > 0) {
            return (
              <optgroup key={tag.id} label={tag.tag_name}>
                <option value={tag.id}>（全て）</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.tag_name}
                  </option>
                ))}
              </optgroup>
            );
          }

          return (
            <option key={tag.id} value={tag.id}>
              {tag.tag_name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default TagSelect;
