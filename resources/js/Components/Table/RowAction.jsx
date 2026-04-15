import { Link } from "@inertiajs/react";
import React from "react";

const RowAction = ({ action, size, href, onClick, type = 'link'}) => {
	const iconSize = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	}[size];

	const icon = {
		view: <i className={`fa fa-eye p-[6px] bg-sky-600 text-white text-[12px] rounded-[4px] hover:bg-sky-400 ${iconSize}`}></i>,
		delete:<i className={`fa fa-trash p-[6px] bg-red-500 text-white text-[12px] rounded-[4px] hover:bg-red-400 ${iconSize}`}></i>,
		edit: <i className={`fa fa-edit p-[6px] bg-green-500 text-white text-[12px] rounded-[4px] hover:bg-green-400 ${iconSize}`}></i>,
	}[action];

	return (
	<>
		{type == 'button' ? 	
			<button className="relative m-[2px]" onClick={onClick}>
				{icon}
			</button> 
		: 
		<Link
			className="relative m-[2px]"
			as="button"
			href={href}
		>
			{icon}
		</Link>}
	</>
	);
};

export default RowAction;
