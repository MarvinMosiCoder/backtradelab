import { Head, router, usePage } from '@inertiajs/react';
import React, { useContext, useEffect, useState } from 'react';
import ApiDocumentation from './ApiDocumentation';
import ApiSecretKey from './ApiSecretKey';
import { useTheme } from '../../Context/ThemeContext';
import useThemeStyles from '../../Hooks/useThemeStyles';
import ApiGeneratorCreate from './ApiGenerator/ApiGeneratorCreate';

const ApiGenerator = ({page_title, api, queryParams, secret_key, database_tables_and_columns}) => {
    const [activeTab, setActiveTab] = useState("tab1")
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const { textColor, sideBarBgColor } = useThemeStyles(theme);


    const tabs = [
      { id: "tab1", image: "/images/others/document-icon.png", label: "Api Documentation" },
      { id: "tab2", image: "/images/others/key-icon.png", label: "Api Secret Key" },
    ]
    return (
        <div className={`${textColor}`}>
        <Head title={page_title}/>
        <div className={`w-full mx-auto ${sideBarBgColor} shadow-menus rounded-lg overflow-hidden`}>
                  <div className={`flex  ${theme == 'bg-skin-blue' ? 'bg-gray-200': 'bg-black/20'}`}>
                      {tabs.map((tab) => (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center justify-center px-5 py-3 font-medium text-sm transition-colors focus:outline-none ${
                                  activeTab === tab.id
                                  ? `${sideBarBgColor} rounded-t-lg`
                                  : "text-muted-foreground text-gray-600 hover:text-foreground hover:bg-gray-300 "
                              }`}
                          >
                                <img
                                    src={tab.image}
                                    className={`w-4 h-4 md:w-5 md:h-5 md:mr-2 cursor-pointer duration-500 
                                    ${
                                        activeTab === tab.id
                                        ? "opacity-100"
                                        : "opacity-50"
                                    }`}
                                />
                             
                              <div className="hidden md:block">{tab.label}</div>
                          </button>        
                      ))}
                  </div>
                  <div>
                      {activeTab === "tab1" && (
                          <div className="p-2">
                            <ApiDocumentation api={api} queryParams={queryParams}></ApiDocumentation>
                          </div>
                      )}

                      {activeTab === "tab2" && (
                          <div className="p-2">
                            <ApiSecretKey secret_key={secret_key}></ApiSecretKey>
                          </div>
                      )}
                  </div>
              </div>
        </div>
    );
};

export default ApiGenerator;
