import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../libs/supabaseClient";
import { getBookCoverUrl, getStatusSelectData } from "../libs/bookUtil";

const BookDetailModal = ({ book, onClose, onUpdate }) => {
  if (!book) return null; // bookがnullの場合は何も表示しない

  const [purchaseDate, setPurchaseDate] = useState(book.purchase_date || ""); // 購入日
  const [readEndDate, setReadEndDate] = useState(book.read_end_date || ""); // 読了日
  const [readStartDate, setReadStartDate] = useState(book.read_start_date || ""); // 読み始め日
  const [tags, setTags] = useState([]); // タグ一覧
  const [selectedTags, setSelectedTags] = useState([]); // 選択されたタグ
  const [statuses, setStatuses] = useState([]); // ステータス一覧
  const [selectedStatus, setSelectedStatus] = useState(""); // 選択されたステータス
  const [rating, setRating] = useState(null); // 星評価（1〜5、nullは未評価）
  const [collapsedTagIds, setCollapsedTagIds] = useState(() => new Set());
  const collapseInitialized = useRef(false);
  const expandSelectedDone = useRef(false);

  useEffect(() => {
    getStatusSelectData(supabase).then((data) => setStatuses(data || []));
  }, []);

  useEffect(() => {
    // タグ一覧を取得
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("genre_id", { ascending: true })
        .order("tag_name", { ascending: true });
      if (error) {
        console.error("タグの取得に失敗しました:", error);
      } else {
        // genre_id、tag_nameで昇順にソート（念のため）
        const sortedTags = (data || []).sort((a, b) => {
          if (a.genre_id !== b.genre_id) {
            return a.genre_id - b.genre_id;
          }
          return a.tag_name.localeCompare(b.tag_name);
        });
        setTags(sortedTags);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    // 選択済みのタグを取得してチェックを入れる
    const fetchSelectedTags = async () => {
      if (!book.id) return;
      const { data, error } = await supabase
        .from("book_tags")
        .select("tag_id")
        .eq("book_id", book.id)
        .eq("user_id", book.user_id);

      if (error) {
        console.error("選択済みタグの取得に失敗しました:", error);
      } else {
        setSelectedTags(data.map((tag) => tag.tag_id));
      }
    };
    fetchSelectedTags();
  }, [book.id]);

  useEffect(() => {
    // user_booksから日付情報を取得（購入日・読始日・読了日）
    const fetchUserBookDates = async () => {
      if (!book.id || !book.user_id) return;
      const { data, error } = await supabase
        .from("user_books")
        .select("purchase_date, read_start_date, read_end_date, status_id, rating")
        .eq("book_id", book.id)
        .eq("user_id", book.user_id)
        .maybeSingle();

      if (error) {
        console.error("user_booksの取得に失敗しました:", error);
      } else if (data) {
        setPurchaseDate(data.purchase_date || "");
        setReadStartDate(data.read_start_date || "");
        setReadEndDate(data.read_end_date || "");
        setSelectedStatus(data.status_id != null ? String(data.status_id) : "");
        setRating(data.rating ?? null);
      }
    };
    fetchUserBookDates();
  }, [book.id, book.user_id]);

  const handleTagToggle = (tagId) => {
    setSelectedTags(
      (prev) =>
        prev.includes(tagId)
          ? prev.filter((id) => id !== tagId) // 解除
          : [...prev, tagId] // 選択
    );
  };

  const handleUpdate = async () => {
    if (!book.user_id || !book.id) {
      console.error("user_idまたはbook_idが未定義です。");
      alert("更新に必要な情報が不足しています。");
      return;
    }

    try {
      // book_tagsを更新
      const { error: deleteError } = await supabase
        .from("book_tags")
        .delete()
        .eq("book_id", book.id)
        .eq("user_id", book.user_id);

      if (deleteError) {
        console.error("既存のタグ削除に失敗しました:", deleteError);
        alert("タグの削除に失敗しました。");
        return;
      }

      const { error: insertError } = await supabase.from("book_tags").insert(
        selectedTags.map((tagId) => ({
          book_id: book.id,
          tag_id: tagId,
          user_id: book.user_id,
        }))
      );

      if (insertError) {
        console.error("タグの挿入に失敗しました:", insertError);
        alert("タグの追加に失敗しました。", insertError.message);
        return;
      }

      // user_booksの日時・ステータス・評価をまとめて更新
      const updateData = {
        status_id: selectedStatus !== "" ? Number(selectedStatus) : null,
        rating: rating,
      };
      if (purchaseDate) updateData.purchase_date = purchaseDate;
      if (readStartDate) updateData.read_start_date = readStartDate;
      if (readEndDate) updateData.read_end_date = readEndDate;

      const { error: updateError } = await supabase
        .from("user_books")
        .update(updateData)
        .eq("user_id", book.user_id)
        .eq("book_id", book.id);

      if (updateError) {
        console.error("user_booksの更新に失敗しました:", updateError);
        alert("日付情報の更新に失敗しました。");
        return;
      }

      alert("更新されました。");

      // 親コンポーネントに更新を通知
      if (onUpdate) {
        onUpdate();
      }

      onClose();
    } catch (err) {
      console.error("予期せぬエラー:", err);
      alert("予期せぬエラーが発生しました。");
    }
  };

  const formatBookTitle = (book) => {
    const title = book.title || "";
    const subtitle = book.sub_title || "";
    const edition = book.edition || "";
    const label_name = book.label_name;
    const classification_code = book.classification_code;

    return `${title}${edition ? ` ${edition}` : ""}${
      subtitle ? `  ―${subtitle}` : ""
    }${label_name ? ` (${label_name}${classification_code ? ` ${classification_code}` : ""})` : ""}`;
  };

  // console.log("BookDetailModalに渡されたbookオブジェクト:", book); // 追加: bookオブジェクトのデバッグログ

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        {/* 本文: 全体はスクロールしない（タグ部分だけスクロール） */}
        <div className="p-6 overflow-visible">
          <h2 className="text-xl font-bold mb-4 text-center md:text-left">
            {formatBookTitle(book)}
          </h2>

          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            <div className="shrink-0 flex justify-center md:justify-start">
              <img
                src={getBookCoverUrl(supabase, book.book_cover_image_name)}
                alt="表紙画像"
                className="w-40 md:w-48 h-auto mb-4 md:mb-0 rounded"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p>
                <strong>著者:</strong> {book.author_names || "-"}
              </p>
              {book.translator_names && (
                <div>翻訳者: {book.translator_names || "-"}</div>
              )}
              {book.illustrator_names && (
                <div>イラスト: {book.illustrator_names || "-"}</div>
              )}
              <p>
                <strong>出版社:</strong> {book.publisher_name || "-"}
              </p>
              <p>
                <strong>定価:</strong>{" "}
                {book.price ? `¥${book.price.toLocaleString()}` : "-"}
              </p>
              <p>
                <strong>ISBN-10:</strong> {book.isbn_10 || "-"}
              </p>
              <p className="whitespace-nowrap">
                <strong>ISBN-13:</strong> {book.isbn || "-"}
              </p>
              <p>
                <strong>判型:</strong> {book.format_name || "-"}
              </p>
              <p>
                <strong>頁数:</strong> {book.pages ? `${book.pages}ページ` : "-"}
              </p>
              <p>
                <strong>発売日:</strong> {book.release_date || "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* 購入日（左）・ステータス（右） */}
            <div className="flex items-center">
              <label
                htmlFor="purchase-date"
                className="block text-sm font-medium text-gray-700 mr-2"
              >
                <strong>購入日:</strong>
              </label>
              <input
                type="date"
                id="purchase-date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="block w-48 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
              />
            </div>
            <div className="flex items-center">
              <label
                htmlFor="status-select-modal"
                className="block text-sm font-medium text-gray-700 mr-2"
              >
                <strong>ステータス:</strong>
              </label>
              <select
                id="status-select-modal"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm min-w-32"
              >
                <option value="">未設定</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 読始日（左） */}
            <div className="flex items-center">
              <label
                htmlFor="read-start-date"
                className="block text-sm font-medium text-gray-700 mr-2"
              >
                <strong>読始日:</strong>
              </label>
              <input
                type="date"
                id="read-start-date"
                value={readStartDate}
                onChange={(e) => setReadStartDate(e.target.value)}
                className="block w-40 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
              />
            </div>

            {/* 読了日（右） */}
            <div className="flex items-center">
              <label
                htmlFor="read-end-date"
                className="block text-sm font-medium text-gray-700 mr-2"
              >
                <strong>読了日:</strong>
              </label>
              <input
                type="date"
                id="read-end-date"
                value={readEndDate}
                onChange={(e) => setReadEndDate(e.target.value)}
                className="block w-40 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
              />
            </div>
          </div>

          {/* 星評価 */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700"><strong>評価:</strong></span>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* タグ選択UI（ツリー＋チェックボックス） */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700">タグ:</p>
            <div
              className="mt-2 overflow-y-auto border border-gray-200 rounded"
              style={{ maxHeight: "32vh" }}
            >
              <TagTreeCheckList
                tags={tags}
                selectedTags={selectedTags}
                onToggleTag={handleTagToggle}
                collapsed={collapsedTagIds}
                setCollapsed={setCollapsedTagIds}
                collapseInitialized={collapseInitialized}
                expandSelectedDone={expandSelectedDone}
              />
            </div>
          </div>
        </div>

        {/* フッター（ボタン）: 常に下に表示される */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between">
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={handleUpdate}
          >
            更新
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="text-2xl leading-none focus:outline-none"
          aria-label={`${star}星`}
        >
          <span className={display >= star ? "opacity-100" : "opacity-25"}>⭐️</span>
        </button>
      ))}
    </div>
  );
}

