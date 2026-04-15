import React from 'react';
import colorMap from './ColorMap';
import { Link } from '@inertiajs/react';

const Notification = ({ id, message, type, onClick, isRead, url, theme, created, themeColor, textColorActive,textColorMain }) => {

    if (!message) return null;
    const getInitials = (fullName) => {
        const names = fullName.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        const initials = names[0].charAt(0) + names[names.length - 1].charAt(0);
        return initials.toUpperCase();
    };

    // Get the initial for the color mapping
    const initials = getInitials(type);
    const backgroundColor = colorMap[initials.charAt(0)] || theme; 

    const timeDifference = (timestamp) => {
        const now = new Date(); // Current time
        const date = new Date(timestamp); // Given timestamp
        const differenceInSeconds = Math.floor((now - date) / 1000); // Difference in seconds
      
        if (differenceInSeconds < 60) {
          return `${differenceInSeconds}s`; // seconds
        } else if (differenceInSeconds < 3600) {
          return `${Math.floor(differenceInSeconds / 60)}m`; // minutes
        } else if (differenceInSeconds < 86400) {
          return `${Math.floor(differenceInSeconds / 3600)}h`; // hours
        } else {
          return `${Math.floor(differenceInSeconds / 86400)}d`; // days
        }
    };

  return (
    <Link  href={`/notifications/view-notification/${id}`} className={`hover:bg-gray-200 ${isRead ? `text-gray-400` : (!['bg-skin-black'].includes(themeColor) ? textColorMain : textColorActive) } rounded-md ${type}`}>
    {
        id ?
        <div className='flex p-2 pl-5 gap-2 items-center border-b-[1px] w-[332px] hover:bg-gray-100' onClick={(e) => onClick(e, id, url)}>
            <div
                className={`${backgroundColor} p-8 mt-2 cursor-pointer rounded-full w-[30px] h-[30px] flex items-center justify-center`}
            >
                <p className={`${(!['bg-skin-black'].includes(themeColor) ? textColorMain : textColorActive)} text-[30px] text-center`}>
                    {getInitials(type)}
                </p>
            </div>
            <div className='text-left text-[14px] mt-1 flex flex-col'>
                <span>{message}</span>
                <span className='text-gray-400 text-[14px]'>
                    {timeDifference(created)}
                </span>
            </div>
            <span className={`pl-[1px] text-lg ${isRead === 1 ? `text-gray-400` : `text-green-500`}`}>
                <li></li>
            </span>
        </div>
        :
        <div><i className='fa fa-warning'></i> No notifications available</div>
    }
    
    </Link>
  );
};

export default Notification;
