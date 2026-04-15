import React from "react";
import { useTheme } from "../../Context/ThemeContext";

const ContentPanel = ({ marginBottom, children }) => {
    const {theme} = useTheme();
    return (
        <div
            className={`py-4 px-4 rounded-md ${theme === 'bg-skin-black' ? 'bg-black-table-color' : 'bg-white'} shadow-menus  w-full flex flex-col justify-between mb-${marginBottom}`}
        >
            {children}
        </div>
    );
};

export default ContentPanel;
