import { Link, Head } from "@inertiajs/react";
import ContentPanel from "../../Components/Table/ContentPanel";

const RestrictionPage = () => {
    return (
        <>
            <Head title="Error 403" />
            <ContentPanel>
                <div className="flex flex-col items-center justify-center select-none">
                    <img
                        src="/images/others/403-logo.png"
                        className="w-[800px]"
                    />
                    <Link
                        href="/dashboard"
                        className="my-[20px] bg-primary py-3 px-5 rounded-[50px] text-white font-poppins hover:opacity-70"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </ContentPanel>
        </>
    );
};

export default RestrictionPage;
