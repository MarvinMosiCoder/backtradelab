import React, { useContext, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ContentPanel from '../../Components/Table/ContentPanel';
import { NavbarContext } from '../../Context/NavbarContext';
import colorMap from '../../Components/Notification/ColorMap';

const NotificationsView = ({ page_title, notification }) => {
    const { setTitle } = useContext(NavbarContext);
    useEffect(() => {
        setTimeout(()=>{
            setTitle(page_title);
        });
    }, [page_title]);
    const getInitials = (fullName) => {
        const names = fullName.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        const initials = names[0].charAt(0) + names[names.length - 1].charAt(0);
        return initials.toUpperCase();
    };

    // Get the initial for the color mapping
    const initials = getInitials(notification.type);
    const backgroundColor = colorMap[initials.charAt(0)] || theme; 

    return (
    <>
        <Head title={page_title} />
        <ContentPanel>
            <div className='border-[1px] p-2 rounded-md'>
                <div className='flex p-2 gap-2 items-center'>
                    <div
                        className={`${backgroundColor} p-8 mt-2 cursor-pointer rounded-full w-[50px] h-[50px] flex items-center justify-center`}
                    >
                        <p className="text-white text-center">
                            {getInitials(notification.type)}
                        </p>
                    </div>
                    <p className='text-center'>
                        {notification.content}
                    </p>
                </div>
            </div>
        </ContentPanel>
    </>
    );
};

export default NotificationsView;
