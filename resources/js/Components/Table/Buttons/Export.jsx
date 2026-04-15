import React from "react";
import TableButton from "./TableButton";
import { useTheme } from "../../../Context/ThemeContext";

const Export = ({ path, handleToast }) => {
    const {theme} = useTheme();
    const handleExport = () => {
        Swal.fire({
            title: `<p class="font-poppins" >Are you sure that you want to export this table?</p>`,
            showCancelButton: true,
            confirmButtonText: "Confirm",
            confirmButtonColor: "#000000",
            icon: "question",
            iconColor: "#D1B701",
            reverseButtons: true,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // throw new Error('test');
                    window.location.href = path;
                } catch (error) {
                    {
                        handleToast &&
                            handleToast(
                                "Something went wrong, please try again later.",
                                "Error"
                            );
                    }
                }
            }
        });
    };

    return <TableButton extendClass={theme} onClick={handleExport}>Export</TableButton>;
};

export default Export;
