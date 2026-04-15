import { Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import useThemeStyles from '../../Hooks/useThemeStyles';
import { useTheme } from '../../Context/ThemeContext';

const SidebarMenuCard = ({
  menuTitle = 'Sample Menu',
  icon = 'fa-solid fa-chart-simple',
  href,
  isMenuActive,
  onClick,
  setActiveChildMenu,
}) => {
  const { theme } = useTheme();
  const {
    sidebarHoverTextColor,
    sidebarHoverMenuBgColor,
    sidebarHoverMenuBorderColor,
    sidebarActiveTextColor,
    sideBarTextColor,
    sidebarActiveMenuBgColor,
    sidebarActiveMenuBorderColor,
    sidebarBorderColor,
  } = useThemeStyles(theme);

  const [loading, setLoading] = useState(false);

  // Handle the click event to prevent double-clicks
  const handleClick = (e) => {
    if (loading) {
      e.preventDefault(); // Prevent default navigation behavior
      e.stopPropagation(); // Stop event propagation to avoid firing multiple clicks
      return;
    }

    setLoading(true); // Lock the link before navigation

    // Run the menu click handler and reset child menu
    onClick?.();
    setActiveChildMenu?.(null);

    // Set loading to false after a short delay (simulate page load)
    setTimeout(() => {
      setLoading(false);
    }, 1000); // Adjust the delay as needed to match your loading experience
  };

  return (
    <Link
      onClick={handleClick}
      disabled={true}
      href={'/' + href}
      className={`cursor-pointer select-none px-3 py-[11px] overflow-hidden flex ${sideBarTextColor} items-center border-2 ${sidebarBorderColor} rounded-xl ${isMenuActive && sidebarActiveMenuBorderColor + ' ' + sidebarActiveMenuBgColor + ' ' + sidebarActiveTextColor} ${sidebarHoverMenuBgColor} ${sidebarHoverMenuBorderColor} ${sidebarHoverTextColor}`}
    >
      <div className="w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
        <i className={icon}></i>
      </div>
      <p className={`font-bold flex-shrink-0 text-xs`}>{menuTitle}</p>
    </Link>
  );
};

export default SidebarMenuCard;