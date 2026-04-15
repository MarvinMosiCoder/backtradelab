import React, { useEffect } from "react";
import { useAuth } from "./Context/AuthContext";
import NProgress from "nprogress";
import getAppLogo from "./Components/SystemSettings/ApplicationLogo";
import { router  } from "@inertiajs/react";

const AppInitializer = () => {
    const { auth } = useAuth();

    useEffect(() => {
        const initializeNProgress = async () => {
            const logoUrl = await getAppLogo();
            const themeColor = auth?.sessions?.dark_theme ?? auth?.sessions?.theme_color;

            NProgress.configure({
                showSpinner: false, 
                minimum: 0.2,
                speed: 300, 
                trickleSpeed: 50,
                parent: "#content-area", 
                template: `
                    <div class="nprogress-modal-overlay ${themeColor === 'skin-black' ? 'bg-black' : 'bg-white'}">
                        <div class="nprogress-custom-container">
                            <div class="nprogress-circle-loader-wrapper" id="nprogress">
                                <div class="nprogress-circle-loader"></div>
                                <div class="bar" role="bar" style="display: none;"></div>
                            </div>
                        </div>
                    </div>
                `,
            });

            // Attach router events for NProgress
            router.on("start", () => {
                if (!NProgress.isStarted()) {
                    NProgress.start();
                }
            });

            router.on("finish", (event) => {
                if (
                    event.detail.visit.completed ||
                    event.detail.visit.interrupted ||
                    event.detail.visit.cancelled
                ) {
                    NProgress.done();

                    setTimeout(() => {
                        document.querySelector(".nprogress-modal-overlay")?.remove();
                    }, 100);
                }
            });
        };

        initializeNProgress();
    }, [auth]);

    return null; // Initialization logic only; no UI rendering
};

export default AppInitializer;
