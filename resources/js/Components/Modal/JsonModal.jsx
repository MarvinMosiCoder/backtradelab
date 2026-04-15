import React from "react";

const JsonModal = ({ show, onClose, children, title, modalData }) => {
    console.log(children);
    if (!show) {
        return null;
    }

    let parsedData;

    try {
        parsedData = JSON.parse(modalData);
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        parsedData = modalData;
    }

    return (
        <div className="modal-backdrop z-[100] fixed top-0 left-0 w-full h-full flex justify-center items-center bg-gray-500 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-custom  m-5 ">
                <div className="flex justify-between p-5 border-b-2 items-center">
                    <p className="font-poppins font-extrabold text-lg">
                        {title}
                    </p>
                    <i
                        className="fa-solid fa-x text-red-500 font-extrabold text-md cursor-pointer"
                        onClick={onClose}
                    ></i>
                </div>
                <pre className="py-3 px-5 text-sm overflow-auto max-h-[89vh]">
                    {JSON.stringify(parsedData, null, 2)}
                </pre>
                {/* <main className="py-3 px-5">{children}</main> */}
            </div>
        </div>
    );
};

export default JsonModal;
