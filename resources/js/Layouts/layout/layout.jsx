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
import AdminNavbar from './AdminNavbar';

const Layout = ({ children }) => {
    const {theme} = useTheme();
    const { auth } = usePage().props;
    const isAdmin = Boolean(auth?.role?.isAdmin);
    return (
        <NavbarProvider>
            <div className="fixed z-[200] w-full">
                {isAdmin ? <AdminNavbar /> : <TraderNavbar />}
            </div>
            <div className="flex h-screen pt-14">
                {isAdmin ? <AppSidebar /> : <TraderSidebar />}
                <div className="flex min-w-0 w-full flex-col overflow-hidden">
                    <div className="flex-1 w-full flex flex-col overflow-auto">
                        <div className="flex-1">
                            <AppContent>{children}</AppContent>
                        </div>
                        {isAdmin && <AppFooter />}
                    </div>
                </div>
            </div>
        </NavbarProvider>
    );
};

export default Layout;
