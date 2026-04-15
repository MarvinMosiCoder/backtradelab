import React, { useEffect, useState, useContext } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { NavbarContext } from '../../Context/NavbarContext';
import SidebarAccordion from '../../Components/Sidebar/SidebarAccordion';
import { useTheme } from '../../Context/ThemeContext';
import getAppName from '../../Components/SystemSettings/ApplicationName';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import useThemeStyles from '../../Hooks/useThemeStyles';

const AppSidebarOld = () => {
    const [open, setOpen] = useState(true);
    const {theme} = useTheme();
    const [appname, setAppname] = useState('');
    const [applogo, setApplogo] = useState('');
    const { textColor, bgColor, borderColor } = useThemeStyles(theme);

    useEffect(() => {
        getAppName().then(appName => {
            setAppname(appName);
        });
        getAppLogo().then(appLogo => {
            setApplogo(appLogo);
        });
    }, [getAppName, getAppLogo]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setOpen(false);
            }else{
                setOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Function to close the sidebar
    const closeSidebar = () => {
        if (window.innerWidth < 768) {
            setOpen(false);
        }
    };
 
    return (
        <>
          
            <div className={`${theme} absolute z-100 cursor-pointer rounded-full -left-[-14px] md:-left-[-233px] top-[66px] md:top-[15px] lg:top-[15px] border-2 ${borderColor} p-2 flex items-center justify-center`} onClick={() => setOpen(!open)}>
                <img
                    src={`${theme == 'bg-skin-white' ? `/images/navigation/dashboard-arrow-icon-black.png` : `/images/navigation/dashboard-arrow-icon.png`}`}
                    className={`w-2 h-2 ${!open && "rotate-180"}`}
                />
            </div>
                
            <div className={` ${theme === 'bg-skin-black' ? theme : ''} ${ open ? "w-[292px]" : "hidden" }  transition-transform duration-500 p-5 pt-5 pr-1 select-none shadow-customLight`}>
                {
                    !open ? 
                        <div className={`mt-5 ${textColor} border-t p-2 ${borderColor} opacity-30`}></div>
                    :
                        <div
                            className={`font-poppins ${['bg-skin-black','bg-skin-black-light'].includes(theme) ? `text-gray-400` : `text-gray-500`} text-[14px] mt-5 ${
                                !open ? "text-center" : ""
                            }`}
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            <div>MENU</div>
                        </div>
                }
                <SidebarAccordion open={open} closeSidebar={closeSidebar}/>
            </div>
        </>
    );
};

export default AppSidebarOld;
