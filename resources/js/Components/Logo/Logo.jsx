import React from 'react';

const Logo = (props) => {
  return (
    <svg 
      width="100" 
      height="100" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg" 
      {...props}
    >
      <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="3" fill="red" />
      <text x="50" y="55" fontSize="22" textAnchor="middle" fill="white">Logo</text>
    </svg>
  );
};

export default Logo;