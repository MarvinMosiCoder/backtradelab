import React from "react";
import ContentPanel from "../Table/ContentPanel";
import { Link } from "@inertiajs/react";
import { useTheme } from "../../Context/ThemeContext";

const DashboardOverviewCard = ({ title, data, src, url }) => {
    const {theme} = useTheme();
    return (
        <Link
            href={url}
            className={`flex p-5 w-full ${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} border rounded-lg border-gray-400 shadow-custom font-poppins flex-wrap-reverse gap-y-1 justify-center`}
        >
            <div className="flex flex-col justify-center flex-1 gap-y-2">
                <p className={`text-sm font-bold ${theme === 'bg-skin-black' ? ' text-gray-400' : 'text-gray-600'} `}>{title}</p>
                <p className="font-extrabold text-sm md:text-[30px] ">{data}</p>
            </div>
            <div className={`flex ${theme} p-3 md:p-5 rounded-lg items-center`}>
                <img src={src} className="h-4 w-4 md:w-6 md:h-6" />
            </div>
        </Link>
    );
};

const Overview = ({ customer, orders }) => {
    const {theme} = useTheme();
    return (
        <>
            <ContentPanel marginBottom={2}>
                <p className={`font-extrabold font-poppins mb-3 ${theme === 'bg-skin-black' ? ' text-gray-400' : 'text-gray-600'} `}>Overview</p>
                <div className="flex flex-col md:flex-row gap-2 justify-center md:justify-start">
                    <DashboardOverviewCard
                        title="Dashboard 1"
                        data={customer}
                        src={"images/navigation/user-management-icon.png"}
                        url={"/customer"}
                    />
                    <DashboardOverviewCard
                        title="Dashboard 2"
                        data={orders}
                        src={"images/navigation/order-icon.png"}
                        url={"/list_of_orders"}
                    />
                    <DashboardOverviewCard
                        title="Dashboard 3"
                        data={orders}
                        src={"images/navigation/order-icon.png"}
                        url={"/list_of_orders"}
                    />
                    
                </div>
            </ContentPanel>
        </>
    );
};

export default Overview;
