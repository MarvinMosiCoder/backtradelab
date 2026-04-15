import React, { useContext, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import ContentPanel from '../../Components/Table/ContentPanel';
import { NavbarContext } from '../../Context/NavbarContext';
import colorMap from '../../Components/Notification/ColorMap';

const NotificationsViewAll = ({ page_title, notifications }) => {
    const { setTitle } = useContext(NavbarContext);

    useEffect(() => {
        setTitle(page_title);
    }, [page_title, setTitle]);

    const getInitials = (fullName = '') => {
        if (!fullName) return '';
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };
    console.log(notifications.length);
    return (
        <>
            <Head title={page_title} />
            <ContentPanel>
                {notifications && notifications.length > 0 ? (
                    notifications.map((item, index) => {
                        const initials = getInitials(item.type);
                        const backgroundColor = colorMap[initials.charAt(0)] || 'bg-gray-500'; // Fallback color

                        return (
                            <div className="border-[1px] p-2 m-1 rounded-md" key={index}>
                                <div className="flex p-2 gap-2 items-center">
                                    <div
                                        className={`${backgroundColor} p-8 mt-2 cursor-pointer rounded-full w-[50px] h-[50px] flex items-center justify-center`}
                                    >
                                        <p className="text-white text-center">{initials}</p>
                                    </div>
                                    <p className="text-center">{item.content}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500">No notifications available.</p>
                )}
            </ContentPanel>
        </>
    );
};

export default NotificationsViewAll;
