import React from 'react';
import { useTheme } from '../../Context/ThemeContext';

const Thead = ({children}) => {
  const { theme } = useTheme();
  const isDark = theme === 'bg-skin-black';
  return (
     <thead className={`sticky top-0 left-0 z-30 border-b ${isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'}`}>
        {children}
     </thead>
  )
}
export default Thead
