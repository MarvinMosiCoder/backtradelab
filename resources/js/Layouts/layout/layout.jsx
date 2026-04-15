import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import AppFooter from "@/Layouts/layout/AppFooter.jsx";
import AppSidebar from "@/Layouts/layout/AppSidebar.jsx";
import AppNavbar from "@/Layouts/layout/AppNavbar.jsx";
import AppContent from "@/Layouts/layout/AppContent.jsx";
import { NavbarProvider } from "../../Context/NavbarContext";
import { useTheme } from "../../Context/ThemeContext";

const Layout = ({ children }) => {
    const {theme} = useTheme();
    return (
        <NavbarProvider>
            <div className="fixed w-full w-full z-100">
                <AppNavbar />   
            </div>
            <div className={`h-screen pt-[100px] md:pt-[60px] lg:pt-[60px] flex`}>
                <AppSidebar />
                <div className="bg-red-100 w-full flex flex-col md:overflow-hidden lg:overflow-hidden">
                    <div className="bg-white flex-1 w-full flex flex-col overflow-auto ">
                        <div className="flex-1">
                            <AppContent>{children}</AppContent>
                        </div>
                        <AppFooter />
                    </div>
                </div>
            </div>
        </NavbarProvider>
    );
};

export default Layout;
