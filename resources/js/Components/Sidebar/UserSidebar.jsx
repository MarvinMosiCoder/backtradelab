import React, { useContext, useState } from 'react';
import SidebarMenuCard from './SidebarMenuCard';
import SidebarMenuCardMultiple from './SidebarMenuCardMultiple';
import { usePage } from '@inertiajs/react';
import { NavbarContext } from "../../Context/NavbarContext";

const UserSidebar = ({
  activeMenu,
  setActiveMenu,
  activeChildMenu,
  setActiveChildMenu,
  handleMenuClick, // Add this prop here
}) => {
  const { auth } = usePage().props;
  const user_menus = auth.sessions.user_menus;
  const { setTitle } = useContext(NavbarContext);

  const handleMenuClickInternal = (menuTitle, type) => {
    if (type === 'Route') {
      setActiveMenu(menuTitle);
      setTitle(menuTitle);
      handleMenuClick(); // Close the sidebar when a menu is clicked (on mobile)
    } else {
      setActiveMenu((prev) => (prev === menuTitle ? null : menuTitle));
    }
  };

  const handleChildMenuClick = (childTitle, parentTitle) => {
    setActiveChildMenu(childTitle);
    setActiveMenu(parentTitle);
    setTitle(childTitle);
    handleMenuClick();
  };

  return (
    <div className="m-5">
      <p className="text-xs font-bold text-gray-400 mb-5">MENU</p>
      <div className="space-y-2">
        {user_menus &&
          user_menus.map((menu, index) => {
            if (menu.type === 'Route') {
              return (
                <SidebarMenuCard
                  href={menu.slug}
                  key={index}
                  menuTitle={menu.name}
                  icon={menu.icon}
                  setActiveChildMenu={setActiveChildMenu}
                  isMenuActive={activeMenu === menu.name}
                  onClick={() => handleMenuClickInternal(menu.name, menu.type)}
                />
              );
            } else {
              return (
                <SidebarMenuCardMultiple
                  key={index}
                  menuTitle={menu.name}
                  icon={menu.icon}
                  childMenus={menu.children}
                  isMenuActive={
                    activeMenu === menu.name ||
                    (menu.children &&
                      menu.children.some((child) => child.name === activeMenu))
                  }
                  isChildMenuActive={activeChildMenu}
                  isMenuOpen={activeMenu === menu.name}
                  onMenuClick={() => handleMenuClickInternal(menu.name)}
                  onChildMenuClick={handleChildMenuClick}
                  handleMenuClick={handleMenuClick} 
                />
              );
            }
          })}
      </div>
    </div>
  );
};

export default UserSidebar;