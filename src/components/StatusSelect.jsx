function StatusSelect({ statuses, selectedStatus, setSelectedStatus, setCurrentPage }) {
  return (
    <div className="flex flex-row items-center gap-2">
      <label
        htmlFor="status-select"
        className="text-gray-700 font-semibold whitespace-nowrap w-24 sm:w-auto"
      >
        ステータス：
      </label>
      <select
        id="status-select"
        className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm min-w-32"
        value={selectedStatus}
        onChange={(e) => {
          setSelectedStatus(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="">全て</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.status_name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default StatusSelect;
