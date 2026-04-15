import React from "react";
import Button from "../Table/Buttons/Button";
import { Link } from "@inertiajs/react";
import useThemeStyles from "../../Hooks/useThemeStyles";
import { useTheme } from "../../Context/ThemeContext";

const Card = ({ themeHead, children, headerName, iconClass, marginBottom, loading, withButton, onClick, href, setTextColor }) => {
    const {theme} = useTheme();
    const { sideBarTextColor, primayActiveColor, textColorActive, bgColor} = useThemeStyles(theme);
    return (
        <div className={`shadow-menus rounded-md ${bgColor} w-full justify-start flex flex-col mb-${marginBottom}`}>                  
            <div className={`${themeHead} p-3 rounded-tl-md rounded-tr-md border-b border-gray-300`}>
                <p className={`${sideBarTextColor} font-extrabold`}>
                    <i className={iconClass}></i> {headerName}
                </p>
            </div>
            <div className="p-5">
                {children}
            </div>
            {withButton && (
                <div className="p-2 border-t-2 mt-3">
                    <Link href={href} as="button">
                        <Button
                            extendClass="bg-skin-default border-[1px] border-gray-400"
                        >
                          <i className="fa fa-times-circle text-gray-700"></i>  Cancel
                        </Button>
                    </Link>
                    <Button
                        type="button"
                        extendClass={ (theme === 'bg-skin-white' ? primayActiveColor : theme)+" float-right"}
                        disabled={loading}
                        fontColor={textColorActive}
                        onClick={onClick}
                    >
                     <i className="fa fa-save"></i>   {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Card;
