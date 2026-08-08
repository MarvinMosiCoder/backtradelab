import React from "react";
import { useTheme } from "../../Context/ThemeContext";

const ContentPanel = ({ marginBottom, children }) => {
    const {theme} = useTheme();
    const isDark = theme === 'bg-skin-black';
    return (
        <div
            className={`w-full flex flex-col justify-between rounded-xl border p-4 mb-${marginBottom} ${isDark ? 'border-[#2a2e39] bg-[#131722] text-[#d1d4dc]' : 'border-slate-200 bg-white text-slate-900'}`}
        >
            {children}
        </div>
    );
};

export default ContentPanel;
