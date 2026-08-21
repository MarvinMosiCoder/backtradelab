import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp, router  } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import Swal from "sweetalert2";
import Layout from "@/Layouts/layout/layout.jsx";
import CookieNotice from "./Components/Privacy/CookieNotice";
import { ThemeProvider } from "./Context/ThemeContext";
import { AuthProvider, useAuth } from "./Context/AuthContext";
import getAppName from './Components/SystemSettings/ApplicationName';
import AppInitializer from "./AppInitializer";
import '../css/nprogress-custom.css';
import { SidebarProvider } from './Context/SidebarContext';
import '@fontsource/poppins/latin-300-italic.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'sweetalert2/dist/sweetalert2.min.css';

globalThis.Swal = Swal;

getAppName().then(appName => {
    createInertiaApp({
        title: title => `${appName} | ${title ? `${title}` : 'System'}`,
        // Inertia's built-in progress indicator is disabled: AppInitializer.jsx
        // already wires router start/finish events to a brand-colored NProgress
        // bar (nprogress-custom.css). Leaving both enabled means two competing
        // #nprogress stylesheets fight over the same bar.
        progress: false,
        resolve: name =>
            resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob("./Pages/**/*.jsx")).then(page => {
                // `layout` must always be a function, never `undefined` — Inertia's
                // persistent App wrapper calls Component.layout(page) inline as part
                // of its own render, so a hook called only on some pages' layout
                // (useAuth below) changes that shared component's hook count across
                // navigations and trips React's rules-of-hooks. Branch after the hook,
                // not by omitting the function.
                const isBareLayout = name.startsWith("Auth/") || name.startsWith("Public/");
                page.default.layout = pageComponent => {
                    const {auth} = useAuth();
                    if (isBareLayout) return pageComponent;
                    const theme_color = auth?.sessions?.dark_theme ?? auth?.sessions?.theme_color;
                    const profile = auth?.sessions?.profile;
                    return (
                        <ThemeProvider themeColor={theme_color} profileData={profile}>
                            <Layout>{pageComponent}</Layout>
                        </ThemeProvider>
                    );
                };

                return page;
            }),
        setup({ el, App, props }) {
            const { auth } = props.initialPage.props;
            createRoot(el).render(
                <React.StrictMode>
                    <AuthProvider initialAuth={auth}>
                        <SidebarProvider>
                            <App {...props} />
                            <AppInitializer />
                            <CookieNotice />
                        </SidebarProvider>
                    </AuthProvider>
                </React.StrictMode>
            );
        },
    });
});
