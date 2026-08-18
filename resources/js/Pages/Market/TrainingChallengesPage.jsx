import React from 'react';
import { Head } from '@inertiajs/react';
import TrainingChallengeCatalog from '../../Components/Market/TrainingChallengeCatalog';
import ContentPanel from '../../Components/Table/ContentPanel';

const TrainingChallengesPage = () => {
    return (
        <>
            <Head title="Training Challenges" />
            <div className="space-y-4">
                <ContentPanel marginBottom={2}>
                    <div className="p-4">
                        <TrainingChallengeCatalog />
                    </div>
                </ContentPanel>
            </div>
        </>
    );
};

export default TrainingChallengesPage;
