import { router } from '@inertiajs/react';
import React, { useRef, useState, useEffect } from 'react'
import { useTheme } from '../../Context/ThemeContext';
import useThemeStyles from '../../Hooks/useThemeStyles';

const BreadCrumbs = ({data, title}) => {
    const {theme} = useTheme();
    const { iconThemeColor, primayActiveColor, sideBarTextColor } = useThemeStyles(theme);
    const [icon, setIcon] = useState(null);
    useEffect(() => {   
        if ((data.module[0].name ?? title) === 'Dashboard') {
            setIcon('chart-simple');
        } else if ((data.module[0].name ?? title) === 'Profile') {
            setIcon('id-card-alt');
        }else if ((data.module[0].name ?? title) === 'Change Password') {
            setIcon('user-lock');
        } else {
            setIcon(null);
        }
        

    }, [data.module, title]); 
  return (
   <>
    <div className={`shadow-menus flex space-y-2 md:space-y-0 flex-col ${theme === 'bg-skin-black' ?  theme + ' border-skin-black-light' : 'bg-skin-white' } border  md:flex-row lg:flex-row rounded-lg justify-between px-4 py-3 font-poppins mb-3`}>
        <div className="space-x-3 flex items-center">
            {icon ?
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${theme == 'bg-skin-white' && 'border border-skin-black-light bg-skin-black'}  ${theme === 'bg-skin-black' ? 'bg-skin-black-light' : theme}`}>
                    <i className={`fa fa-${icon}  text-base md:text-lg  ${theme === 'bg-skin-white' ? 'text-black' : 'text-white'}`}></i>
                </div>
            :
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${theme == 'bg-skin-white' && 'border border-skin-black-light bg-skin-black'}  ${theme === 'bg-skin-black' ? 'bg-skin-black-light' : theme}`}>
                    <i className={data.module[0].icon +` text-base md:text-lg  ${theme === 'bg-skin-white' ? 'text-black' : 'text-white'} `}></i>
                </div>
            }
            
            <span className={`font-medium text-base md:text-xl ${theme === 'bg-skin-black' ? 'text-gray-400': sideBarTextColor } `}>{title}</span>
        </div>
        <div className={`flex items-center ${theme === 'bg-skin-black' ? 'text-gray-300' : sideBarTextColor } text-xs space-x-2`}>
            <i className={`fa fa-tachometer-alt-fast text-xs ${iconThemeColor}`}></i>
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-gray-500">{data.module[0].name ?? title}</span>
        </div>
    </div>
   </>
  )
}


export default BreadCrumbs