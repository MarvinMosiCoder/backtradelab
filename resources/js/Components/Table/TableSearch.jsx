import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import debounce from "lodash/debounce";
import { Search } from "lucide-react";
import PerPage from "./PerPage";
import { useTheme } from "../../Context/ThemeContext";

const TableSearch = ({ queryParams }) => {
  const {theme} = useTheme();
  const isDark = theme === 'bg-skin-black';
  const [searchValue, setSearchValue] = useState(queryParams?.search || "");
  const path = window.location.pathname;

  const debouncedSearch = debounce((searchValue, path, queryParams) => {
    router.get(
      path,
      { ...queryParams, search: searchValue, page: 1 },
      { preserveState: true, replace: true }
    );
  }, 500);

  useEffect(() => {
    if (searchValue !== "") {
      debouncedSearch(searchValue, path, queryParams);
    } else if (queryParams?.search) {
      // Only reload if the initial search query is not empty
      router.get(path, { ...queryParams, search: "" }, { preserveState: true });
    }

    return () => debouncedSearch.cancel();
  }, [searchValue]);

  return (
    <div className="flex w-full max-w-[550px] items-center gap-2">
      <label className={`flex h-9 flex-1 items-center gap-2 rounded-lg border px-3 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}>
        <Search size={14} className={isDark ? 'text-[#787b86]' : 'text-slate-400'}/>
        <input
          className="w-full bg-transparent text-xs outline-none placeholder:text-[#787b86]"
          type="text"
          name="search"
          id="search"
          placeholder="Search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </label>
      <PerPage queryParams={queryParams} />
    </div>
  );
};

export default TableSearch;
