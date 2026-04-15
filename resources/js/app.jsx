import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp, router  } from "@inertiajs/react";
import Layout from "@/Layouts/layout/layout.jsx";
import { ThemeProvider } from "./Context/ThemeContext";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import getAppName from './Components/SystemSettings/ApplicationName';
import AppInitializer from "./AppInitializer";
import '../css/nprogress-custom.css';
import { SidebarProvider } from './Context/SidebarContext';
getAppName().then(appName => {
    createInertiaApp({
        title: title => `${appName} | ${title ? `${title}` : 'System'}`,
        resolve: name => {
            const pages = import.meta.glob("./Pages/**/*.jsx", { eager: true });
            let page = pages[`./Pages/${name}.jsx`];
            page.default.layout =
                name.startsWith("Auth/") || name === "Dashboard"
                    ? undefined
                    : pageComponent => {
                        const {auth} = useAuth();
                        const theme_color =  auth?.sessions?.dark_theme ?? auth?.sessions?.theme_color;
                        const profile = auth?.sessions?.profile;
                        return (
                            <ThemeProvider themeColor={theme_color} profileData={profile}>
                                <Layout>{pageComponent}</Layout>
                            </ThemeProvider>
                        );
                    };

            return page;
        },
        setup({ el, App, props }) {
            const { auth } = props.initialPage.props;
            createRoot(el).render(
                <React.StrictMode>
                    <AuthProvider initialAuth={auth}>
                        <SidebarProvider>
                            <App {...props} />
                            <AppInitializer />
                        </SidebarProvider>
                    </AuthProvider>
                </React.StrictMode>
            );
        },
    });
});