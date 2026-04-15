import React, { useState } from "react";
import FormatLabelName from "../../Utilities/FormatLabelName";
import { useTheme } from "../../Context/ThemeContext";

const InputComponentPassword = ({
    type = "password",
    name,
    value,
    onChange,
    placeholder,
    displayName,
    checked,
    logo,
}) => {
    const {theme} = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };
    return (
        <div className="relative w-full">
            <label
                htmlFor={name}
                className={`${theme === 'bg-skin-black' ? 'text-gray-300' : 'bg-white'} block text-sm font-bold font-poppins`}
            >
                {displayName || FormatLabelName(name)}
            </label>
            <div className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} border-2 rounded-[10px] border-[1px] border-black overflow-hidden flex items-center mt-2`}>
                <div className="border-r-2 h-full p-[10px] px-4 border-r-[1px] border-black">
                   <i className="fa fa-lock"></i>
                </div>
                <input
                    id={name}
                    type={showPassword ? 'text' : type}
                    value={value}
                    name={name}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} flex-1 mx-2 outline-none`}
                    checked={checked}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center px-2 pt-6 text-gray-600"
                    
                >
                    {showPassword ? (
                        <i className="fa fa-eye-slash"></i>
                    ) : (
                        <i className="fa fa-eye"></i>
                    )}
                </button>
            </div>
        </div>
    );
};

export default InputComponentPassword;
