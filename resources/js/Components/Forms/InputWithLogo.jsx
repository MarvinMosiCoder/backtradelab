import React from "react";

const InputWithLogo = ({
    label,
    type,
    placeholder,
    onChange,
    value,
    logo,
    marginBottom = 0,
    marginTop,
    name,
}) => {
    return (
        <>
            <div className={`mb-${marginBottom} mt-${marginTop}`}>
                <label className="font-poppins font-semibold">
                    {label}
                </label>
                <div className="border-2 border-black rounded-[10px] overflow-hidden flex items-center mt-2">
                    <div className="border-r-2 h-full p-[10px] border-black">
                        <img src={logo} className="w-[22px] h-[22px]" />
                    </div>
                    <input
                        name={name}
                        className="flex-1 mx-2 outline-none"
                        type={type}
                        value={value}
                        placeholder={placeholder}
                        onChange={onChange}
                    />
                </div>
            </div>
        </>
    );
};

export default InputWithLogo;
