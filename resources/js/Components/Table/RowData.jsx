import React from "react";
import { useTheme } from "../../Context/ThemeContext";

const RowData = ({ children, sticky, center, isLoading }) => {
    const {theme} = useTheme();
    const stickyClass = {
        left: `sticky left-0 top-0 z-40 after:absolute after:top-0 after:right-0 after:z-40  after:h-full after:w-[0.60px] ${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'}`,
        right: `sticky right-0 top-0 z-40 before:absolute before:top-0 before:left-0  before:z-40  before:h-full before:w-[0.60px] ${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'}`,
    }[sticky];

    return (
        <td
            className={`px-3 py-2 ${theme === 'bg-skin-black' ? theme+' text-gray-400' : 'bg-white'} text-[12px] border border-b-0 border-t-0 first:border-l-0 last:border-r-0 border-secondary ${stickyClass} ${
                center && "text-center"
            }`}
        >
            {isLoading ? (
                <span className="animate-pulse inline-block w-3/4 rounded-lg h-4 p-auto bg-gray-200">
                    &nbsp;&nbsp;
                </span>
            ) : (
                children
            )}
        </td>
    );
};

export default RowData;
