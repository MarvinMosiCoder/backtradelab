import { router } from '@inertiajs/react';
import React, { useRef } from 'react'
import DescIcon from './Icons/DescIcon';
import { useTheme } from '../../Context/ThemeContext';

const PerPage = ({queryParams}) => {
  const {theme} = useTheme();
  const perPage = useRef(queryParams?.perPage || 10);
  const path = window.location.pathname;


  const handleChange = (e) => {
      perPage.current = e.target.value;
      const updatedParams = {...queryParams, perPage: perPage.current, page: 1};
      router.get(path, updatedParams, {preserveScroll:true, preserveState:true});
  }

  return (
    <div className='relative w-[58px] min-w-[50px] h-[38px] '>
      <select 
        className={`appearance-none pl-[10px] text-sm outline-none rounded-r-md font-poppins border border-l-0 border-secondary ${theme === 'bg-skin-black' ? theme+ ' text-gray-300' : 'bg-gray-100 text-stone-900'}  w-full h-full cursor-pointer`}  
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
      {/* Icon  */}
      <span className="absolute top-1/2 right-[8px] -translate-y-1/2  pointer-events-none">
          <DescIcon />
      </span>
    </div>
  )
}


export default PerPage