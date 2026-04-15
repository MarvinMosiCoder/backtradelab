import React, { useEffect, useState } from "react";
import { Head, Link, router, usePage, useForm } from "@inertiajs/react";
import InputComponent from "../../Components/Forms/Input";
import TableContainer from "../../Components/Table/TableContainer";
import Thead from "../../Components/Table/Thead";
import Row from "../../Components/Table/Row";
import TableHeader from "../../Components/Table/TableHeader";
import Tbody from "../../Components/Table/Tbody";
import RowData from "../../Components/Table/RowData";
import RowAction from "../../Components/Table/RowAction";
import Button from "../../Components/Table/Buttons/Button";
import RowStatus from "../../Components/Table/RowStatus";
import Modalv2 from "../../Components/Modal/Modalv2";
import { useToast } from "../../Context/ToastContext";

const ApiSecretKey = ({ secret_key }) => {
    const [loading, setLoading] = useState(false);
    const { handleToast } = useToast();
    const { data, setData, post } = useForm({
        id:""
    });
    const [showModal, setShowModal] = useState(false);

    router.on("start", () => setLoading(true));
    router.on("finish", () => setLoading(false));

    // Handle API Key Generation
    function handleGenerateApiKey() {
        post(`api_generator/generate_key`, {
            onSuccess: (data) => {
                const { message, type } = data.props.auth.sessions;
                handleToast(message, type);
                router.reload();
                reset();
                onClose();
            },
            onError: (error) => {},
        });
    }

    // Handle Deactivation
    function handleDeactivateKey(id) {
        post(`api_generator/deactivate_key/${id}`, {
            onSuccess: (data) => {
                const { message, type } = data.props.auth.sessions;
                handleToast(message, type);
                router.reload();
                reset();
                onClose();
            },
            onError: (error) => {},
        });
    }

    // Handle Activation
    function handleActivateKey(id) {
        post(`api_generator/activate_key/${id}`, {
            onSuccess: (data) => {
                const { message, type } = data.props.auth.sessions;
                handleToast(message, type);
                router.reload();
                reset();
                onClose();
            },
            onError: (error) => {},
        });
    }

    // Handle Deletion
    function handleDeleteKey(id) {
        post(`api_generator/delete_key/${id}`, {
            onSuccess: (data) => {
                const { message, type } = data.props.auth.sessions;
                handleToast(message, type);
                router.reload();
                reset();
                onClose();
            },
            onError: (error) => {},
        });
    }

    const handleModalToggle = ()=> {
        setShowModal(!showModal);
    };

    return (
        <div className="p-3">
            <Button
                extendClass="bg-skin-blue mb-3"
                fontColor="text-white"
                type="button"
                onClick={handleGenerateApiKey}
            >
                <i className="fa fa-cog text-base px-[1px] me-1"></i>
                Generate Secret key
            </Button>

            <TableContainer>
                <Thead>
                    <Row>
                        <TableHeader name="id" sortable={false} width="sm">
                            No.
                        </TableHeader>
                        <TableHeader
                            name="api_name"
                            sortable={false}
                            width="lg"
                        >
                            Secret Key
                        </TableHeader>
                        <TableHeader
                            name="status"
                            justify="center"
                            sortable={false}
                            width="sm"
                        >
                            API Status
                        </TableHeader>
                        <TableHeader
                            sortable={false}
                            width="md"
                            justify="center"
                        >
                            Action
                        </TableHeader>
                    </Row>
                </Thead>
                <Tbody data={secret_key}>
                    {secret_key &&
                        secret_key.map((item, index) => (
                            <Row key={item.id}>
                                <RowData isLoading={loading}>{item.id}</RowData>
                                <RowData isLoading={loading}>
                                    {item.secret_key}
                                </RowData>
                                <RowStatus
                                    isLoading={loading}
                                    systemStatus={
                                        item.status === 1
                                            ? "active"
                                            : "inactive"
                                    }
                                >
                                    {item.status === 1 ? "ACTIVE" : "INACTIVE"}
                                </RowStatus>
                                <RowData center>
                                    <RowAction
                                        type="button"
                                        hasTooltip
                                        tooltipContent={
                                            item.status === 0
                                                ? "Activate Key"
                                                : "Deactivate Key"
                                        }
                                        action={
                                            item.status === 0
                                                ? "activate"
                                                : "deactivate"
                                        }
                                        onClick={() =>
                                            item.status === 0
                                                ? handleActivateKey(item.id)
                                                : handleDeactivateKey(item.id)
                                        }
                                    />

                                    <RowAction 
                                        type="button" 
                                        action="delete"
                                        hasTooltip
                                        tooltipContent="Delete key"
                                        onClick={() => 
                                            {handleModalToggle(); setData("id", item.id)}
                                        }
                                    />
                                </RowData>
                            </Row>
                        ))}
                </Tbody>
            </TableContainer>
            <Modalv2
                title="Delete Confirmation"
                content="Are you sure you want to delete this key?"
                confirmButtonName="Delete"
                confirmButtonColor="bg-red-500"
                isOpen={showModal}
                onConfirm={() => handleDeleteKey(data.id)}
                setIsOpen={handleModalToggle}
            />
        </div>
    );
};

export default ApiSecretKey;
