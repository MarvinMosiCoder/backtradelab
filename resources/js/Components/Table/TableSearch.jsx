import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import debounce from "lodash/debounce";
import PerPage from "./PerPage";
import TableButton from "./Buttons/TableButton";
import { useTheme } from "../../Context/ThemeContext";
import Filters from "./Buttons/Filters";

const TableSearch = ({ queryParams }) => {
  const {theme} = useTheme();
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
    <>
      <div className="flex justify-items-ends font-poppins w-full max-w-[550px]">
      
        <input
          className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : ''} border font-poppins border-secondary rounded-l-md overflow-hidden h-9.5 w-full block px-4 text-sm outline-none`}
          type="text"
          name="search"
          id="search"
          placeholder="Search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <PerPage queryParams={queryParams} />
      </div>
    </>
  );
};

export default TableSearch;