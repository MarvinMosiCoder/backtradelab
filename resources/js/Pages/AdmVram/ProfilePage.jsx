import React, { useContext, useEffect, useState } from "react";
import ContentPanel from "../../Components/Table/ContentPanel";
import { Head, router } from "@inertiajs/react";
import { NavbarContext } from "../../Context/NavbarContext";
import { useProfile, useTheme } from "../../Context/ThemeContext";
import useThemeStyles from "../../Hooks/useThemeStyles";
import colorMap from "../../Components/Notification/ColorMap";
import axios from "axios";
import { useToast } from "../../Context/ToastContext";
import Modal from "../../Components/Modal/Modal";
import useThemeSwalColor from "../../Hooks/useThemeSwalColor";

const ProfilePage = ({ page_title, user }) => {
    const { theme } = useTheme();
    const { profile, setProfile } = useProfile();
    const { setTitle } = useContext(NavbarContext);
    const swalColor = useThemeSwalColor(theme);
    const [loading, setLoading] = useState(false);
    const { textColor, scrollbarTheme, primayActiveColor, borderTheme, secondaryHoverBorderTheme } = useThemeStyles(theme);
    const [profileImage, setProfileImage] = useState();
    const { handleToast } = useToast();
    const [forms, setForms] = useState({
        profile_image: user?.profile || '',
    });
    const [showModalProfiles, setShowModalProfiles] = useState(false);
    const [profiles, setProfiles] = useState([]);
    const [profileUpdate, setProfileUpdate] = useState(null);

    useEffect(() => {
        setTitle(page_title);
    }, [page_title, setTitle]);
    
    const getInitials = (fullName) => {
        const names = fullName.split(" ");
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        const initials = names[0].charAt(0) + names[names.length - 1].charAt(0);
        return initials.toUpperCase();
    };
    
    const initials = getInitials(user.name);
    const backgroundColor = colorMap[initials.charAt(0)] || theme;

    const handleImageChange = (e) => {
        const key = e.target.name;
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProfileImage(reader.result);
            };
            reader.readAsDataURL(file);
            setForms((forms) => ({
                ...forms,
                [key]: file,
            }));
        }
    };

    useEffect(() => {
        axios
            .get("/profiles")
            .then((response) => {
                setProfiles(response.data);
            })
            .catch((error) => {
                console.error(
                    "There was an error fetching profiles!",
                    error
                );
            });
    }, []);

    const handdleModalProfiles = () => {
        setShowModalProfiles(true);
    }
    const handleCloseModal = () => {
        setShowModalProfiles(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/save-edit-image', forms, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.type == 'success') {
                handleToast(response.data.message, response.data.status);
                router.reload({ only: ['profile'] });
            } else {
                handleToast(response.data.message, response.data.status);
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
    };

    // PROFILE UPDATE
    const handleUpdateProfile = (e, id, file_name) => {
        e.preventDefault();
        setProfileUpdate(id);
        setProfile(file_name);
    }

    const handleProfileUpdate = async (e, id, action) => {
        e.preventDefault();
        setLoading(true);
    
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: action === 'download' ? 'blob' : 'json', // Handle binary data for download
            };
    
            const response = await axios.post('/update-profile', {
                id: id ?? profileUpdate,
                action: action,
            }, config);
    
            if (action === 'download') {
                // Create a blob from the response
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
    
                // Extract filename from headers or use a default one
                const contentDisposition = response.headers['content-disposition'];
                const fileName = contentDisposition
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : 'downloaded_file';
    
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            } else if (response.data.status === 'success') {
                Swal.fire({
                    type: response.data.status,
                    title: response.data.message,
                    icon: response.data.status,
                    confirmButtonColor: swalColor,
                }).then((result) => {
                    if (result.isConfirmed) {
                        setShowModalProfiles(false);
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
            <Head title={page_title} />
            <div className="from-blue-50 to-indigo-100 flex items-center justify-center">
                <ContentPanel className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col justify-center items-center">
                            {/* Profile Picture */}
                            <div className="relative">
                                {(profile ?? user.profile) || profileImage ? (
                                    <div
                                        className={`w-48 h-48 border-4 border-gray-300 rounded-full overflow-hidden mb-5 shadow-md cursor-pointer`}
                                    >
                                        <img
                                            src={ (profile ?? user.profile) && !profileImage ? `/images/profile/`+ (profile ?? user.profile) : profileImage }
                                            alt="User Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className={`${backgroundColor} w-48 h-48 border-4 border-gray-300 rounded-full overflow-hidden mb-5 shadow-md cursor-pointer`}
                                    >
                                        <p className="text-white font-poppins text-center mt-5 text-[90px]">
                                            {initials}
                                        </p>
                                    </div>
                                )}

                                {/* Edit/Upload Button */}
                                <label
                                    htmlFor="upload-image"
                                    className={`absolute bottom-6 right-3 border-4 border-gray-300 bg-gray-100 text-gray-600 px-[11px] py-[7px] rounded-[120px] shadow-md hover:bg-gray-200 cursor-pointer`}
                                >
                                    <i className="fa fa-camera"></i>
                                    <input
                                        id="upload-image"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        name="profile_image"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>

                            {/* User Details */}
                            <div className="text-center">
                                <p className={`font-bold text-3xl ${theme === 'bg-skin-black' ? ' text-gray-400' : 'text-gray-800'} mb-2`}>{user.name}</p>
                                <p className={`text-lg ${theme === 'bg-skin-black' ? ' text-gray-400' : 'text-gray-600'}`}>{user.email}</p>
                                <span
                                    className={`text-sm px-3 py-1 mt-3 inline-block rounded-full ${
                                        user.privilege_name === "Admin"
                                            ? "bg-red-100 text-red-500"
                                            : "bg-green-100 text-green-500"
                                    }`}
                                >
                                    {user.privilege_name}
                                </span>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="mt-8 lg:flex justify-center gap-4">
                            <div
                                className={`px-6 py-2 mb-1 ${theme === 'bg-skin-white' ? primayActiveColor : theme} text-white text-center rounded-lg shadow-md hover:opacity-80 cursor-pointer transition-all`}
                                onClick={handdleModalProfiles}
                            >
                                <i className="fa fa-images"></i> View Profiles
                            </div>
                          
                            <button className={`px-6 py-2 bg-gray-200 text-gray-700 rounded-lg w-full lg:w-auto shadow-md hover:bg-gray-300 transition-all`}
                                    disabled={!profileImage}>
                                <i className="fa fa-edit"></i> Edit Image
                            </button>
                        </div>
                    </form>
                </ContentPanel>
                <Modal
                    theme={theme === 'bg-skin-white' ? primayActiveColor : theme}
                    show={showModalProfiles}
                    onClose={handleCloseModal}
                    title="Profiles"
                    width="xl"
                    fontColor={theme === 'bg-skin-white' ? 'text-white' : textColor}
                    // withButton="button"
                    onClick={handleProfileUpdate}
                    icon='fa fa-images'
                    btnIcon='fa fa-refresh'
                    isDelete='delete'
                >  
                    <form>
                        <div className={`flex flex-wrap items-center justify-center pb-10 gap-2 max-h-[600px] overflow-y-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar  scrollbar-thin ${scrollbarTheme} scrollbar-track-gray-200`}>
                            {profiles.length > 0 ? (
                                profiles.map((item, index) => (
                                    <div
                                        className={`relative flex items-center shadow-md border-2 mt-8 ${
                                            item.id === profileUpdate ? `border-[3px] ${borderTheme} shadow-lg` : `border-gray-300`
                                        } justify-center cursor-pointer ${secondaryHoverBorderTheme} rounded-md shadow-lg`}
                                        key={index}
                                        onClick={(e) => handleUpdateProfile(e, item.id, item.file_name)}
                                    >
                                        <img
                                            src={`/images/profile/` + item.file_name}
                                            alt="User Avatar"
                                            className="w-[200px] max-w-[200px] lg:w-40 h-40 rounded-md"
                                        />
                                        <div className="absolute top-[167px] left-[41px] md:left-[41px] lg:left-[1px]">
                                            <button className={`absolute  left-[72px] rounded-md px-[5px]  ${textColor} bg-sky-700`}
                                            onClick={(e) => handleProfileUpdate(e, item.id, 'download')}
                                            >
                                                <i className="fa fa-cloud-download-alt text-[14px]"></i>
                                            </button>
                                            <button className={`absolute left-[104px] rounded-md px-[7px]  ${textColor} bg-red-700`}
                                            onClick={(e) => handleProfileUpdate(e, item.id, 'delete')}>
                                                <i className="fa fa-trash-alt text-[14px]"></i>
                                            </button>
                                            <button className={`absolute left-[133px] rounded-md px-[7px]  ${textColor} bg-green-700`}
                                            onClick={(e) => handleProfileUpdate(e, item.id, 'update')}
                                            >
                                                <i className="fa fa-refresh text-[14px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 text-center mt-4 ml-[120px]">
                                    No profiles available to display.
                                </div>
                            )}
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
};

export default ProfilePage;
