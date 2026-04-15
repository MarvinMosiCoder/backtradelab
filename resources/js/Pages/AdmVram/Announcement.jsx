import React, { useEffect, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTheme } from '../../Context/ThemeContext';
import Overview from '../../Components/Dashboard/Overview';
import AnnouncementsModal from '../../Components/Modal/AnnouncementsModal';
import axios from 'axios';
import useThemeStyles from '../../Hooks/useThemeStyles';

const Announcement = ({ unreadAnnouncements }) => {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const { textColor, primayActiveColor } = useThemeStyles(theme);
    const [announcementIndex, setAnnouncementIndex] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        // Initialize announcements and show modal if there are unread announcements
        setAnnouncements(unreadAnnouncements);
        if (auth.announcement && unreadAnnouncements.length > 0) {
            setShowModal(true);
        }
    }, [auth.announcement, unreadAnnouncements]);

    const showNextAnnouncement = () => {
        // Move to the next announcement or close modal and redirect if at the end
        if (announcementIndex + 1 < announcements.length) {
            setAnnouncementIndex((prevIndex) => prevIndex + 1);
        } else {
            setShowModal(false); // Close modal if no more announcements
        }
    };

    const handleDismiss = async (e) => {
        // Dismiss current announcement and mark as read
        e.preventDefault();
        setLoading(true);
        try {
            const currentAnnouncement = announcements[announcementIndex];
            await axios.post('read-announcement', {
                announcement_id: currentAnnouncement.id,
            });

            // Show the next announcement
            showNextAnnouncement();
        } catch (error) {
            console.error("Failed to mark announcement as read:", error.response.data);
        } finally {
            setLoading(false);
        }
    };

    const currentAnnouncement = announcements[announcementIndex];

    return (
        <>
            <Head title="Announcements" />
            <Overview />
            <AnnouncementsModal
                theme={theme === 'bg-skin-white' ? primayActiveColor : theme}
                show={showModal}
                title={currentAnnouncement?.title}
                width="xl"
                fontColor={theme === 'bg-skin-white' ? 'text-white' : textColor}
                withButton
                loading={loading}
                onClick={handleDismiss}
                onClose={() => setShowModal(false)} // Allow closing modal
            >
                {currentAnnouncement && (
                    <div key={currentAnnouncement.id} id={`announcement-modal-${currentAnnouncement.id}`}>
                        <div
                            className="p-4 h-[500px] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: currentAnnouncement.message }}
                        ></div>
                    </div>
                )}
            </AnnouncementsModal>
        </>
    );
};

export default Announcement;
