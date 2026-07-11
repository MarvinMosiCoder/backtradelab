import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import AppFooter from "@/Layouts/layout/AppFooter.jsx";
import AppSidebar from "@/Layouts/layout/AppSidebar.jsx";
import AppNavbar from "@/Layouts/layout/AppNavbar.jsx";
import AppContent from "@/Layouts/layout/AppContent.jsx";
import { NavbarProvider } from "../../Context/NavbarContext";
import { useTheme } from "../../Context/ThemeContext";
import TraderNavbar from "./TraderNavbar";
import TraderSidebar from "./TraderSidebar";

const Layout = ({ children }) => {
    const {theme} = useTheme();
    const { auth } = usePage().props;
    const isSuperAdmin = Boolean(auth?.sessions?.admin_is_superadmin);
    return (
        <NavbarProvider>
            <div className="fixed z-100 w-full">
                {isSuperAdmin ? <AppNavbar /> : <TraderNavbar />}
            </div>
            <div className={`flex h-screen ${isSuperAdmin ? 'pt-[100px] md:pt-[60px]' : 'pt-14'}`}>
                {isSuperAdmin ? <AppSidebar /> : <TraderSidebar />}
                <div className="flex min-w-0 w-full flex-col overflow-hidden">
                    <div className="flex-1 w-full flex flex-col overflow-auto">
                        <div className="flex-1">
                            <AppContent>{children}</AppContent>
                        </div>
                        {isSuperAdmin && <AppFooter />}
                    </div>
                </div>
            </div>
        </NavbarProvider>
    );
};

export default Layout;
