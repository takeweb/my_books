// src/App.jsx
import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import BookList from "./components/BookList";
import Pagination from "./components/Pagination";
import TagSelect from "./components/TagSelect";
import StatusSelect from "./components/StatusSelect";
import UserIcon from "./components/UserIcon";
import BookDetailModal from "./components/BookDetailModal";
import {
  handleSignUp as authHandleSignUp,
  handleSignIn,
  handleSignOut,
} from "./libs/auth";
import { getJoinedBooksData, getTagSelectData, getStatusSelectData } from "./libs/bookUtil";
import { supabase } from "./libs/supabaseClient";

function App() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // 認証・UI状態
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authError, setAuthError] = useState("");

  // データ状態
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [books, setBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);

  // ページ変更時に上部へスクロール
  const handleSetCurrentPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e) => {
      // ドロップダウンとボタン以外をクリックしたら閉じる
      const menu = document.getElementById("user-menu-dropdown");
      const btn = document.getElementById("user-menu-btn");
      if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  // 認証状態監視
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // タグ・ステータス一覧取得
  useEffect(() => {
    if (!user) return;
    getTagSelectData(supabase).then((tags) => setTags(tags || []));
    getStatusSelectData(supabase).then((statuses) => setStatuses(statuses || []));
  }, [user]);

  // 書籍データ取得
  useEffect(() => {
    if (!user) return;
    getJoinedBooksData(
      supabase,
      currentPage,
      5,
      (count) => setTotalPages(Math.max(1, Math.ceil(count / 5))),
      selectedTag === "" ? null : selectedTag,
      selectedStatus === "" ? null : selectedStatus,
      tags
    ).then((books) => {
      if (books) setBooks(books);
    });
  }, [user, selectedTag, selectedStatus, currentPage, tags]);

  // ログイン
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    await handleSignIn(email, password, (supabase, user) => {
      if (!user) {
        setAuthError("ログインに失敗しました");
      } else {
        setUser(user);
      }
    });
  };

  // サインアップ
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError("");
    await authHandleSignUp(email, password, (error, user) => {
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthMode("login");
      }
    });
  };

  // ログアウト
  const handleLogout = async () => {
    await handleSignOut((error) => {
      if (!error) setUser(null);
    });
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* 固定タイトルバー＋タグセレクト */}
        <div
          className="w-full fixed top-0 left-0 z-40 bg-blue-50 border-b border-blue-200 shadow"
          style={{ minWidth: 0, maxWidth: "100vw" }}
        >
          <div className="flex flex-row items-center justify-center px-6 py-1 gap-6 pt-2">
            <h1 className="text-2xl font-bold text-blue-900 tracking-tight whitespace-nowrap flex items-end mb-0">
              My Books
            </h1>
            {/* タグ・ステータスセレクト（ログイン時のみ） */}
            {user && (
              <div className="flex items-center justify-center mt-4 gap-4">
                <TagSelect
                  tags={tags}
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                  setCurrentPage={setCurrentPage}
                />
                <StatusSelect
                  statuses={statuses}
                  selectedStatus={selectedStatus}
                  setSelectedStatus={setSelectedStatus}
                  setCurrentPage={setCurrentPage}
                />
              </div>
            )}
            {user && (
              <div className="relative flex items-end mb-0">
                <button
                  id="user-menu-btn"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-label="ユーザーメニュー"
                >
                  <UserIcon className="w-6 h-6 text-blue-500" />
                </button>
                {userMenuOpen && (
                  <div
                    id="user-menu-dropdown"
                    className="absolute top-full right-0 mt-2 w-56 bg-white border border-blue-200 rounded-lg shadow-lg z-50 animate-fade-in flex flex-col p-4 gap-2 min-w-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-6 h-6 text-blue-500" />
                      <span className="text-blue-800 font-semibold text-sm break-all">
                        {user.email}
                      </span>
                    </div>
                    <span className="text-xs text-blue-400 bg-blue-100 rounded px-2 py-0.5 w-fit">
                      ログイン中
                    </span>
                    <button
                      className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition shadow text-sm"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* メインコンテンツ（スクロール） */}
        <div className="flex-1 flex flex-col items-center pt-24 px-2 max-w-3xl mx-auto w-full">
          {/* 認証UI */}
          {!user && (
            <AuthForm
              authMode={authMode}
              email={email}
              password={password}
              authError={authError}
              setEmail={setEmail}
              setPassword={setPassword}
              setAuthMode={setAuthMode}
              handleLogin={handleLogin}
              handleSignUp={handleSignUp}
            />
          )}

          {/* 書籍リスト（ログイン時のみ） */}
          {user && (
            <>
              <BookList
                books={books}
                tags={tags}
                pagination={
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={handleSetCurrentPage}
                  />
                }
                onBookClick={(book) => setSelectedBook(book)}
                onTagClick={(tagId) => {
                  setSelectedTag(String(tagId));
                  handleSetCurrentPage(1);
                }}
              />
              <BookDetailModal
                book={selectedBook}
                onClose={() => setSelectedBook(null)}
                onUpdate={() => {
                  getJoinedBooksData(
                    supabase,
                    currentPage,
                    5,
                    (count) => setTotalPages(Math.max(1, Math.ceil(count / 5))),
                    selectedTag === "" ? null : selectedTag,
                    selectedStatus === "" ? null : selectedStatus,
                    tags
                  ).then((books) => {
                    if (books) setBooks(books);
                  });
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
