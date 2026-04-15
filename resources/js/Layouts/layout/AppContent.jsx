import { usePage } from "@inertiajs/react";
import React, { useContext, useEffect } from "react";
import BreadCrumbs from "../../Components/Table/BreadCrumbs";
import { NavbarContext } from "../../Context/NavbarContext";
import { ToastProvider } from "../../Context/ToastContext";
import { useTheme } from "../../Context/ThemeContext";

const AppContent = ({ children }) => {
    const {theme} = useTheme();
    const { auth } = usePage().props;
    const { title, setTitle } = useContext(NavbarContext);
    useEffect(() => {
        setTimeout(() => {
            setTitle(auth.module[0].name);
        }, 5);
    }, []);

    return (
        <>
            <div id="app-content" className={`h-full ${theme === 'bg-skin-black' ? 'bg-black-screen-color' : 'bg-gray-100'} p-4 z-10`}>
                <BreadCrumbs data={auth} title={title}></BreadCrumbs>
                <div id="content-area" className="relative h-[600px]">
                    <ToastProvider>
                        {children}
                    </ToastProvider>  
                </div>
            </div>
        </>
    );
};

export default AppContent;
