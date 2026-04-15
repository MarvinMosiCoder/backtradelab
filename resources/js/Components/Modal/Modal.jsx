import React from "react";
import LoadingIcon from "../Table/Icons/LoadingIcon";
import Button from "../Table/Buttons/Button";
import { useTheme } from "../../Context/ThemeContext";
import useThemeStyles from "../../Hooks/useThemeStyles";

const Modal = ({
  action,
  show,
  onClose,
  children,
  title,
  icon,
  modalLoading,
  width = "lg",
  fontColor,
  loading,
  onClick,
  withButton,
  isDelete,
}) => {
  if (!show) return null;

  // Tailwind max-width mapping
  const maxWidth =
    {
      md: "sm:max-w-md",
      lg: "sm:max-w-lg",
      xl: "sm:max-w-xl",
      "2xl": "sm:max-w-2xl",
      "5xl": "sm:max-w-5xl",
      "6xl": "sm:max-w-6xl",
      "7xl": "sm:max-w-7xl",
      "8xl": "sm:max-w-[80%]",
      "9xl": "sm:max-w-[90%]",
    }[width] || "sm:max-w-lg";

  const { theme } = useTheme();
  const { textColor, primayActiveColor } = useThemeStyles(theme);

  // Estimate header + footer heights so body can scroll
  // If footer isn't rendered, we reduce the reserved space a bit.
  const reservedHeight = withButton ? 140 : 80;

  return (
    <>
      {modalLoading ? (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center">
          <div className="bg-transparent rounded-lg w-32 m-5">
            <main className="py-5 px-5 flex items-center justify-center">
              <LoadingIcon classes="h-14 w-14 fill-white" />
            </main>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] bg-black/50 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-5">
            <div
              className={`
                ${
                  theme === "bg-skin-black"
                    ? "bg-black-table-color text-gray-300"
                    : "bg-white"
                }
                rounded-lg shadow-custom w-full ${maxWidth}
                max-h-[90vh] sm:max-h-[85vh]
                overflow-hidden
              `}
              role="dialog"
              aria-modal="true"
              aria-label={title || "Modal"}
            >
              {/* Header */}
              <div
                className={`
                  ${theme === "bg-skin-white" ? "bg-skin-black" : theme}
                  rounded-t-lg flex justify-between p-3 border-b-2 items-center
                `}
              >
                <p className={`${fontColor} font-poppins font-extrabold text-lg`}>
                  {icon ? <i className={icon} /> : null} {title}
                </p>

                <i
                  className="fa fa-times-circle text-white font-extrabold text-md cursor-pointer"
                  onClick={(e) => onClose(e, "close")}
                />
              </div>

              {/* Scrollable Body */}
              <main
                className="px-3 py-3 overflow-y-auto"
                style={{
                  maxHeight: `calc(90vh - ${reservedHeight}px)`,
                }}
              >
                {children}
              </main>

              {/* Footer */}
              {withButton && (
                <div className="px-2 pt-1 pb-1 border-t-2">
                  <Button
                    onClick={(e) => onClose(e, "close")}
                    extendClass="bg-skin-default border-[1px] border-gray-400"
                    fontColor={theme === "bg-skin-black" ? "text-gray-900" : textColor}
                  >
                    <i
                      className={`fa fa-times-circle ${
                        theme === "bg-skin-black" ? "text-gray-900" : textColor
                      }`}
                    />{" "}
                    Close
                  </Button>

                  {isDelete && (
                    <Button
                      extendClass="bg-red-500 float-right"
                      fontColor={fontColor}
                      onClick={(e) => onClick(e, "delete")}
                    >
                      <i className="fa fa-trash px-1" /> Delete
                    </Button>
                  )}

                  <Button
                    type="button"
                    extendClass={`${
                      theme === "bg-skin-white" ? primayActiveColor : theme
                    } float-right mr-1`}
                    disabled={loading}
                    fontColor={fontColor}
                    onClick={(e) => onClick(e, "update")}
                  >
                    {loading ? (
                      action === "Add" ? (
                        "Submitting"
                      ) : (
                        "Updating"
                      )
                    ) : (
                      <span>
                        <i className="fa-solid fa-plus-circle" />{" "}
                        {action === "Add" ? "Save" : "Update"}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modal;
