import { usePage } from "@inertiajs/react";
import React, { useContext, useEffect } from "react";
import BreadCrumbs from "../../Components/Table/BreadCrumbs";
import { NavbarContext } from "../../Context/NavbarContext";
import { ToastProvider } from "../../Context/ToastContext";
import { useTheme } from "../../Context/ThemeContext";

const AppContent = ({ children }) => {
    const {theme} = useTheme();
    const { auth } = usePage().props;
    const isAdmin = Boolean(auth?.role?.isAdmin);
    const { title, setTitle } = useContext(NavbarContext);
    useEffect(() => {
        setTimeout(() => {
            setTitle(auth.module[0].name);
        }, 5);
    }, []);

    return (
        <>
            <div id="app-content" className={`h-full ${theme === 'bg-skin-black' ? 'bg-[#0b0e14]' : 'bg-slate-100'} ${isAdmin ? 'p-4' : 'p-2 sm:p-3'} z-10`}>
                {isAdmin && <BreadCrumbs data={auth} title={title}></BreadCrumbs>}
                <div id="content-area" className="relative min-h-0">
                    <ToastProvider>
                        {children}
                    </ToastProvider>  
                </div>
            </div>
        </>
    );
};

export default AppContent;
