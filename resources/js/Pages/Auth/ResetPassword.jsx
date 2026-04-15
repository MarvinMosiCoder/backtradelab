import React, { useState, useEffect } from 'react';
import InputWithLogo from '../../Components/Forms/InputWithLogo';
import { router, useForm } from '@inertiajs/react';
import getAppName from '../../Components/SystemSettings/ApplicationName';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import LoginDetails from '../../Components/SystemSettings/LoginDetails';
const ResetPassword = () => {
    const [appname, setAppname] = useState('');
    const [loginBgColor, setLoginBgColor] = useState('');
    const [lfc, setLfc] = useState('');
    const [lbi, setLbi] = useState('');
    const [applogo, setApplogo] = useState('');

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

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/send_resetpass_email', {
            onSuccess: () => {
                reset();
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    },
                });
                Toast.fire({
                    icon: 'success',
                    title: 'Email sent, Please check your email',
                }).then(() => {
                    router.visit('/login');
                });
            },
        });
    };

    return (
        <div className={`${loginBgColor ?? 'bg-skin-blue'} h-screen flex flex-col items-center justify-center p-5`}>
            <div className="flex flex-col justify-center items-center space-y-1 mb-5">
                <div className="flex">
                    <img
                        src={applogo}
                        className="w-[63px] h-63px] rounded-full"
                    />
                    <div className="h-[57px] w-[2px] bg-white ml-[9px] mr-[10px]"></div>
                    <p className="text-white font-poppins font-bold text-[20px] mt-4 text-center">
                        {appname}
                    </p>
                </div>
               
            </div>
            <div className="bg-white rounded-lg max-w-lg w-full font-poppins">
                <p className="p-4 border-b-2 text-center text-lg font-bold">
                   <i className='fa fa-key'></i> Forgot Password
                </p>
                <form className="py-2 px-5" onSubmit={handleSubmit}>
                    <p className="text-red-500 my-2 text-sm">
                        *will send instructions by your email
                    </p>
                    <InputWithLogo
                        label="Enter your Email"
                        name="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        logo="images/login-page/email-icon.png"
                        placeholder="Enter Email"
                        marginTop={2}
                    />
                    {errors.email && (
                        <div className="text-red-500 font-base mt-2">
                            {errors.email}
                        </div>
                    )}
                    <button
                        type="submit"
                        className={`${lfc} w-full text-white font-poppins  py-3 text-sm font-bold rounded-md my-4 hover:opacity-70`}
                        disabled={processing}
                    >
                        {processing ? "Sending..." : "Send"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
