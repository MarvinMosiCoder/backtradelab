import React from 'react'
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const LoginInputTooltip = ({children, content = 'To change tooltip content add "content" attribute', placement = 'top'}) => {
  return (
    <Tippy className='text-white rounded' content={content} placement={placement} zIndex={1000}>
        {children}
    </Tippy>
  )
}

export default LoginInputTooltip