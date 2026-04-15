import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { NavbarContext } from '../../Context/NavbarContext';
import { useProfile, useTheme } from '../../Context/ThemeContext';
import Notification from '../../Components/Notification/Notification';
import Button from '../../Components/Table/Buttons/Button';
import colorMap from '../../Components/Notification/ColorMap';
import axios from 'axios';
import useThemeStyles from '../../Hooks/useThemeStyles';
import getAppName from '../../Components/SystemSettings/ApplicationName';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import Modal from '../../Components/Modal/Modal';
import useThemeSwalColor from '../../Hooks/useThemeSwalColor';
const AppNavbar = () => {
    const { title } = useContext(NavbarContext);
    const { auth } = usePage().props;
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(auth.notifications || []);
    const [unreadnNotifications, setUnreadnNotifications] = useState(auth.unread_notifications || false);
    const menuRef = useRef(null);
    const {theme, setTheme} = useTheme();
    const { profile } = useProfile();
    const { buttonSwalColor, bgColor, calendarDateTimeColor, textColor, textColorActive, borderColor, primayActiveColor } = useThemeStyles(theme);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDateTime, setShowDateTime] = useState(false);
    const [appname, setAppname] = useState('');
    const [applogo, setApplogo] = useState('');
    const [showModalTheme, setShowModalTheme] = useState(false);
    const swalColor = useThemeSwalColor(theme);
    useEffect(() => {
        getAppName().then(appName => {
            setAppname(appName);
        });
        getAppLogo().then(appLogo => {
            setApplogo(appLogo);
        });
    }, [getAppName, getAppLogo]);

    useEffect(() => {
        setNotifications(auth.notifications || []);
      }, [auth.notifications]);

    useEffect(() => {
        setUnreadnNotifications(auth.unread_notifications || false);
    }, [auth.unread_notifications]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        return () => clearInterval(interval); 
    }, []);

    
   
    const readNotification = async (e, id) => {
        try {
            await axios.post('/notifications/read', {
                notification_id: id,
            });
          
            setNotifications((prevNotifications) =>
                prevNotifications.map((notification) =>
                    notification.id === id ? { ...notification, is_read: true } : notification
                )
            );
            setUnreadnNotifications((prevCount) => Math.max(prevCount - 1, 0));
        } catch (error) {
            console.error('Failed to mark as read:', error.response?.data || error.message);
        }
    };    

    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setShowMenu(false);
            setShowNotifications(false);
            setShowDateTime(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        Swal.fire({
            title: `<p class="font-poppins text-3xl" >Do you want to Logout</p>`,
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            confirmButtonColor: buttonSwalColor,
            icon: 'question',
            iconColor: buttonSwalColor,
            reverseButtons: true,
        }).then(async (result) => {
            if (result.isConfirmed) {
                router.post('/logout');
            }
        });
    };

    const getInitials = (fullName) => {
        const names = fullName.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        const initials = names[0].charAt(0) + names[names.length - 1].charAt(0);
        return initials.toUpperCase();
    };

    const handleToggle = () => {
        setShowMenu(!showMenu);
        setShowNotifications(false);
        setShowDateTime(false);
    };

    const handleToggleNotification = () => {
        setShowNotifications(!showNotifications);
        setShowMenu(false);
        setShowDateTime(false);
    }

    const toggleDateTime= () => {
        setShowDateTime(!showDateTime);
        setShowNotifications(false);
        setShowMenu(false);
    }

    // Get the initial for the color mapping
    const initials = getInitials(auth.user.name);
    const backgroundColor = colorMap[initials.charAt(0)] || theme; 

    //DARK MODE
    const handleDarkMode = () => {
        setShowModalTheme(true)
    }
    const handleCloseModal = () => {
        setShowModalTheme(false);
    }
    const [formTheme, setFormTheme] = useState({
        theme: '',
    })
    function handleRadioInput(e) {
        const key = e.target.name;
        const value = e.target.value;
        setFormTheme((forms) => ({
            ...forms,
            [key]: value,
        }));
        if(value){
            setTheme(`bg-${value}`);
        }
    }

    const handleThemeUpdate = async (e, id, action) => {
        e.preventDefault();
        setLoading(true);
    
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };
    
            const response = await axios.post('/update-theme', formTheme, config);
            console.log(response.data.status)
            if (response.data.status === 'success') {
                Swal.fire({
                    type: response.data.status,
                    title: response.data.message,
                    icon: response.data.status,
                    confirmButtonColor: swalColor,
                }).then((result) => {
                    if (result.isConfirmed) {
                        setShowModalTheme(false);
                    }
                });
            } else {
                Swal.fire({
                    type: response.data.status,
                    title: response.data.message,
                    icon: response.data.status,
                    confirmButtonColor: swalColor,
                });
            }
        } catch (error) {
            Swal.fire({
                type: 'error',
                title: 'An error occurred while updating profile',
                icon: 'error',
                confirmButtonColor: swalColor,
            });
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
        <div className='flex flex-col lg:flex-row'>
            <div
                className={`${theme} md:hidden lg:hidden w-full h-[50px] lg:h-[60px] border-b-[1px] lg:w-[299px] ${
                    !['bg-skin-black'].includes(theme) ? 'border-gray-200' : 'border-gray-700'
                }`}
                ref={menuRef}
            >
                <Link href={`${window.location.origin}/dashboard`}>
                    <div className="flex gap-x-4 items-center justify-center lg:justify-start px-[20px] py-[10px] lg:py-[15px]">
                        {
                            applogo ? (
                                <img
                                    src={applogo}
                                    className="w-7 h-7 cursor-pointer duration-500"
                                    alt="App Logo"
                                />
                            ): (
                                <div className="flex justify-center items-center h-full">
                                    <div className="h-7 w-7 rounded-3xl bg-gray-100 animate-pulse" />
                                </div>
                            )
                        }
                        <div
                            className={`${
                            theme === 'bg-skin-black'
                                ? 'text-gray-300'
                                : theme === 'bg-skin-white'
                                ? textColor
                                : textColorActive
                            } font-medium`}
                        >
                            <p className="font-semibold text-[15px]">{appname}</p>
                        </div>
                    </div>
                </Link>
            </div>
            
            <div
                className={`${theme} w-full h-[60px] border-b-[1px] ${!['bg-skin-black'].includes(theme) ? 'border-gray-200' : 'border-gray-700'}  flex items-center justify-end px-5 py-7 select-none shodow-customLight`}
                ref={menuRef}
            >
             
                <Link href={`${window.location.origin}/dashboard`} className='mr-auto w-auto hidden md:block lg:block'>
                    <div className="flex gap-x-4 items-center justify-center lg:justify-start py-[10px] lg:py-[15px]">
                        {
                            applogo ? (
                                <img
                                    src={applogo}
                                    className="w-7 h-7 cursor-pointer duration-500"
                                    alt="App Logo"
                                />
                            ): (
                                <div className="flex justify-center items-center h-full">
                                    <div className="h-7 w-7 rounded-3xl bg-gray-200 animate-pulse" />
                                </div>
                            )
                        }
                        <div
                            className={`${
                            theme === 'bg-skin-black'
                                ? 'text-gray-300'
                                : theme === 'bg-skin-white'
                                ? textColor
                                : textColorActive
                            } font-medium`}
                        >
                            <p className="font-semibold text-[15px]">{appname}</p>
                        </div>
                    </div>
                </Link>
               
                <div className="flex items-center gap-4 pl-[16px] py-10">
                    <div className={`flex items-center justify-center space-x-2 
                            ${theme === 'bg-skin-white' ? `bg-skin-white-light` : calendarDateTimeColor} 
                            ${['bg-skin-white','bg-skin-blue','bg-skin-blue-light'].includes(theme) ? 'text-black' : 'text-white'} 
                            rounded-md px-[10px] py-[6px] lg:px-[20px] shodow-lg cursor-pointer lg:hidden`}
                            onClick={toggleDateTime}
                    >
                        <i className='fa fa-calendar-days text-2xl leading-none'></i>
                    </div>
                    <div className={`flex items-center justify-center space-x-2 
                            ${theme === 'bg-skin-white' ? `bg-skin-white-light` : calendarDateTimeColor} 
                            ${['bg-skin-white','bg-skin-blue','bg-skin-blue-light'].includes(theme) ? 'text-black' : 'text-white'} 
                            rounded-md px-[10px] py-[6px] lg:px-[25px] shodow-lg hidden lg:block`}
                            style={{width:'397px'}}
                    >
                        <i className='fa fa-calendar-days text-[20px] leading-none'></i>
                        <span className="text-sm font-sm leading-none">
                            {currentDate.toLocaleString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </span>
                    </div>
                    {
                        showDateTime && (
                            <div className='absolute z-90 right-1 top-[113px] md:lg:top-[65px] lg:top-[65px] bg-white p-3 rounded-[5px] pop-up-boxshadow z-[100] w-auto max-h-[390px]'>
                                <div className={`flex items-center justify-center space-x-2 
                                        ${theme === 'bg-skin-white' ? `bg-skin-white-light` : calendarDateTimeColor} 
                                        ${['bg-skin-white','bg-skin-blue','bg-skin-blue-light'].includes(theme) ? 'text-black' : textColor} 
                                        rounded-md px-[10px] py-[9px] lg:px-[20px] shodow-lg cursor-pointer`}
                                        onClick={toggleDateTime}
                                >
                                    <i className='fa fa-calendar-days text-2xl leading-none'></i>
                                    <span className="text-sm font-sm leading-none">
                                        {currentDate.toLocaleString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        
                        )
                    }
                    <div className="relative cursor-pointer" onClick={handleToggleNotification}>
                        <div
                            className={`flex items-center justify-center ${theme == 'bg-skin-white' ? bgColor : theme } p-3 rounded-full border-[2px] ${borderColor} w-10 h-10`}
                        >
                            <i className={`fa fa-bell ${ textColorActive } text-[19px]`}></i>
                            {
                                unreadnNotifications > 0 && (
                                    <div className={`absolute top-[15px] right-[16px] bg-red-500 ${ textColorActive } text-[10px] font-bold rounded-full w-3 h-3 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2`}>
                                        {unreadnNotifications}
                                    </div>
                                )
                            }
                            
                        </div>
                    </div>

                    {showNotifications && (
                        <div className={`absolute z-90 right-1 top-[113px] md:lg:top-[65px] lg:top-[65px] ${theme === 'bg-skin-black' ? 'bg-skin-black' : 'bg-white' }  py-3 rounded-[5px] pop-up-boxshadow z-[100] w-[332px] max-h-[390px]`}>
                            <div className="flex items-center gap-5 border-b-[1px] px-3 pb-2 min-w-75 w-[332px]">
                                <span className={`${ (!['bg-skin-black'].includes(theme) ? textColor : textColorActive) }`}><i className="fa fa-info-circle font-semibold"></i> Notifications</span>
                            </div>
                            <div className="mb-2">
                                <div className="max-h-[250px] overflow-y-auto overflow-x-hidden"> {/* Restrict height and enable scrolling */}
                                    {notifications.map(notification => (
                                        <Notification
                                            key={notification.id}
                                            id={notification.id}
                                            message={notification.content}
                                            type={notification.type}
                                            isRead={notification.is_read}
                                            onClick={readNotification}
                                            theme={theme}
                                            created={notification.created_at}
                                            themeColor={theme}
                                            textColorActive={textColorActive}
                                            textColorMain={textColor}
                                        />
                                    ))}
                                </div>
                                <div className="pl-2 mt-5 pr-2">
                                    <Button
                                        href="/notifications/view-all-notifications"
                                        type="link"
                                        extendClass={(theme === 'bg-skin-white' ? `bg-skin-white-hover` : theme) + ` px-[85px] w-full border-[1px] ${borderColor}`}
                                        fontColor="text-white"
                                    >
                                        View all notifications
                                    </Button>
                                </div>
                            </div>
                        </div>
                    
                    )}
                    
                    <div className={`flex items-center gap-4 border-l-[1px] pl-5 py-[8px] ${theme === 'bg-skin-black'?'border-gray-700':'border-gray-200'} cursor-pointer`} 
                        onClick={handleToggle}
                        style={{
                            zIndex: '999999999'
                        }}>
                        {(profile ?? auth.profile) ? (
                            <div
                                className={`w-11 h-11 border-2 border-gray-400 rounded-full overflow-hidden shadow-md`}
                            >
                                <img
                                    src={`/images/profile/`+(profile ?? auth.profile.file_name)}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div
                                className={`${backgroundColor} p-[20px] border-2 border-gray-300 cursor-pointer rounded-full w-[35px] h-[35px] flex items-center justify-center`}
                            >
                                <p className={`${(theme === 'bg-skin-white' ? textColor : textColorActive) } text-center text-[18px] m-0 p-0`}>
                                        {getInitials(auth.user.name)}
                                </p>
                            </div>
                        )}
                            <p className={`font-poppins ${(theme === 'bg-skin-white' ? textColor : textColorActive) } hidden lg:block`}>
                                <span className="font-poppins text-[15px]">{auth.user.name}</span>
                            </p>
                            <img
                                src="/images/navigation/arrow-down-white.png"
                                className={`w-3 ml-2 hidden  lg:block ${showMenu && "rotate-180"}`}
                            />
                        </div>
                    </div>
                        {showMenu && (
                            <div className={`absolute z-90 right-1 top-[113px] md:lg:top-[65px] lg:top-[65px] ${theme === 'bg-skin-black' ? 'bg-skin-black' : 'bg-white' } py-3 rounded-[5px] pop-up-boxshadow z-[100] w-[332px]`}
                            >
                                <div className="flex items-center justify-center gap-3 border-b-[1px] px-5 pb-2 ">
                                
                                    {(profile ?? auth.profile) ? (                   
                                        <img
                                            src={`/images/profile/`+(profile ?? auth.profile.file_name)}
                                            alt="User Avatar"
                                            className="w-20 h-20 border-2 border-gray-400 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div
                                            className={`${backgroundColor} p-[32px] cursor-pointer rounded-full border-2 border-gray-300  w-[40px] h-[40px] flex items-center justify-center`}
                                        >
                                            <p className={`${(theme === 'bg-skin-white' ? textColor : textColorActive) } text-center text-[30px] m-0 p-0`}>
                                                    {getInitials(auth.user.name)}
                                            </p>
                                        </div>
                                    )}
                                    <p className={`font-poppins ${!['bg-skin-black'].includes(theme) ? textColor : textColorActive}`}>
                                        <span className="font-semibold text-[15px]">{auth.user.name}</span>
                                        <span className="text-[13px]"> {auth.user.email}</span>
                                    </p>
                                    
                                </div>
                                <Link
                                    href="/profile"
                                    className={`px-5 py-2 flex items-center cursor-pointer ${!['bg-skin-black'].includes(theme) ? textColor : textColorActive}`}
                                    onClick={() => {
                                        setShowMenu(false);
                                    }}
                                >
                                    <i className='fa fa-id-card-alt p-2 bg-gray-300 rounded-md hover:bg-gray-400 text-black'></i>
                                    <span className="font-poppins text-[16px] ml-2">
                                        Profile
                                    </span>
                                </Link>
                                <Link
                                    href="/change_password"
                                    className={`border-t-[1px]  px-5 py-2 flex items-center cursor-pointer ${!['bg-skin-black'].includes(theme) ? textColor : textColorActive}`}
                                    onClick={() => {
                                        setShowMenu(false);
                                    }}
                                >
                                    <i className='fa fa-user-lock py-2 px-[7px] bg-orange-400 rounded-md hover:bg-orange-700 text-white'></i>
                                    <span className="font-poppins ml-2">
                                        Change password
                                    </span>
                                </Link>
                                <div className={`border-t-[1px] px-5 py-2 flex items-center cursor-pointer 
                                    ${!['bg-skin-black'].includes(theme) ? textColor : textColorActive}`}
                                    onClick={handleDarkMode}
                                    >
                                    <i className='fa fa-moon p-2 bg-gray-300 rounded-md hover:bg-gray-400 text-black'></i>
                                    <span className="font-poppins text-[16px] ml-2">
                                        Dark mode
                                    </span>
                                </div>
                                <div
                                    onClick={handleLogout}
                                >
                                    <div className={`border-t-[1px] px-5 py-2 flex items-center cursor-pointer ${!['bg-skin-black'].includes(theme) ? textColor : textColorActive}`}>
                                        <i className='fa fa-power-off py-2 px-[9px] bg-red-500 hover:bg-red-700 rounded-md text-white'></i>
                                        <span className="font-poppins ml-2">Logout</span>
                                    </div>
                                </div>
                            </div>
                        )}
            </div>
        </div>
        <Modal
            show={showModalTheme}
            onClose={handleCloseModal}
            title="Theme"
            width="xl"
            fontColor={textColorActive}
            icon='fa fa-moon'
            btnIcon='fa fa-refresh'
            withButton='true'
            onClick={handleThemeUpdate}
        >  
            <form>
                <div className="p-2">
                    <div className="space-y-2">
                        <label className="flex items-center justify-between space-x-2">
                            <span className={`${textColor}`}>Dark mode</span>
                            <input
                                type="radio"
                                name="theme"
                                value="skin-black"
                                onChange={handleRadioInput}
                                className="form-radio h-5 w-5 text-blue-600 ml-auto"
                            />
                        </label>
                        <label className="flex items-center justify-between space-x-2">
                            <span className={`${textColor}`}>Light mode</span>
                            <input
                                type="radio"
                                name="theme"
                                value="skin-white"
                                onChange={handleRadioInput}
                                className="form-radio h-5 w-5 text-blue-600 ml-auto"
                            />
                        </label>
                        <label className="flex items-center justify-between space-x-2">
                            <span className={`${textColor}`}>System default</span>
                            <input
                                type="radio"
                                name="theme"
                                value={auth.sessions.theme_color}
                                onChange={handleRadioInput}
                                className="form-radio h-5 w-5 text-blue-600 ml-auto"
                            />
                        </label>
                    </div>
                </div>
            </form>
        </Modal>            
        </>
    );
};

export default AppNavbar;
