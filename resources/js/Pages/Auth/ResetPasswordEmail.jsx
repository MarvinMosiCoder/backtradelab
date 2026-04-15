import React, { useEffect, useState } from 'react';
import InputWithLogo from '../../Components/Forms/InputWithLogo';
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import getAppName from '../../Components/SystemSettings/ApplicationName';
import getAppLogo from '../../Components/SystemSettings/ApplicationLogo';
import LoginDetails from '../../Components/SystemSettings/LoginDetails';
import { useToast } from '../../Context/ToastContext';
import InputComponentPassword from '../../Components/Forms/InputPassword';
import TableButton from '../../Components/Table/Buttons/TableButton';

const ResetPasswordEmail = ({ email }) => {
    const [loading, setLoading] = useState(false);
    const [isDisabled, setIsDisabled] = useState(true);
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [isExistPassword, setIsExistPassword] = useState([]);
    const [forms, setForms] = useState({
        email: email || "",
        new_password: '',
        confirm_password: ''
    });
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

    const [isVerified, setIsVerified] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [activeText, setActiveText] = useState({
        Uppercase: false,
        Length: false,
        Number: false,
        Character: false
    });

    // Check if the passwords match and validate form
    useEffect(() => {
        validateInputs();
    }, [forms]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForms(prevForms => ({
            ...prevForms,
            [name]: value
        }));
    };

    // Validate inputs for password match and required fields
    const validateInputs = () => {
        let isValid = true;

        const textActive = checkPasswordTextActive(forms.new_password);

        setActiveText({
            Uppercase: textActive.includes('Uppercase'),
            Length: textActive.includes('Length'),
            Number: textActive.includes('Number'),
            Character: textActive.includes('Character')
        });
        
        const passwordChecks = {
            weak: false,
            strong: false,
            excellent: false
        };

        // Check password length, case, digits, and special characters independently
        if (forms.new_password) {
            // Check criteria for Weak
            if (forms.new_password.length > 0 && forms.new_password.length < 6) {
                passwordChecks.weak = true;
            }

            // Check criteria for Strong
            const hasLowerCase = /[a-z]/.test(forms.new_password);
            const hasNumber = /\d/.test(forms.new_password);
            if (forms.new_password.length >= 6 && hasLowerCase && hasNumber) {
                passwordChecks.strong = true;
            }

            // Check criteria for Excellent
            const hasUpperCase = /[A-Z]/.test(forms.new_password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>;]/.test(forms.new_password);
            if (forms.new_password.length >= 8 && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
                passwordChecks.excellent = true;
            }
            passwordChecks.weak = true;
        }

        // Now update `isExistPassword` based on the passwordChecks object
        setIsExistPassword(() => {
            const updatedPasswordStates = [];
            if (passwordChecks.weak) {
                updatedPasswordStates.push('Weak');
            }
            if (passwordChecks.strong) {
                updatedPasswordStates.push('Strong');
            }
            if (passwordChecks.excellent) {
                updatedPasswordStates.push('Excellent');
            }
            return updatedPasswordStates;
        });

        // Ensure "Submit" is only enabled if password is "Excellent"
        if (!passwordChecks.excellent) {
            isValid = false;
        }

        if (forms.new_password !== forms.confirm_password) {
            setPasswordMismatch(true);
            isValid = false;
        } else {
            setPasswordMismatch(false);
        }

        // Check if any form field is empty
        Object.values(forms).forEach(val => {
            if (!val) {
                isValid = false;
            }
        });

        setIsDisabled(!isValid);
    };

    const checkPasswordTextActive = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>;]/.test(password);

        const allCharacters = [];

        if (hasUpperCase) allCharacters.push('Uppercase');
        if (password.length >= 8) allCharacters.push('Length');
        if (hasNumber) allCharacters.push('Number');
        if (hasSpecialChar) allCharacters.push('Character');

        return allCharacters;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
   
        setLoading(true);
        try {
            const response = await axios.post(
                '/send_resetpass_email/reset',
                forms
            );
            if (response.data.status == 'success') {
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
                    title: 'Password Reset Successful!',
                }).then(() => {
                    router.visit('/login');
                });
            } else {
                const Toast = Swal.mixin({
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    },
                });
                Toast.fire({
                    icon: 'error',
                    title: 'Request expired, please request another one',
                });
            }
        } catch (error) {
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
                icon: 'error',
                title: 'An error occurred. Please try again.',
            });
        } finally {
            setLoading(false);
        }
        
    };

    return (
        <div className={`${loginBgColor} h-screen flex flex-col items-center justify-center p-5`}>
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
                <p className="p-4 border-b-2 text-center font-bold">
                   <i className='fa fa-lock'></i> Reset Password
                </p>
                <form
                    onSubmit={handleSubmit}
                    className="flex justify-center my-8 font-poppins gap-x-16 gap-y-5 items-center flex-wrap m-5"
                >
                    <div className="w-full">
                        <div className="flex flex-col mb-3 w-full">
                            <InputComponentPassword   
                                name="new_password"
                                value={forms.new_password}
                                onChange={handleChange}
                                placeholder="Enter New Password"
                                logo="images/login-page/password-icon.png"
                            />
                            <div className="flex items-center justify-between w-full p-1 bg-white border border-gray-300 rounded-lg mt-1">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center w-1/3 p-2">
                                    <div className={isExistPassword.includes('Weak') ? `w-full h-1 bg-red-600` : `w-full h-1 bg-gray-200`}></div>
                                    <div className="flex items-center mt-2 space-x-2">
                                        <span className={isExistPassword.includes('Weak')  ? `text-sm text-red-600` : `text-sm text-gray-400`}>Weak</span>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex flex-col items-center w-1/3 p-2">
                                    <div className={isExistPassword.includes('Strong') ? `w-full h-1 bg-orange-600` : `w-full h-1 bg-gray-200`}></div>
                                    <div className="flex items-center mt-2 space-x-2">
                                        <span className={isExistPassword.includes('Strong') ? `text-sm text-orange-600` : `text-sm text-gray-400`}>Strong</span>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex flex-col items-center w-1/3 p-2">
                                    <div className={isExistPassword.includes('Excellent') ? `w-full h-1 bg-green-600` : `w-full h-1 bg-gray-200`}></div>
                                    <div className="flex items-center mt-2 space-x-2">
                                    <span className={isExistPassword.includes('Excellent') ? `text-sm text-green-600` : `text-sm text-gray-400`}>Excellent</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="password-criteria mb-2">
                            <p id="textUppercase" className={activeText.Uppercase ? 'text-green-600 text-sm' : 'text-sm text-gray-500'}>Password contains an uppercase letter</p>
                            <p id="textLength" className={activeText.Length ? 'text-green-600 text-sm' : 'text-sm text-gray-500'}>Password is at least 8 characters long</p>
                            <p id="textNumber" className={activeText.Number ? 'text-green-600 text-sm' : 'text-sm text-gray-500'}>Password contains a number</p>
                            <p id="textChar" className={activeText.Character ? 'text-green-600 text-sm' : 'text-sm text-gray-500'}>Password contains a special character</p>
                        </div>
                        <div className="flex flex-col mb-3 w-full">
                            <InputComponentPassword   
                                name="confirm_password"
                                value={forms.confirm_password}
                                onChange={handleChange}
                                placeholder="Confirm New Password"
                                logo="images/login-page/password-icon.png"
                            />
                        </div>
                        {passwordMismatch && (
                            <div id="pass_not_match" className="text-red-600">
                            <i className='fa fa-warning'></i> Passwords do not match.
                            </div>
                        )}
    
                        <div className="flex justify-end">
                            <TableButton 
                                disabled={isDisabled} 
                                fontColor='text-white'
                                extendClass='bg-blue-700'
                                type="submit"
                            >
                                <i className='fa fa-key'></i> {loading ? "Changing..." : "Change password"}
                            </TableButton>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordEmail;