function TagTreeCheckList({
  tags,
  selectedTags,
  onToggleTag,
  collapsed,
  setCollapsed,
  collapseInitialized,
  expandSelectedDone,
}) {
  const ROOT_KEY = "__ROOT__";
  const tagById = new Map(tags.map((t) => [Number(t.id), t]));
  const childrenByParent = tags.reduce((acc, t) => {
    const pid = t.parent_id == null ? ROOT_KEY : String(t.parent_id);
    (acc[pid] = acc[pid] || []).push(t);
    return acc;
  }, {});

  // 初回 tags 受領時に、子を持つタグを全て畳んだ状態で初期化
  useEffect(() => {
    if (collapseInitialized.current || tags.length === 0) return;
    const allParents = new Set();
    for (const t of tags) {
      if (t.parent_id != null) allParents.add(Number(t.parent_id));
    }
    setCollapsed(allParents);
    collapseInitialized.current = true;
  }, [tags, setCollapsed, collapseInitialized]);

  // 既にチェックの入っているタグの祖先を初回だけ展開
  useEffect(() => {
    if (
      expandSelectedDone.current ||
      !collapseInitialized.current ||
      tags.length === 0 ||
      selectedTags.length === 0
    ) {
      return;
    }
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const sid of selectedTags) {
        let cur = tagById.get(Number(sid));
        const seen = new Set();
        while (cur && cur.parent_id && !seen.has(Number(cur.parent_id))) {
          seen.add(Number(cur.parent_id));
          next.delete(Number(cur.parent_id));
          cur = tagById.get(Number(cur.parent_id));
        }
      }
      return next;
    });
    expandSelectedDone.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, selectedTags]);

  const sortRoot = (a, b) => {
    const ga = Number(a.genre_id) || 0;
    const gb = Number(b.genre_id) || 0;
    if (ga !== gb) return ga - gb;
    return a.tag_name.localeCompare(b.tag_name, "ja");
  };
  const sortChild = (a, b) => a.tag_name.localeCompare(b.tag_name, "ja");

  const rootTags = (childrenByParent[ROOT_KEY] || []).slice().sort(sortRoot);

  const toggleCollapse = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const key = Number(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderNode = (tag, depth, visited) => {
    const id = Number(tag.id);
    if (visited.has(id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(id);

    const children = (childrenByParent[String(id)] || []).slice().sort(sortChild);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(id);
    const paddingLeft = 8 + depth * 16;
    const checked = selectedTags.includes(tag.id);

    return (
      <div key={id}>
        <div
          className="flex items-center py-1 hover:bg-blue-50"
          style={{ paddingLeft }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapse(id)}
              className="text-gray-500 text-xs w-4 mr-1 flex-shrink-0"
              aria-label={isCollapsed ? "展開" : "畳む"}
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
          ) : (
            <span className="w-4 mr-1 flex-shrink-0" />
          )}
          <label className="flex items-center cursor-pointer text-sm flex-1 min-w-0">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleTag(tag.id)}
              className="mr-2 flex-shrink-0"
            />
            <span className="truncate">{tag.tag_name}</span>
          </label>
        </div>
        {hasChildren && !isCollapsed && (
          <div>{children.map((child) => renderNode(child, depth + 1, nextVisited))}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      {rootTags.map((tag, i) => (
        <div
          key={tag.id}
          className={i === 0 ? "" : "border-t border-gray-200"}
        >
          {renderNode(tag, 0, new Set())}
        </div>
      ))}
    </div>
  );
}

export default BookDetailModal;
