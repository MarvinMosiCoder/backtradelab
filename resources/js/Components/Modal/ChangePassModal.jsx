import React from "react";
import LoadingIcon from "../Table/Icons/LoadingIcon";
import Button from "../Table/Buttons/Button";

const ChangePassModal = ({
    show,
    onClose,
    children,
    title,
    modalLoading,
    width = "lg",
    theme,
    fontColor, 
    loading,
    isDisabled,
    onClick,
    withButton,
    isPasswordQwerty
}) => {
    if (!show) {
        return null;
    }

    const maxWidth = {
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "min-w-2xl",
    }[width];

    return (
        <>
            {modalLoading ? (
                <div className="modal-backdrop z-[120]">
                    <div className="bg-transparent rounded-lg w-32 m-5 ">
                        <main className="py-5 px-5 flex items-center justify-center">
                            <LoadingIcon classes="h-14 w-14 fill-white" />
                        </main>
                    </div>
                </div>
            ) : (
                <div className="modal-backdrop z-[100]">
                    <div
                        className={`bg-white rounded-lg shadow-custom ${maxWidth} w-full m-5`}
                    >
                        <div className={`${theme} rounded-t-lg flex justify-between p-3 border-b-2 items-center`}>
                            <p className={`${fontColor} font-poppins font-extrabold text-lg`}>
                                <i className="fa fa-key"></i> {title}
                            </p>
                        </div>
                        <main className="py-3 px-3">{children}</main>

                      
                        {withButton && (
                            <>
                              <div className="p-2 border-t-2 mt-3">

                                    <Button
                                        type="button"
                                        extendClass={theme + " w-full mb-1 lg:w-auto lg:float-right lg:mb-3"}
                                        disabled={isDisabled}
                                        fontColor="text-white"
                                        onClick={(e) => onClick(e,'change')}
                                        >
                                        <i className="fa fa-key"></i> {loading ? "Changing..." : "Change"}
                                    </Button>
                                    {!isPasswordQwerty && (
                                        <Button
                                            type="button"
                                            extendClass={"bg-orange-500 w-full lg:w-auto lg:float-right lg:mr-1"}
                                            fontColor="text-white"
                                            onClick={(e) => onClick(e,'waive')}
                                        >
                                            <i className="fa fa-refresh"></i> {loading ? "Waiving..." : "Waive"}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}
        </>
    );
};

export default ChangePassModal;
