
function Pagination({ currentPage, totalPages, totalCount, setCurrentPage }) {
  return (
    <div className="pagination flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition text-lg font-bold"
        aria-label="最初のページ"
      >≪</button>
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition text-lg font-bold"
        aria-label="前のページ"
      >＜</button>
      <div className="mx-3 flex items-center gap-1">
        <select
          className="px-2 py-1 border rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={currentPage}
          onChange={e => setCurrentPage(Number(e.target.value))}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <span className="text-gray-800 font-semibold">of {totalPages}{totalCount > 0 && <span className="text-gray-500 font-normal text-sm ml-1">({totalCount}件)</span>}</span>
      </div>
      <button
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition text-lg font-bold"
        aria-label="次のページ"
      >＞</button>
      <button
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition text-lg font-bold"
        aria-label="最後のページ"
      >≫</button>
    </div>
  );
}

export default Pagination;
