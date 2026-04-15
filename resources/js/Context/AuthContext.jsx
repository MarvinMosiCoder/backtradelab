import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children, initialAuth }) => {
    const [auth, setAuth] = useState(initialAuth);

    const updateAuth = (newAuth) => {
        setAuth(newAuth);
    };

    return (
        <AuthContext.Provider value={{ auth, updateAuth }}>
            {children}
        </AuthContext.Provider>
    );
};