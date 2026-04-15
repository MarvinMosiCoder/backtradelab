import React, { useState, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { useAuth } from '../../Context/AuthContext';
import getAppName from '../../Components/SystemSettings/ApplicationName';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import LoginDetails from '../../Components/SystemSettings/LoginDetails';

import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import '../../../css/swiper.css';

const LoginLoaderOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-sky-700 dot-1" />
        <span className="h-3 w-3 rounded-full bg-sky-800 dot-2" />
        <span className="h-3 w-3 rounded-full bg-sky-700 dot-3" />
      </div>
    </div>
  );
};

const LoginPage = () => {
    const { errors:initialErrors, auth  } = usePage().props;
    const [errors, setErrors] = useState(initialErrors || {});
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { updateAuth } = useAuth();
    const [appname, setAppname] = useState('');
    const [loginBgColor, setLoginBgColor] = useState('');
    const [lfc, setLfc] = useState('');
    const [lbi, setLbi] = useState('');
    const [applogo, setApplogo] = useState('');

    const sliderSettings = {
        dots: false,
        arrows: false,
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        speed: 1000,
        autoplaySpeed: 10000
    };
    
    useEffect(()=>{
        getAppName().then(appName => {
            setAppname(appName);
        });
        getAppLogo().then(appLogo => {
            setApplogo(appLogo);
        });
        LoginDetails().then(detail => {
            setLoginBgColor(detail.login_bg_color);
            setLfc(detail.login_font_color);
            setLbi(detail.login_bg_image);
 
        });
    },[LoginDetails]);
   
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            const timer = setTimeout(() => {
                setErrors({});
            }, 5000); // Clear errors after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [errors]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        router.post(
            'login-save',
            {
                email,
                password,
            },
            {
                 onSuccess: (page) => {
                    const newAuthState = page.props.auth;
                    updateAuth(newAuthState);
                },
                onError: (newErrors) => {
                    if (newErrors.email) {
                        setEmail('');
                    }
                    if (newErrors.password) {
                        setPassword('');
                    }
                    setErrors(newErrors);
                },
                onFinish: () => setLoading(false),
            }
        );
    };

    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <>
        {loading && <LoginLoaderOverlay />}
        <div className="flex h-full w-full justify-center items-center min-h-screen">
            <div className={`h-lvh w-[40%] hidden justify-center items-center ${loginBgColor ?? 'bg-skin-blue'} md:block`}>
                { 
                 (applogo) ? 
                    (
                        <Slider className="h-[740px]" {...sliderSettings}>
                            <div className="flex justify-center items-center mt-26">
                                <img
                                    src={applogo ?? `/images/settings/vram-logo/vram-logo.webp`}
                                    className={`rounded-3xl p-5 h-[400px] w-[400px] mt-[190px] ml-[130px]`}
                                />
                            </div>
                            <div className="flex justify-center items-center  mt-25">
                                <img
                                    src={lbi ?? `/images/settings/vram-logo/eat-sleep-code.png`}
                                    className={`rounded-3xl p-5 mt-[170px]`}
                                />
                            </div>                               
                        </Slider>
                    ):(
                        <div className="flex justify-center items-center h-full">
                            <div className="h-[400px] w-[400px] rounded-3xl bg-gray-200 animate-pulse" />
                        </div>
                    ) 
                }
            </div>
            <div className={`h-lvh md:w-[60%] w-[100%]  bg-slate-100 p-2 flex items-center justify-center`}>
                <div className={`w-full lg:w-[45%] bg-white p-5 rounded-lg lg:bg-slate-100`}>
                    <div className="flex flex-row gap-2 item-center justify-center mb-7">
                        {
                            applogo ? (
                                <img
                                    src={applogo}
                                    className={`h-[50px] w-[50px]`}
                                /> 
                            ) : (
                                <div className="flex justify-center items-center h-full">
                                    <div className="h-[50px] w-[50px] rounded-md bg-gray-200 animate-pulse" />
                                </div>
                            )
                        }
                        
                        <div className="h-[50px] w-[1.5px] bg-black"></div>
                        <p className="text-black font-poppins font-bold text-[20px] mt-3 text-center">
                            {appname}
                        </p>
                    </div>
                    <div className="font-poppins font-semibold text-[20px] mb-3">
                        Log In
                    </div>
                    <form onSubmit={handleSubmit}>
                        {/* EMAIL */}
                        <div className="flex flex-col mb-4 w-full">
                            <label className="font-poppins font-semibold">
                                Email
                            </label>
                            <div className="border-2 border-black rounded-[10px] overflow-hidden flex items-center">
                                <div className="border-r-2 h-full p-[10px] border-black">
                                    <img
                                        src="/images/login-page/email-icon.png"
                                        className="w-[22px] h-[22px]"
                                    />
                                </div>
                                <input
                                    className="flex-1 mx-2 outline-none bg-white lg:bg-slate-100"
                                    type="email"
                                    value={email}
                                    placeholder="Enter Email"
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                />
                            </div>
                            {errors.email && (
                                <span className="text-red-600">
                                    <i className="fa fa-warning"></i>  {errors.email}
                                </span>
                            )}
                        </div>
                        {/* PASSWORD */}
                        <div className="flex flex-col mb-2 relative w-full">
                            <label className="font-poppins font-semibold">
                                Password
                            </label>
                            <div className="border-2 border-black rounded-[10px] overflow-hidden flex items-center">
                                <div className="border-r-2 h-full p-[10px] border-black">
                                    <img
                                        src="/images/login-page/password-icon.png"
                                        className="w-[22px] h-[22px]"
                                    />
                                </div>
                                
                                <input
                                    className="flex-1 mx-2 outline-none bg-white lg:bg-slate-100"
                                    type={`${showPassword ? 'text' : 'password'}`}
                                    value={password}
                                    placeholder="Enter Password"
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                                <div className="h-full p-[10px] border-black"
                                     onClick={togglePasswordVisibility}
                                >
                                   <i className={`text-gray-800 ${showPassword ? 'fa fa-eye-slash' : 'fa fa-eye'}`}></i>
                                </div>
                            </div>

                            {errors.password && (
                                <span className="text-red-600 mt-1">
                                    <i className="fa fa-warning"></i> {errors.password}
                                </span>
                            )}
                            {errors.message && (
                                <span className="text-red-600 mt-1">
                                    <i className="fa fa-warning"></i> {errors.message}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`${lfc ?? 'bg-skin-blue'} w-full text-white font-poppins p-[12px] font-bold rounded-[10px] mt-5 hover:opacity-70`}
                        >
                            {loading ? (
                                "Logging in, Please wait..."
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>

                    <div className="font-poppins flex space-x-1 text-sm justify-center mt-8">
                        <p>Forgot Password?</p>{" "}
                        <Link
                            href="reset_password"
                            className="text-red-500 font-bold"
                        >
                            Click here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default LoginPage;
