import React, { Fragment } from "react";
import { Link } from "@inertiajs/react";
import useViewport from "../../Hooks/useViewport";
import useThemeStyles from "../../Hooks/useThemeStyles";


const   Pagination = ({ paginate, onClick, extendClass }) => {
    const { width } = useViewport();
    const mobileView = width < 640 ? true : false ;
    const { paginationHoverColor, primayActiveColor, paginationSideActiveColor, textColor } = useThemeStyles(extendClass);
    
    return (
        <div onClick={onClick} className="flex justify-between items-center w-full gap-2 mt-2">
            {mobileView ? 
            <>
                {paginate.prev_page_url ? 
                    <Link
                        href={paginate.prev_page_url}
                        preserveState
                        preserveScroll
                        className={`text-white block px-2 py-[6px] text-sm  rounded-md  ${extendClass === 'bg-skin-white' ? primayActiveColor : extendClass} ${extendClass === 'bg-skin-white' ? 'hover:bg-skin-white-hover' : paginationHoverColor} shadow-md `}
                    >
                    « Previous
                    </Link> : 
                    <span className={`text-white block px-2 py-[6px] text-sm  rounded-md  ${extendClass === 'bg-skin-white' ? primayActiveColor : extendClass} shadow-md opacity-50 cursor-not-allowed`}>
                        « Previous
                    </span>
                }

                {paginate.next_page_url ? 
                    <Link
                        href={paginate.next_page_url}
                        preserveState
                        preserveScroll
                        className={`text-white block px-2 py-[6px] text-sm  rounded-md  ${extendClass === 'bg-skin-white' ? primayActiveColor : extendClass} ${extendClass === 'bg-skin-white' ? 'hover:bg-skin-white-hover' : paginationHoverColor} shadow-md `}
                    >
                    Next »
                    </Link> :    
                    <span className={`text-white block px-2 py-[6px] text-sm  rounded-md  ${extendClass === 'bg-skin-white' ? primayActiveColor : extendClass} shadow-md opacity-50 cursor-not-allowed`}>
                        Next »
                    </span>
                }
            </> 
            // Desktop View
            :
            <>
                <span className="text-gray-500 font-medium text-sm">
                   {paginate.data.length != 0 ? 
                   `Showing ${paginate.from} to ${paginate.to} of ${paginate.total} results.` 
                   : 
                   `Showing 0 results.`} 
                </span>

                <nav className="inline-flex p-2">
                    {paginate.links.map((link, index) => {
                        const Label = index == 0
                            ? <i className={`fa-solid fa-chevron-left text-sm`}></i>
                            : paginate.links.length - 1 == index
                            ? <i className={`fa-solid fa-chevron-right text-sm`}></i>
                            : link.label;

                        return <Fragment key={"page" + link.label + 'index' + index}>
                        {link.url ? 

                        <Link
                            href={link.url}
                            preserveScroll
                            preserveState
                            className={`${link.active ? `text-gray-100`: `text-gray-500`} hover:text-white inline-block px-4 py-2 font-medium text-sm border first:rounded-tl-md first:rounded-bl-md last:rounded-tr-md last:rounded-br-md border-gray-300 
                                ${extendClass === 'bg-skin-white' ? 'hover:bg-skin-white-hover' : paginationHoverColor }
                                ${link.active && (extendClass === 'bg-skin-white' ? primayActiveColor : extendClass) } 
                                ${!link.url && "cursor-not-allowed "}`}
                        >
                            {Label}
                        </Link> :

                        <span className={`text-gray-500 hover:text-white inline-block px-3 py-2 font-medium text-sm border first:rounded-tl-md first:rounded-bl-md last:rounded-tr-md last:rounded-br-md border-gray-300 
                            ${extendClass === 'bg-skin-white' ? 'hover:bg-skin-white-hover' : paginationHoverColor }
                            cursor-not-allowed `}>
                                {Label}
                        </span>}
                      </Fragment>
                    })}
                </nav>
            </>
            }
         
        </div>
    );
};

export default Pagination;
