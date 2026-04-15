import React, { useState } from "react";
import FormatLabelName from "../../Utilities/FormatLabelName";

const InputFile = ({
    type = "file",
    name,
    value,
    onChange,
    displayName,
    extendedClass
}) => {

    const fileBg = {
        "bg-skin-blue": "bg-skin-blue",
        "bg-skin-blue-light": "bg-skin-blue-light",
        "bg-skin-yellow": "bg-skin-yellow",
        "bg-skin-yellow-light": "bg-skin-yellow-light",
        "bg-skin-green": "bg-skin-green",
        "bg-skin-green-light": "bg-skin-green-light",
        "bg-skin-purple": "bg-skin-purple",
        "bg-skin-purple-light": "bg-skin-purple-light",
        "bg-skin-red": "bg-skin-red",
        "bg-skin-red-light": "bg-skin-red-light",
        "bg-skin-black": "bg-skin-black",
        "bg-skin-black-light": "bg-skin-black-light"
    }[extendedClass];

    return (
        <div className="">
            <label
                htmlFor={name}
                className="block text-sm font-bold text-gray-700 font-poppins"
            >
                {displayName || FormatLabelName(name)}
            </label>
            <input
                id={name}
                type={type}
                value={value}
                name={name}
                onChange={onChange}
                className={`block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:${fileBg} file:text-gray-200
                border-2 rounded-full ${fileBg}/10 file:cursor-pointer cursor-pointer`}

            />
        </div>
    );
};

export default InputFile;
