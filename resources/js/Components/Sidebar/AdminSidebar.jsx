import React, { useContext, useState } from 'react'
import SidebarMenuCard from './SidebarMenuCard'
import SidebarMenuCardMultiple from './SidebarMenuCardMultiple'
import { NavbarContext } from "../../Context/NavbarContext";
import { usePage } from '@inertiajs/react';


const AdminSidebar = ({activeMenu, setActiveMenu, activeChildMenu, setActiveChildMenu, handleMenuClickToggle}) => {

    const { setTitle } = useContext(NavbarContext);
    const { auth } = usePage().props;
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
    <div className='m-5'>
        <p className='text-xs font-bold text-gray-400 mb-5 text-nowrap'>ADMIN MENU</p>
        <div className='space-y-2'>
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