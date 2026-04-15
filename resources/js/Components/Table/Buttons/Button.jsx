import { Link } from "@inertiajs/react";
import React from "react";

const Button = ({
    children,
    onClick,
    disabled,
    extendClass,
    type = "button",
    href,
    fontColor
}) => {
    return (
        <>
            {type == "button" ? (
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className={`${fontColor} overflow-hidden border border-[1px] border-gray-500 rounded-md font-poppins text-sm px-2 py-2 hover:opacity-80 ${extendClass}`}
                >
                    {children}
                </button>
            ) : (
                <Link
                    href={href}
                    className={`${fontColor} overflow-hidden border border-[1px] border-gray-500 rounded-md font-poppins text-sm px-2 py-2 hover:opacity-80 ${extendClass}`}
                >
                    {children}
                </Link>
            )}
        </>
    );
};

export default Button;
