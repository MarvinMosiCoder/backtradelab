import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import DropdownSelect from '../../Components/Dropdown/Dropdown';
import InputComponent from '../../Components/Forms/Input';
import RouteType from './RouteTypes';
import axios from 'axios';
import { useToast } from '../../Context/ToastContext';
import { useTheme } from '../../Context/ThemeContext';
import Button from '../../Components/Table/Buttons/Button';
import useThemeStyles from '../../Hooks/useThemeStyles';

const CreateUserForm = ({ onClose }) => {
    const {theme} = useTheme();
    const [errors, setErrors] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [clearErrors, setClearErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { handleToast } = useToast();
    const [forms, setForms] = useState({
        table_name: '',
        name: '',
        path: '',
        icon: '',
        // type: '',
    });
    const [tables, setTables] = useState([]);
    const { textColor, primayActiveColor, textColorActive } = useThemeStyles(theme);
    useEffect(() => {
        axios.get('/tables')
            .then(response => {
                setTables(response.data);
            })
            .catch(error => {
                console.error('There was an error fetching the table names!', error);
            });
    }, []);
    
    function handleChange(e) {
        const key = e.name ? e.name : e.target.name;
        const value = e.value ? e.value : e.target.value;
        setForms((forms) => ({
            ...forms,
            [key]: value,
        }));
        
        setClearErrors(key);
        setErrors((prevErrors) => ({ ...prevErrors, [key]: "" }));
    }

    const validate = () => {
        const newErrors = {};
        if (!forms.table_name) newErrors.table_name = 'Table Name is required';
        if (!forms.name) newErrors.name = 'Name is required';
        if (!forms.path) newErrors.path = 'Path is required';
        if (!forms.icon) newErrors.icon = 'Icon is required';
        // if (!forms.type) newErrors.type = 'Type is required';
  
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
        } else {
            setLoading(true);
            try {
                const response = await axios.post('/module_generator/postAddSave', forms, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                if (response.data.type == 'success') {
                    handleToast(response.data.message, response.data.status);
                    onClose();
                } else {
                    handleToast(response.data.message, response.data.status);
                    onClose();
                }
            } catch (error) {
                if (error.response && error.response.status === 422) {
                    setErrors(error.response.data.errors);
                } else {
                    setErrors({
                        general: 'An error occurred. Please try again.',
                    });
                }
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-2">
            {errorMessage && (
                <div style={{ color: "red" }}>{errorMessage}</div>
            )}
             <div className="flex flex-col mb-3 w-full">
                <DropdownSelect
                    placeholder="Please select a Table"
                    selectType="select2"
                    defaultSelect="Please select a Table"
                    name="table_name"
                    options={tables}
                    value={forms.table_name}
                    onChange={handleChange}
                />
                {(errors.table_name || serverErrors.table_name) && (
                    <div className="font-poppins font-bold text-red-600">
                        {errors.table_name || serverErrors.table_name}
                    </div>
                )}
            </div>
            <div className="flex flex-col mb-3 w-full">
                <InputComponent
                    type="text"
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
                    type="text"
                    name="path"
                    value={forms.path}
                    onChange={handleChange}
                />
                {(errors.path || serverErrors.path) && (
                    <div className="font-poppins font-bold text-red-600">
                        {errors.path || serverErrors.path}
                    </div>
                )}
            </div>
         
            <div className="flex flex-col mb-3 w-full">
                <InputComponent
                    type="text"
                    name="icon"
                    value={forms.icon}
                    onChange={handleChange}
                />
                {(errors.icon || serverErrors.icon) && (
                    <div className="font-poppins font-bold text-red-600">
                        {errors.icon || serverErrors.icon}
                    </div>
                )}
            </div>

            {/* <div className="flex flex-col mb-3 w-full">
                <DropdownSelect
                    placeholder="Choose type"
                    selectType="select2"
                    defaultSelect="Select a Type"
                    name="type"
                    options={RouteType}
                    value={forms.type}
                    onChange={handleChange}
                />
                {(errors.type || serverErrors.type) && (
                    <div className="font-poppins font-bold text-red-600">
                        {errors.type || serverErrors.type}
                    </div>
                )}
            </div> */}
        
            <Button
                type="button"
                extendClass={(theme === 'bg-skin-white' ? primayActiveColor : theme) +" block w-full mt-5"}
                disabled={loading}
                fontColor={textColorActive}
            >
                {loading ? "Submitting..." : "Submit"}
            </Button>
        </form>
    );
};

export default CreateUserForm;