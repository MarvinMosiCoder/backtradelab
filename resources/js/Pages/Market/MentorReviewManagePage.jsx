import React from 'react';
import { Head } from '@inertiajs/react';
import ShareLinkManager from '../../Components/Market/ShareLinkManager';
import ContentPanel from '../../Components/Table/ContentPanel';

const MentorReviewManagePage = () => {
    return (
        <>
            <Head title="Mentor Review" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <ShareLinkManager />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default MentorReviewManagePage;
