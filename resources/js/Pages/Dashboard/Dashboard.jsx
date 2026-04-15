import React, { useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import StatCard from "../../Components/Dashboard/StatCard";
import ContentPanel from "../../Components/Table/ContentPanel";

const Dashboard = ({ customer, orders, devices, orders_count_wdate }) => {
    const { auth } = usePage().props;
    useEffect(() => {
        if (auth.user) {
            window.history.pushState(
                null,
                document.title,
                window.location.href
            );

            window.addEventListener("popstate", (event) => {
                window.history.pushState(
                    null,
                    document.title,
                    window.location.href
                );
            });
        }

    }, [auth.user]);
   
    return (
        <>
            <Head title="Dashboard" />
            <ContentPanel marginBottom={2}>
            <div className='rounded-lg mb-4'>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3">
                    {auth.access.isView && auth.access.isRead && 
                    <>
                        <StatCard
                            label='Request'
                            total={100}
                            gradient='linear-gradient(to bottom right, #134B70, #0891b2)'
                            value={100}
                            icon='<i class="fa fa-pie-chart"></i>'
                        />
                        <StatCard
                            label='Request'
                            total={100}
                            gradient='linear-gradient(to bottom right, #134B70, #0891b2)'
                            value={100}
                            icon='<i class="fa fa-pie-chart"></i>'
                        />
                        <StatCard
                            label='Request'
                            total={100}
                            gradient='linear-gradient(to bottom right, #134B70, #0891b2)'
                            value={100}
                            icon='<i class="fa fa-pie-chart"></i>'
                        />
                    </>
                    }
                </div>
            </div>
            </ContentPanel>
          
        </>
    );
};

export default Dashboard;
