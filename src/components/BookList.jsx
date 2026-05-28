import { getBookCoverUrl } from "../libs/bookUtil";
import { supabase } from "../libs/supabaseClient";
import { useEffect } from "react";

function BookList({ books, pagination, onBookClick, onUpdate }) {
  useEffect(() => {
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate]);

  if (books.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-14 w-full">
        <p style={{ color: "#888" }} className="text-lg">
          該当する書籍が見つかりませんでした。
        </p>
      </div>
    );
  }

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

  return (
    <div className="book-list">
      {books.map((book) => {
        return (
          <div
            key={book.id}
            className="book-item flex flex-col gap-2 cursor-pointer min-w-0"
            onClick={() => {
              console.log("BookListでクリックされたbook:", book);
              onBookClick(book);
            }}
          >
            <div
              className="book-title w-full text-lg font-semibold truncate mb-2 leading-tight"
              title={formatBookTitle(book)}
            >
              {formatBookTitle(book)}
            </div>

            <div className="book-row grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="book-cover col-span-1 sm:col-span-3 shrink-0 overflow-hidden">
                <div className="w-full h-48 sm:w-40 sm:h-60 overflow-hidden rounded">
                  {book.book_cover_image_name ? (
                    <img
                      src={getBookCoverUrl(supabase, book.book_cover_image_name)}
                      alt="本の表紙"
                      className="block w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              </div>
              <div className="book-detail col-span-1 sm:col-span-9 min-w-0">
              <div>著者: {book.author_names || "-"}</div>
              {book.translator_names && (
                <div>翻訳者: {book.translator_names || "-"}</div>
              )}
              {book.illustrator_names && (
                <div>イラスト: {book.illustrator_names || "-"}</div>
              )}
              <div>出版社: {book.publisher_name || "-"}</div>
              <div>
                定価: {book.price ? `¥${book.price.toLocaleString()}` : "-"}
              </div>
              <div>ISBN-10: {book.isbn_10 || "-"}</div>
              <div>ISBN-13: {book.isbn || "-"}</div>
              <div>判型: {book.format_name || "-"}</div>
              <div>ステータス: {book.status_name || "-"}</div>
              <div>頁数: {book.pages ? `${book.pages}ページ` : "-"}</div>
              <div>発売日: {book.release_date || "-"}</div>
              {book.purchase_date && <div>購入日: {book.purchase_date}</div>}
              {book.read_start_date && <div>読始日: {book.read_start_date}</div>}
              {book.read_end_date && <div>読了日: {book.read_end_date}</div>}
              {/* タグを表示 */}
              {book.tags && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600 mb-1">タグ:</div>
                  <div className="flex flex-wrap gap-1">
                    {book.tags
                      .split(", ")
                      .filter((tag) => tag.trim() !== "") // 空文字を除外
                      .map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        );
      })}
      {/* ページネーションを枠内下部に表示（上マージン追加） */}
      <div className="mt-6 mb-6">{pagination}</div>
    </div>
  );
}

export default BookList;
