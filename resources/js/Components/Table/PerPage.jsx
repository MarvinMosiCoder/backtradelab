import { router } from '@inertiajs/react';
import React, { useRef } from 'react'
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../Context/ThemeContext';

const PerPage = ({queryParams}) => {
  const {theme} = useTheme();
  const isDark = theme === 'bg-skin-black';
  const perPage = useRef(queryParams?.perPage || 10);
  const path = window.location.pathname;


  const handleChange = (e) => {
      perPage.current = e.target.value;
      const updatedParams = {...queryParams, perPage: perPage.current, page: 1};
      router.get(path, updatedParams, {preserveScroll:true, preserveState:true});
  }

  return (
    <div className="relative h-9 w-16 shrink-0">
      <select
        className={`h-full w-full cursor-pointer appearance-none rounded-lg border pl-3 pr-6 text-xs outline-none ${isDark ? 'border-[#2a2e39] bg-[#0b0e14] text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
        name="perPage"
        id="perPage"
        value={perPage.current}
        onChange={handleChange}
      >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="30">30</option>
          <option value="40">40</option>
          <option value="50">50</option>
          <option value="100">100</option>
      </select>
      <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#787b86]' : 'text-slate-400'}`}>
          <ChevronDown size={13}/>
      </span>
    </div>
  )
}


export default PerPage
