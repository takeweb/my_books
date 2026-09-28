import React, { useState, useEffect } from "react";
import { supabase } from "../libs/supabaseClient";
import { getBookCoverUrl, getStatusSelectData, getTagSelectData } from "../libs/bookUtil";
import TagInput from "./TagInput";

// Safariは空のdate入力に当日の日付をプレースホルダー表示するため、未入力時にdate-emptyを付与する（style.css参照）
const emptyDateClass = (value) =>
  value ? "" : "date-empty";

const BookDetailModal = ({ book, onClose, onUpdate }) => {
  if (!book) return null; // bookがnullの場合は何も表示しない

  const [purchaseDate, setPurchaseDate] = useState(book.purchase_date || ""); // 購入日
  const [readEndDate, setReadEndDate] = useState(book.read_end_date || ""); // 読了日
  const [readStartDate, setReadStartDate] = useState(book.read_start_date || ""); // 読み始め日
  const [tags, setTags] = useState([]); // タグ一覧
  const [selectedTags, setSelectedTags] = useState([]); // 選択されたタグ（{ id, tag_name }、新しいタグは id が null）
  const [statuses, setStatuses] = useState([]); // ステータス一覧
  const [selectedStatus, setSelectedStatus] = useState(""); // 選択されたステータス
  const [rating, setRating] = useState(null); // 星評価（1〜5、nullは未評価）

  useEffect(() => {
    getStatusSelectData(supabase).then((data) => setStatuses(data || []));
  }, []);

  useEffect(() => {
    // タグ一覧と、この本に設定済みのタグを取得
    const fetchTags = async () => {
      const allTags = (await getTagSelectData(supabase)) || [];
      setTags(allTags);
      if (!book.id) return;
      const { data, error } = await supabase
        .from("book_tags")
        .select("tag_id")
        .eq("book_id", book.id)
        .eq("user_id", book.user_id);

      if (error) {
        console.error("選択済みタグの取得に失敗しました:", error);
        return;
      }
      const tagById = new Map(allTags.map((t) => [Number(t.id), t]));
      setSelectedTags(
        data
          .map((row) => tagById.get(Number(row.tag_id)))
          .filter(Boolean)
          .map((t) => ({ id: t.id, tag_name: t.tag_name }))
      );
    };
    fetchTags();
  }, [book.id, book.user_id]);

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

  const handleUpdate = async () => {
    if (!book.user_id || !book.id) {
      console.error("user_idまたはbook_idが未定義です。");
      alert("更新に必要な情報が不足しています。");
      return;
    }

    try {
      // 未登録のタグを作成する（本のタグを消す前に作り、失敗しても既存のタグ付けは残す）
      const newTagNames = [
        ...new Set(selectedTags.filter((t) => t.id == null).map((t) => t.tag_name)),
      ];
      let createdTags = [];
      if (newTagNames.length > 0) {
        const { data, error: createError } = await supabase
          .from("tags")
          .insert(newTagNames.map((tag_name) => ({ tag_name })))
          .select("id, tag_name");

        if (createError) {
          console.error("タグの作成に失敗しました:", createError);
          alert(`新しいタグの作成に失敗しました。\n${createError.message}`);
          return;
        }
        createdTags = data || [];
      }
      const createdIdByName = new Map(createdTags.map((t) => [t.tag_name, t.id]));
      const tagIds = [
        ...new Set(
          selectedTags
            .map((t) => t.id ?? createdIdByName.get(t.tag_name))
            .filter((id) => id != null)
            .map(Number)
        ),
      ];

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

      const { error: insertError } =
        tagIds.length > 0
          ? await supabase.from("book_tags").insert(
              tagIds.map((tagId) => ({
                book_id: book.id,
                tag_id: tagId,
                user_id: book.user_id,
              }))
            )
          : { error: null };

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
        onUpdate({ tagsCreated: createdTags.length > 0 });
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
        {/* 本文: 全体はスクロールしない */}
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
                className={`block w-48 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${emptyDateClass(purchaseDate)}`}
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
                className={`block w-40 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${emptyDateClass(readStartDate)}`}
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
                className={`block w-40 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 ${emptyDateClass(readEndDate)}`}
              />
            </div>
          </div>

          {/* 星評価 */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700"><strong>評価:</strong></span>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* タグ入力（既存タグの候補から選ぶか、新しいタグ名を入力して追加） */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700"><strong>タグ:</strong></p>
            <div className="mt-2">
              <TagInput tags={tags} value={selectedTags} onChange={setSelectedTags} />
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

export default BookDetailModal;
