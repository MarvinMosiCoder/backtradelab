import { useForm } from '@inertiajs/react';
import React, { useEffect, useState, useContext } from 'react'
import DropdownSelect from '../../Components/Dropdown/Dropdown';
import InputComponent from '../../Components/Forms/Input';
import Button from '../../Components/Table/Buttons/Button';
import { useTheme } from '../../Context/ThemeContext';
import { useToast } from '../../Context/ToastContext';
import Status from './Status';
import axios from 'axios';
import useThemeStyles from '../../Hooks/useThemeStyles';
const UsersForm = ({action, onClose, options, user}) => {
    const {theme} = useTheme();
    const { handleToast } = useToast();
    const [errors, setErrors] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [clearErrors, setClearErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const selectedOption = options.privileges.find(option => option.id === user?.id_adm_privileges);
    const selectedStatusOption = Status.find(option => option.id === user?.status);
    const { textColor, primayActiveColor, textColorActive, whiteBgCoror, bgColor } = useThemeStyles(theme);

    const [forms, setforms] = useState({
        u_id: user?.id || '',
        name: user?.name || '',
        email: user?.email || '',
        privilege_id: user?.id_adm_privileges || '',
        password: '',
        status: user?.status || '',
    });
    console.log(user);
    function handleChange(e) {
        const key = e.name ? e.name : e.target.name;
        const value = e.value ? e.value : e.target.value;
        setforms((forms) => ({
            ...forms,
            [key]: value,
        }));
        setClearErrors(key);
        setErrors((prevErrors) => ({ ...prevErrors, [key]: '' }));
    }

    const validate = () => {
        const newErrors = {};
        if (!forms.name) newErrors.name = 'Name is required';
        if (!forms.email) newErrors.email = 'Email is required';
        if (!forms.privilege_id)
            newErrors.privilege_id = 'Privilege is required';
        if (!forms.password) newErrors.password = 'Password is required';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(action === 'create'){
            const newErrors = validate();
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
            } else {
                setLoading(true);
                try {
                    const response = await axios.post('/postAddSave', forms, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    if (response.data.type === 'success') {
                        handleToast(response.data.message, response.data.type);
                        onClose();
                    }else {
                        handleToast(response.data.message, response.data.status);
                    }
                } catch (error) {
                    if (error.response && error.response.status === 422) {
                        handleToast(error.response.data.errors, 'error');
                    } else {
                        handleToast('An error occurred. Please try again.', 'error');
                    }
                }finally {
                    setLoading(false);
                }
            }
        }else{
            setLoading(true);
            try {
                const response = await axios.post('/postEditSave', forms, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                if (response.data.type === 'success') {
                    handleToast(response.data.message, response.data.type);
                    onClose();
                } else {
                    handleToast(response.data.message, response.data.type);
                }
            } catch (error) {
                if (error.response && error.response.status === 422) {
                    handleToast(error.response.data.errors, 'error');
                } else {
                    handleToast('An error occurred. Please try again.', 'error');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} >
                <div className="p-2">
                    <div className="flex flex-col mb-3 w-full">
                        <InputComponent
                            name="name"
                            value={forms.name}
                            onChange={handleChange}
                        />
                        {(errors.name || serverErrors.name) && (
                            <div className="font-poppins font-bold text-red-600">
                                {errors.name || serverErrors.name}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                        <InputComponent
                            name="email"
                            value={forms.email}
                            onChange={handleChange}
                        />
                        {(errors.email || serverErrors.email) && (
                            <div className="font-poppins font-bold text-red-600">
                                {errors.email || serverErrors.email}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                        {action === 'create' 
                        ? 
                            <>
                                <DropdownSelect
                                    placeholder="Choose privilege"
                                    selectType="select2"
                                    displayName="Choose Privilege"
                                    name="privilege_id"
                                    options={options.privileges}
                                    value={forms.privilege_id}
                                    onChange={handleChange}
                                />
                                {(errors.privilege_id || serverErrors.privilege_id) && (
                                    <div className="font-poppins font-bold text-red-600">
                                        {errors.privilege_id || serverErrors.privilege_id}
                                    </div>
                                )}
                            </>
                        :
                            <DropdownSelect
                                selectType="select2"
                                displayName="Choose Privilege"
                                name="privilege_id"
                                options={options.privileges}
                                value={{label:selectedOption.name, value:selectedOption.id}}
                                onChange={handleChange}
                            />
                        }
                       
                      
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                            <>
                                <InputComponent
                                    name="password"
                                    value={forms.password}
                                    onChange={handleChange}
                                />
                                {(errors.password || serverErrors.password) && (
                                    <div className="font-poppins font-bold text-red-600">
                                        {errors.password || serverErrors.password}
                                    </div>
                                )}
                            </>
                    </div>
                    <div className="flex flex-col mb-3 w-full">
                        {action === 'edit' 
                        ?   
                        <DropdownSelect
                            selectType="select2"
                            displayName="Select a Status"
                            name="status"
                            options={Status}
                            value={{label:selectedStatusOption.name, value:selectedStatusOption.id}}
                            onChange={handleChange}
                        />
                        : ''
                        }
                       
                     
                    </div>
                    <Button
                        onClick={(e)=>onClose(e,'close')}
                        extendClass={`border-[1px] border-gray-300`} 
                        fontColor={(textColor)}
                    >
                        <i className={`fa fa-times-circle ${(textColor)}`}></i> Close
                    </Button>
                    <Button
                        type="button"
                        extendClass={(theme === 'bg-skin-white' ? whiteBgCoror : theme) +" float-right"}
                        disabled={loading}
                        fontColor={textColorActive}
                    >
                        <i className={`fa ${action === 'create' ? `fa-paper-plane` : `fa-edit`}`}></i>    {action === 'edit' ? loading ? "Updating..." : "Update" : loading ? "Submitting..." : "Submit"}
                    </Button>
                </div>
            </form>
        </>
    )
}

export default UsersForm;