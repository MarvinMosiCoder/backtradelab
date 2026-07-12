import React, { useContext, useState } from 'react'
import SidebarMenuCard from './SidebarMenuCard'
import SidebarMenuCardMultiple from './SidebarMenuCardMultiple'
import { NavbarContext } from "../../Context/NavbarContext";
import { usePage } from '@inertiajs/react';
import { useSidebar } from '../../Context/SidebarContext';


const AdminSidebar = ({activeMenu, setActiveMenu, activeChildMenu, setActiveChildMenu, handleMenuClickToggle}) => {

    const { setTitle } = useContext(NavbarContext);
    const page = usePage();
    const { isSidebarOpen } = useSidebar();
    const { auth } = page.props;
    const admin_menus  = auth.sessions.admin_menus;    

    const handleMenuClick = (menuTitle, type) => {
        if (type === 'Route'){
            setActiveMenu(menuTitle);
            setTitle(menuTitle);
            handleMenuClickToggle();
        }else {
            setActiveMenu((prev) => (prev === menuTitle ? null : menuTitle));
        }
 
    };

    const handleChildMenuClick = (childTitle, parentTitle) => {
        setActiveChildMenu(childTitle);
        setActiveMenu(parentTitle);
        setTitle(childTitle);
        handleMenuClickToggle();
    };

  return (
    <div className='border-t border-[#2a2e39] p-2 pt-3'>
        {isSidebarOpen && <p className='mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#787b86] text-nowrap'>ADMIN MENU</p>}
        <div className='space-y-1'>
            <SidebarMenuCard
                href="admin/feedback"
                menuTitle="Customer Support"
                icon="fa-solid fa-comments"
                setActiveChildMenu={setActiveChildMenu}
                isMenuActive={activeMenu === 'Customer Support' || page.url.startsWith('/admin/feedback')}
                onClick={() => handleMenuClick('Customer Support', 'Route')}
            />
            {
                admin_menus && admin_menus.map((menu, index)=>{
                    if (menu.type === 'Route'){
                        return <SidebarMenuCard 
                                    href={menu.slug} 
                                    key={index + menu.name} 
                                    menuTitle={menu.name} 
                                    icon={menu.icon}
                                    setActiveChildMenu={setActiveChildMenu}
                                    isMenuActive={activeMenu === menu.name} 
                                    onClick={() => handleMenuClick(menu.name, menu.type)}
                                />
                    }
                    else
                    {
                        return <SidebarMenuCardMultiple 
                                    key={index + menu.name}
                                    menuTitle={menu.name} 
                                    icon={menu.icon} 
                                    childMenus={menu.children} 
                                    isMenuActive={activeMenu === menu.name || (menu.children && menu.children.some(child => child.name === activeMenu))}
                                    isChildMenuActive={activeChildMenu}
                                    isMenuOpen={activeMenu === menu.name}
                                    onMenuClick={() => handleMenuClick(menu.name)}
                                    onChildMenuClick={handleChildMenuClick}
                                />

                    }
                }) 

            }
            
        </div>
    </div>
  )
}

export default AdminSidebar
