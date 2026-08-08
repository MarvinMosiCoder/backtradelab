import { router } from '@inertiajs/react';
import React from 'react'
import DescIcon from './Icons/DescIcon';
import SortIcon from './Icons/SortIcon';
import AscIcon from './Icons/AscIcon';
import { useTheme } from '../../Context/ThemeContext';

const TableHeader = ({
  name,
  children,
  sortable = true,
  queryParams = null,
  justify = "between",
  width = "md",
  sticky
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'bg-skin-black';
  const sort_field = queryParams?.sortBy;
  const sort_direction = queryParams?.sortDir;
  const path = window.location.pathname;


  const handleSort = (name) => {
    let updatedParams = null;

    if (name === queryParams?.sortBy) {
        const sortDir = sort_direction === "asc" ? "desc" : "asc";
        updatedParams = {...queryParams, sortDir: sortDir};

        router.get(path, updatedParams, {preserveScroll:true, preserveState:true});
    } else {
        updatedParams = {...queryParams, sortBy: name, sortDir: "asc"};

        router.get(path, updatedParams,  {preserveScroll:true, preserveState:true});
    }

  };

  const widthClass = {
    auto: "w-auto",
    sm: 'min-w-20',
    md: 'min-w-40',
    lg: 'min-w-60',
    xl: 'min-w-72',
    '2xl': 'min-w-80',
  }[width];

  const justifyClass = {
    start: "justify-start",
    center: "justify-center",
    between: "justify-between",
    end: "justify-end"
  }[justify];

  const stickyClass = {
    left: `sticky left-0 z-20 ${isDark ? 'bg-[#131722]' : 'bg-slate-50'}`,
    right: `sticky right-0 z-20 ${isDark ? 'bg-[#131722]' : 'bg-slate-50'}`,
  }[sticky];

  return (
		<th
			onClick={sortable ? (() => handleSort(name)) : undefined}
			className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-[#787b86]' : 'text-slate-500'} ${widthClass} ${stickyClass ?? ''}`}>
			<div className={`px-3 py-3 flex items-center gap-2 ${sortable && "cursor-pointer select-none"} ${justifyClass}`}>
				{children}
				{sortable && (
					<div className="shrink-0 opacity-70">
						{sort_field &&
						sort_direction &&
						//  DESCENDING
						sort_field === name &&
						sort_direction === "desc" ? (
							<span className="inline-block mb-0.5">
								<DescIcon />
							</span>
						) : //  ASCENDING
						sort_field === name && sort_direction === "asc" ? (
							<span className="inline-block mb-0.5">
								<AscIcon/>
							</span>
						) : (
							// BOTH ICON
							<SortIcon />
						)}
					</div>
				)}
			</div>
		</th>
  );
}

export default TableHeader
