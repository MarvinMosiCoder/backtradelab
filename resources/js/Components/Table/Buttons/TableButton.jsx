import React from "react";

const TableButton = ({ children, onClick, disabled, type, extendClass, fontColor, ...props }) => {
    return (
        <button
            {...props}
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${fontColor} overflow-hidden  rounded-md font-poppins text-sm border border-secondary px-2 py-2 hover:opacity-80 ${extendClass}`}
        >
            {children}
        </button>
    );
};

export default TableButton;
