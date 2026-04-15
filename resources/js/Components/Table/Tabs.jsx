import React, { useState } from "react";
import TableContainer from "./TableContainer";
import JsonModal from "../../Components/Modal/JsonModal";
import Thead from "./Thead";
import Row from "./Row";
import TableHeader from "./TableHeader";
import RowData from "./RowData";
import axios from "axios";
import Tbody from "../../Components/Table/Tbody";
import TableButton from "../../Components/Table/Buttons/TableButton";
const Tabs = ({ tabs, jsonSubmitted, jsonReceived, transactionLogs }) => {
    console.log(tabs);
    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [isOpen, setIsOpen] = useState(false);
    const [modalData, setModalData] = useState();
    const [title, setTitle] = useState();

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
    };

    const openModal = () => {
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    const handleJsonExport = (e, logType, orderId) => {
        e.preventDefault();
        axios({
            url: `/export-json/${logType}/${orderId}`,
            method: "GET",
            responseType: "blob",
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: "text/plain" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Json-${logType}-${orderId}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch((error) => {
                console.error("Export error:", error);
            });
    };

    const handleTransactionLogExport = (e, orderId) => {
        e.preventDefault();
        axios({
            url: `/export-transaction/${orderId}`,
            method: "GET",
            responseType: "blob",
        })
            .then((response) => {
                console.log(response.data);
                const url = window.URL.createObjectURL(
                    new Blob([response.data])
                );
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                    "download",
                    `TransactionLogs-${orderId}.xlsx`
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch((error) => {
                console.error("Export error:", error);
            });
    };

    return (
        <div className="bg-white rounded-md mt-4 w-full font-poppins">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex items-center justify-between px-4">
                    <p className="font-bold text-gray-700">JSON Logs</p>
                    <div>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`whitespace-nowrap py-4 px-6 border-b-2 ${
                                    tab.id === activeTab
                                        ? "border-gray-700 text-gray-700 font-bold"
                                        : "border-transparent text-secondary hover:text-gray-900 hover:border-gray-300"
                                }`}
                                onClick={() => handleTabClick(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>
            </div>
            <div className="px-4 py-5">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={tab.id === activeTab ? "block" : "hidden"}
                    >
                        {tab.id === 1 && (
                            <div>
                                <div className="flex justify-between">
                                    <h2 className="mb-4 italic">
                                        Json Response
                                    </h2>
                                    <TableButton
                                        extendClass="mr-1 mb-3"
                                        onClick={(e) =>
                                            handleJsonExport(
                                                e,
                                                "Received",
                                                jsonSubmitted[0].order_id
                                            )
                                        }
                                    >
                                        Export
                                    </TableButton>
                                </div>

                                <TableContainer autoHeight>
                                    <Thead>
                                        <Row>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order Lines ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                JSON
                                            </TableHeader>
                                        </Row>
                                    </Thead>
                                    <Tbody data={jsonReceived}>
                                        {jsonReceived.map((json) => {
                                            let parsedData;

                                            try {
                                                parsedData = JSON.parse(
                                                    json.data
                                                );
                                            } catch (error) {
                                                console.error(
                                                    "Failed to parse JSON:",
                                                    error
                                                );
                                                parsedData = json.data;
                                            }

                                            return (
                                                <Row key={json.id}>
                                                    <RowData center>
                                                        {json.order_id}
                                                    </RowData>
                                                    <RowData center>
                                                        {json.order_lines_id}
                                                    </RowData>
                                                    <RowData center>
                                                        <button
                                                            className="text-gray-500 hover:text-gray-700"
                                                            onClick={() => {
                                                                openModal();
                                                                setModalData(
                                                                    json.data
                                                                );
                                                                setTitle(
                                                                    "JSON Response Received"
                                                                );
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color: "orange",
                                                                }}
                                                            >
                                                                &#123;
                                                            </span>
                                                            &nbsp;
                                                            <span>JSON</span>
                                                            &nbsp;
                                                            <span
                                                                style={{
                                                                    color: "orange",
                                                                }}
                                                            >
                                                                &#125;
                                                            </span>
                                                        </button>
                                                    </RowData>
                                                </Row>
                                            );
                                        })}
                                    </Tbody>
                                </TableContainer>
                            </div>
                        )}
                        {tab.id === 2 && (
                            <div>
                                <div className="flex justify-between">
                                    <h2 className="mb-4 italic">
                                        Json Request
                                    </h2>
                                    <TableButton
                                        extendClass="mr-1 mb-3"
                                        onClick={(e) =>
                                            handleJsonExport(
                                                e,
                                                "Submitted",
                                                jsonSubmitted[0].order_id
                                            )
                                        }
                                    >
                                        Export
                                    </TableButton>
                                </div>

                                <TableContainer autoHeight>
                                    <Thead>
                                        <Row>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order Lines ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                JSON
                                            </TableHeader>
                                        </Row>
                                    </Thead>
                                    <Tbody data={jsonSubmitted}>
                                        {jsonSubmitted.map((json) => {
                                            return (
                                                <Row key={json.id}>
                                                    <RowData center>
                                                        {json.order_id}
                                                    </RowData>
                                                    <RowData center>
                                                        {json.order_lines_id}
                                                    </RowData>
                                                    <RowData center>
                                                        <button
                                                            className="text-gray-500 hover:text-gray-700"
                                                            onClick={() => {
                                                                openModal();
                                                                setModalData(
                                                                    json.data
                                                                );
                                                                setTitle(
                                                                    "JSON Request Submitted"
                                                                );
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color: "orange",
                                                                }}
                                                            >
                                                                &#123;
                                                            </span>
                                                            &nbsp;
                                                            <span>JSON</span>
                                                            &nbsp;
                                                            <span
                                                                style={{
                                                                    color: "orange",
                                                                }}
                                                            >
                                                                &#125;
                                                            </span>
                                                        </button>
                                                    </RowData>
                                                </Row>
                                            );
                                        })}
                                    </Tbody>
                                </TableContainer>
                            </div>
                        )}
                        {tab.id === 3 && (
                            <div>
                                <div className="flex justify-between">
                                    <h2 className="mb-4 italic">
                                        Transaction Logs
                                    </h2>
                                    <TableButton
                                        extendClass="mr-1 mb-3"
                                        onClick={(e) =>
                                            handleTransactionLogExport(
                                                e,
                                                transactionLogs[0].order_id
                                            )
                                        }
                                    >
                                        Export
                                    </TableButton>
                                </div>
                                <TableContainer autoHeight>
                                    <Thead>
                                        <Row>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order Lines ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Transaction ID
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Order Type
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                DEP Status
                                            </TableHeader>
                                            <TableHeader
                                                sortable={false}
                                                justify="center"
                                            >
                                                Created Date
                                            </TableHeader>
                                        </Row>
                                    </Thead>

                                    <Tbody data={transactionLogs}>
                                        {transactionLogs.map((json) => (
                                            <Row key={json.id}>
                                                <RowData center>
                                                    {json.order_lines_id}
                                                </RowData>
                                                <RowData center>
                                                    {json.dep_transaction_id}
                                                </RowData>
                                                <RowData center>
                                                    {json.order_type}
                                                </RowData>
                                                <RowData center>
                                                    {json.dep_status_name}
                                                </RowData>
                                                <RowData center>
                                                    {json.created_at}
                                                </RowData>
                                            </Row>
                                        ))}
                                    </Tbody>
                                </TableContainer>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <JsonModal
                show={isOpen}
                onClose={closeModal}
                title={title}
                modalData={modalData}
            ></JsonModal>
        </div>
    );
};

export default Tabs;
