import React, { useEffect, useState } from 'react';
import { useTheme } from '../../Context/ThemeContext';
import useThemeStyles from '../../Hooks/useThemeStyles';
import UserSidebar from '../../Components/Sidebar/UserSidebar';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import { usePage } from '@inertiajs/react';
import { useSidebar } from '../../Context/SidebarContext';

const AppSidebar = () => {
    // const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { isSidebarOpen, toggleSidebar } = useSidebar();

    const { theme } = useTheme();
    const { auth } = usePage().props;

    const [activeMenu, setActiveMenu] = useState(null);
    const [activeChildMenu, setActiveChildMenu] = useState(null);

    const menu = auth.menu ?? '';
    const user_menus = auth.sessions.user_menus;
    const admin_menu = auth.sessions.admin_menus;
    const parent_menu =
        user_menus.find((user_menu) => user_menu.id === menu.parent_id) ??
        admin_menu.find((admin_menu) => admin_menu.id === menu.parent_id) ??
        '';

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 640px)');
        const handleMediaQueryChange = (e) => {
            if (e.matches) {
                toggleSidebar(false)
            } else {
                toggleSidebar(true)
            }
        };
        handleMediaQueryChange(mediaQuery);
        mediaQuery.addEventListener('change', handleMediaQueryChange);
        return () =>
            mediaQuery.removeEventListener('change', handleMediaQueryChange);
    }, []);

    useEffect(() => {
        if (menu.parent_id == 0) {
            setActiveMenu(menu.name);
            setActiveChildMenu(null);
        } else {
            setActiveMenu(parent_menu.name);
            setActiveChildMenu(menu.name);
        }
    }, [menu]);

    const privilege = auth.sessions.admin_privileges;
    const { sideBarBgColor, bgColor, borderColor } = useThemeStyles(theme);

    const handleSidebarToggle = () => {
        toggleSidebar();
    };

    const handleMenuClick = () => {
        if (window.innerWidth <= 640) {
            toggleSidebar();
        }
    };

    return (
        <>
            <div
                className={`${theme} absolute z-100 cursor-pointer rounded-full -left-[-14px] md:-left-[-270px] top-[66px] md:top-[15px] lg:top-[15px] border-2 ${borderColor} p-2 flex items-center justify-center`}
                onClick={() => handleSidebarToggle()}
            >
                <img
                    src={`${
                        theme == 'bg-skin-white'
                            ? `/images/navigation/dashboard-arrow-icon-black.png`
                            : `/images/navigation/dashboard-arrow-icon.png`
                    }`}
                    className={`w-2 h-2 ${!isSidebarOpen && 'rotate-180'} select-none`}
                />
            </div>
            <div
                className={`${isSidebarOpen ? 'w-[22rem]' : 'w-0'} transition-[width,height] duration-500 ${sideBarBgColor} absolute md:relative z-[70]`}
            >
                <div className="max-h-[85vh] overflow-y-auto scrollbar-none select-none">
                    {/* Pass handleMenuClick to UserSidebar and AdminSidebar */}
                    <UserSidebar
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        activeChildMenu={activeChildMenu}
                        setActiveChildMenu={setActiveChildMenu}
                        handleMenuClick={handleMenuClick} // Pass to UserSidebar
                    />
                    {privilege == 1 && (
                        <AdminSidebar
                            activeMenu={activeMenu}
                            setActiveMenu={setActiveMenu}
                            activeChildMenu={activeChildMenu}
                            setActiveChildMenu={setActiveChildMenu}
                            handleMenuClickToggle={handleMenuClick} // Pass to AdminSidebar
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default AppSidebar;