import React from "react";

const Row = ({ children }) => {
    return (
        <tr
            className={`text-sm relative`}
        >
            {children}
        </tr>
    );
};

export default Row;
