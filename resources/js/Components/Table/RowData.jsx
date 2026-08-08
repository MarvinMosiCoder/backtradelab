import React from "react";
import { useTheme } from "../../Context/ThemeContext";

const RowData = ({ children, sticky, center, isLoading }) => {
    const {theme} = useTheme();
    const isDark = theme === 'bg-skin-black';
    const bg = isDark ? 'bg-[#131722]' : 'bg-white';
    const stickyClass = {
        left: `sticky left-0 z-20 ${bg}`,
        right: `sticky right-0 z-20 ${bg}`,
    }[sticky];

    return (
        <td
            className={`px-3 py-2.5 text-xs ${isDark ? 'text-[#d1d4dc]' : 'text-slate-700'} ${stickyClass ?? ''} ${
                center && "text-center"
            }`}
        >
            {isLoading ? (
                <span className={`inline-block h-4 w-3/4 animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    &nbsp;&nbsp;
                </span>
            ) : (
                children
            )}
        </td>
    );
};

export default RowData;
