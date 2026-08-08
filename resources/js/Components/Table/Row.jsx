import React from "react";
import { useTheme } from "../../Context/ThemeContext";

const Row = ({ children }) => {
    const { theme } = useTheme();
    const isDark = theme === 'bg-skin-black';
    return (
        <tr
            className={`text-sm relative border-b transition-colors last:border-b-0 ${isDark ? 'border-[#2a2e39] hover:bg-white/[0.03]' : 'border-slate-200 hover:bg-slate-50'}`}
        >
            {children}
        </tr>
    );
};

export default Row;
