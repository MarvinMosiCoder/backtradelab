import React, { useContext, useEffect, useState } from "react";
import { useTheme } from "../../Context/ThemeContext";

const AppFooter = () => {
    const {theme} = useTheme();
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [showWaterMark, setShowWaterMark] = useState(false);
    const handleShowWM = () => {
        setShowWaterMark(!showWaterMark);
    }

    return (
        <div className={` ${theme === 'bg-skin-black' ? 'bg-black-table-color text-gray-300' : ''} layout-footer p-[15px] px-5 flex justify-between select-none`}>
            <div className="font-poppins text-[14px] font-semibold">
                Copyright © {currentYear}. All Rights Reserved
            </div>
            <div className="font-poppins hidden text-[12px] md:block lg:block">
                Powered by VRAM
            </div>
            <div className="font-poppins text-[15px] md:hidden lg:hidden font-semibold"
                 onClick={handleShowWM}>
                <i className="fa fa-info-circle"></i>
            </div>
            {
                showWaterMark && (
                    <div className={`absolute ${theme} ${!['bg-skin-white'].includes(theme)? `text-white`: `text-black`} text-[12px] right-[15px] bottom-[40px] px-2 py-1 rounded-md md:hidden lg:hiden`}>
                        Powered by VRAM
                    </div>
                )
            }
        </div>
    );
};

export default AppFooter;
