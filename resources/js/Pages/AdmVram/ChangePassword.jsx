import React, { useContext, useEffect, useState } from 'react';
import AppContent from '../../Layouts/layout/AppContent';
import ContentPanel from '../../Components/Table/ContentPanel';
import { Head, Link, router, usePage } from '@inertiajs/react';
import InputWithLogo from '../../Components/Forms/InputWithLogo';
import TableButton from '../../Components/Table/Buttons/TableButton';
import axios from 'axios';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import useSwalColor from "../../Hooks/useThemeSwalColor";
import useThemeSwalColor from '../../Hooks/useThemeSwalColor';
import InputComponentPassword from '../../Components/Forms/InputPassword';
import { NavbarContext } from '../../Context/NavbarContext';
import useThemeStyles from '../../Hooks/useThemeStyles';
const ChangePassword = () => {
    const { auth, csrf_token } = usePage().props;
    const {theme} = useTheme();
    const { textColor, primayActiveColor } = useThemeStyles(theme);
    const { handleToast } = useToast();
    const swalColor = useThemeSwalColor(theme);
    const { setTitle } = useContext(NavbarContext);
    const [showModal, setShowModal] = useState(false);
    const [isDisabled, setIsDisabled] = useState(true);
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [isExistPassword, setIsExistPassword] = useState([]);
    const [loading, setLoading] = useState(false);
    const [forms, setForms] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [isVerified, setIsVerified] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [activeText, setActiveText] = useState({
        Uppercase: false,
        Length: false,
        Number: false,
        Character: false
    });

    const [isPasswordQwerty, setIsPasswordQwerty] = useState(false);
    const [checkCountWaive, setCheckCountWaive] = useState(false);
    useEffect(() => {
        setTimeout(()=>{
            setTitle("Change Password");
        },5);
    }, []);
    useEffect(() => {
        const checkPassword = async () => {
            try {
            // Replace this URL with your actual API endpoint
            const response = await axios.post('/check-password', {
                current_password: 'qwerty', // This is the plain-text password to check
            });
            // Assuming your API returns a boolean indicating if the password is correct
            setIsPasswordQwerty(response.data.success);
            } catch (error) {
                handleToast('An error occurred while connecting server', 'error');
            }
        };
        checkPassword();
    }, []);
    // Check if the passwords match and validate form
    useEffect(() => {
        validateInputs();
    }, [forms]);

    // Show modal when user needs to change password
    useEffect(() => {
        if (auth.check_user) {
            setShowModal(true);
        }
    }, [auth.check_user]);

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
        // Proceed with password change if the current password is verified
        if (isDisabled) return; // Check if the form is disabled
        setLoading(true);
        try {
            const response = await axios.post('/save-change-password', {
                current_password: forms.current_password,
                new_password: forms.new_password,
                confirm_password: forms.confirm_password
            });

            if (response.data.status === 'success') {
                Swal.fire({
                    type: response.data.status,
                    title: response.data.message,
                    icon: response.data.status,
                    confirmButtonColor: swalColor,
                }).then((result) => {
                    if (result.isConfirmed) {
                        setShowModal(false);
                        setTimeout(() => router.post('logout'), 3000);
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
                title: 'An error occurred while changing the password',
                icon: 'error',
                confirmButtonColor: swalColor,
            });
        } finally {
            setLoading(false);
        }
       
    };

    return (
        <>
            <Head title="Change Password" />
                <ContentPanel>
                    <Link
                        href="dashboard"
                        className="font-poppins text-red-500 font-semibold"
                    >
                        Go to Dashboard
                    </Link>
                    <form
                        onSubmit={handleSubmit}
                        className="flex justify-center my-8 font-poppins gap-x-16 gap-y-5 items-center flex-wrap m-5"
                    >
                        <img
                            src="images/others/changepass-image.png"
                            className="w-80"
                        />
                        <div className="max-w-md">
                            <p className={`mb-5 ${theme === 'bg-skin-black' ? ' text-gray-300' : ''}`}>
                                If you wish to change the account password,
                                kindly fill in the current password, new
                                password, and re-type new password.
                            </p>

                            <div className="flex flex-col mb-3 w-full">
                                <InputComponentPassword   
                                    name="current_password"
                                    value={forms.current_password}
                                    onChange={handleChange}
                                    placeholder="Enter Current Password"
                                    logo="images/login-page/password-icon.png"
                                    // onBlur={verifyCurrentPassword} // Trigger verification when the input loses focus
                                />
                                {verificationError && (
                                    <div className="text-red-600">
                                        <i className="fa fa-warning"></i> {verificationError}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col mb-3 w-full">
                                <InputComponentPassword   
                                    name="new_password"
                                    value={forms.new_password}
                                    onChange={handleChange}
                                    placeholder="Enter New Password"
                                    logo="images/login-page/password-icon.png"
                                />
                                <div className={`flex items-center justify-between w-full p-1 ${theme === 'bg-skin-black' ? theme+' text-gray-300' : 'bg-white'} border border-gray-300 rounded-lg mt-1`}>
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
                                    fontColor={theme === 'bg-skin-white' ? 'text-white' : textColor} 
                                    extendClass={theme === 'bg-skin-white' ? primayActiveColor : theme} 
                                    type="submit"
                                >
                                   <i className='fa fa-key'></i> {loading ? "Changing..." : "Change password"}
                                </TableButton>
                            </div>
                        </div>
                    </form>
                </ContentPanel>
        </>
    );
};

export default ChangePassword;
