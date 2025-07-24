sap.ui.define(
    [
        'sap/ui/core/mvc/ControllerExtension'
        // ,'sap/ui/core/mvc/OverrideExecution'
        , "sap/ndc/BarcodeScanner", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"
    ],
    function(
        ControllerExtension
        // ,OverrideExecution
        , BarcodeScanner, Filter, FilterOperator
    ) {
        'use strict';
        return ControllerExtension.extend("customer.custom.scm.ewm.picklistpapers1.HeaderControllerExt", {

            override: {
                // Runs after the UI is rendered
                onAfterRendering: function() {
                    var oBundle = this.getView().getModel("i18n").getResourceBundle();
                    // Set task type title based on i18n
                    var sTaskType = "Picking"; // or "Packing" – dynamically determined
                    var sTitle = oBundle.getText("customer.custom.scm.ewm.picklistpapers1_sap.app.title", [sTaskType]);

                    let match = window.location.href.match(/appName=([^&]+)/);
                    let appName = match ? match[1] : null;
                    if (appName === 'Putaway')
                        var cBValue = '1';
                    else
                        cBValue = '2';
                    if (this.getView().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseProcessCategory")) {

                        this.getView().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseProcessCategory").setSelectedKeys(cBValue);
                        var filterList = this.getView().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter").getAllFilterItems();
                        filterList.filter(filterItem => filterItem.getProperty("name") === "Electronics");
                        filterList.forEach(filterItem => {
                            if (filterItem.getProperty("name") !== "EWMWarehouse" && filterItem.getName() !== "WarehouseProcessCategory") {
                                filterItem.setVisibleInFilterBar(false);
                            }
                        });
                    } else {

                        var that = this;

                        function trySetFilterOptions(retries = 10) {
                            var oCategoryControl = sap.ui.getCore().byId(
                                "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseProcessCategory"
                            );
                            var oWarehouseStatus = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseTaskStatus");
                            var oSmartFilterBar = sap.ui.getCore().byId(
                                "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter"
                            );

                            if (oCategoryControl && oSmartFilterBar && oWarehouseStatus) {
                                oSmartFilterBar.clear();
                                oCategoryControl.setSelectedKeys([cBValue]);
                                oWarehouseStatus.setSelectedKeys([""]);
                                oCategoryControl.setEditable(false);
                                oWarehouseStatus.setEditable(false);

                                var aFilterItems = oSmartFilterBar.getAllFilterItems();
                                aFilterItems.forEach(function(filterItem) {
                                    if (filterItem.getName() !== "EWMWarehouse" && filterItem.getName() !== "WarehouseProcessCategory" && filterItem.getName() !== "WarehouseTaskStatus") {
                                        filterItem.setVisibleInFilterBar(false);
                                    }
                                });
                                sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter").getParent().getParent().getContent().attachBeforeRebindTable(that.onBeforeRebindTableExtension, that)
                                that._fetchDefaultWH.bind(that)();
                                var oInput = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControl_BASIC-EWMWarehouse");
                                if (oInput) {
                                    oInput.attachChange(function() {
                                        let match = window.location.href.match(/Assign=([^&]+)/);
                                        let assign = match ? match[1] : null;
                                        if (assign === "Me")
                                            that._fetchWHOrderForResouce.bind(that)();
                                    }.bind(this));
                                    oInput.attachSubmit(function() {
                                        let match = window.location.href.match(/Assign=([^&]+)/);
                                        let assign = match ? match[1] : null;
                                        if (assign === "Me")
                                            that._fetchWHOrderForResouce.bind(that)();
                                    }.bind(this));
                                }

                            } else if (retries > 0) {
                                // Retry after a short delay
                                setTimeout(function() {
                                    trySetFilterOptions(retries - 1);
                                }, 300); // wait 300ms and retry
                            } else {
                                console.warn("Filter controls not found after retries.");
                            }
                        }

                        trySetFilterOptions();
                    }
                }
            },

            _fetchDefaultWH: function() {
                var sUrl = "/sap/opu/odata/UI2/INTEROP/";
                var sPath = "PersContainers(category='P',id='sap.ushell.UserDefaultParameter')?$expand=PersContainerItems";
                $.ajax({
                    url: sUrl + sPath,
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    success: function(response) {
                        var data = response.d;
                        var oSmartFilterBar = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter");
                        if (data && data.PersContainerItems && data.PersContainerItems.results.length > 0) {
                            var warehouseItem = data.PersContainerItems.results.find(function(item) {
                                return item.id === "Warehouse";
                            });

                            if (warehouseItem) {

                                var sFilterString = JSON.stringify({
                                    EWMWarehouse: JSON.parse(warehouseItem.value).value
                                });
                                oSmartFilterBar.setFilterDataAsString(sFilterString);


                            }

                            let match = window.location.href.match(/Assign=([^&]+)/);
                            let assign = match ? match[1] : null;
                            if (assign === "Me")
                                this._fetchWHOrderForResouce.bind(this)();
                            else if (oSmartFilterBar.getFilterData().EWMWarehouse)
                                sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-btnGo").firePress();

                        }
                    }.bind(this),
                    error: function(err) {
                        console.error("Failed to fetch user default parameters", err);
                    }
                });
            },

            _fetchWHOrderForResouce: function() {
                let match = window.location.href.match(/appName=([^&]+)/);
                let appName = match ? match[1] : null;
                var oSmartFilterBar = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter");
                var oResource = sap.ushell.Container.getService("UserInfo").getId(),
                    oWareHouse = oSmartFilterBar.getFilterData().EWMWarehouse,
                    oProcessCategory = "";
                if (appName === 'Putaway')
                    oProcessCategory = '1';
                else
                    oProcessCategory = '2';
                // var sUrl = "/sap/opu/odata/sap/ZSCM_PUTAWAY_SRV/FetchWHOrderList(" + encodeURIComponent("p_ExecutingResource eq '" + oResource + "',p_WarehouseNumber eq '"+ oWareHouse +"',p_ProcessCategory eq '" + oProcessCategory +"'")+")";
                var sUrl = "/sap/opu/odata/sap/ZSCM_PUTAWAY_SRV/FetchWHOrderList?$filter=ExecutingResource eq '" + oResource + "' and EWMWarehouse eq '" + oWareHouse + "' and WarehouseProcessCategory eq '" + oProcessCategory + "'";
                $.ajax({
                    url: sUrl,
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    success: function(data) {
                        var oSmartFilterBar = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter");
                        var results = data.d.results,
                            filterObj = oSmartFilterBar.getFilterData();
                        var warehouseOrders = results.map(item => item.WarehouseOrder);
                        delete filterObj.WarehouseOrder;
                        if (!filterObj.WarehouseTaskStatus) {
                            filterObj.WarehouseTaskStatus = {
                                items: [{
                                    key: '',
                                    text: 'Open',
                                    length: 1,
                                    value: null
                                }]
                            }
                        }
                        if (!filterObj.WarehouseProcessCategory) {
                            let match = window.location.href.match(/appName=([^&]+)/);
                            let appName = match ? match[1] : null;
                            if (appName === 'Putaway')
                                var key = '1';
                            else
                                key = '2';
                            filterObj.WarehouseProcessCategory = {
                                items: [{
                                    key: key,
                                    text: appName,
                                    length: 1,
                                    value: null
                                }]
                            }
                        }
                        var warehouseOrderRanges = warehouseOrders.map(order => ({
                            exclude: false,
                            keyField: "WarehouseOrder",
                            operation: "EQ",
                            tokenText: "=" + order,
                            value1: order
                        }));
                        if (oSmartFilterBar.getFilterData().EWMWarehouse) {
                            filterObj.EWMWarehouse = oSmartFilterBar.getFilterData().EWMWarehouse;
                        }
                        if (warehouseOrders.length > 0)
                            filterObj.WarehouseOrder = {
                                items: [],
                                ranges: warehouseOrderRanges,
                                value: null
                            }
                        var sFilterString = JSON.stringify(filterObj);
                        oSmartFilterBar.clear();
                        oSmartFilterBar.setFilterDataAsString(sFilterString);
                        if (oSmartFilterBar.getFilterData().EWMWarehouse)
                            sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-btnGo").firePress();

                        var filterId = "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter";
                        var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                        if (warehouseOrders.length > 0)
                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "WarehouseOrder") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });

                        setInterval(function() {
                            var oCategoryControl = sap.ui.getCore().byId(
                                "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseProcessCategory"
                            );
                            var oWarehouseStatus = sap.ui.getCore().byId(
                                "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-WarehouseTaskStatus"
                            );

                            if (oCategoryControl && oWarehouseStatus) {
                                oCategoryControl.setEditable(false);
                                oWarehouseStatus.setEditable(false);
                            }
                        }, 500);
                    }.bind(this),
                    error: function(err) {
                        console.error("Failed to fetch", err);
                    }
                });
            },

            onBeforeRebindTableExtension: function(oEvent) {
                console.log("triggered");
                var filters = oEvent.getParameter("bindingParams").filters;
                if (filters[0].aFilters) {
                    let aFilterItems = filters[0].aFilters;

                    // Iterate and clean up nested aFilters
                    aFilterItems.forEach(item => {
                        if (Array.isArray(item.aFilters)) {
                            // Remove nested filters based on path and value in sPath
                            item.aFilters = item.aFilters.filter(subFilter => {
                                const path = subFilter.sPath;
                                const value = subFilter.oValue1;

                                // Keep the filter if it does NOT match the condition
                                return !(
                                    (path === "WarehouseProcessCategory" || path === "WarehouseTaskStatus")
                                );
                            });
                        }
                    });

                    // Filter out any top-level filters where aFilters becomes an empty array after filtering
                    filters = aFilterItems.filter(item => {
                        return !(Array.isArray(item.aFilters) && item.aFilters.length === 0);
                    });

                    // Update the filters back
                    oEvent.getParameter("bindingParams").filters = filters;
                }
                let match = window.location.href.match(/appName=([^&]+)/);
                let appName = match ? match[1] : null;
                if (appName === 'Putaway')
                    var cBValue = '1';
                else
                    cBValue = '2';
                oEvent.getParameter("bindingParams").filters.push(new sap.ui.model.Filter("WarehouseTaskStatus", sap.ui.model.FilterOperator.EQ, ""));
                oEvent.getParameter("bindingParams").filters.push(new sap.ui.model.Filter("WarehouseProcessCategory", sap.ui.model.FilterOperator.EQ, cBValue))
            },

            onScanPress: function() {
                var that = this;

                BarcodeScanner.scan(
                    function(oResult) {
                        if (!oResult.cancelled) {
                            // Identify field by prefix in scanned text
                            function getFieldByAppIdentifier(inputText) {
                                const appIdMap = {
                                    "240": "PROD",
                                    "00": "HU",
                                    "Q04": "DST",
                                    "Q05": "DSB",
                                    "10": "BATCH"
                                };

                                // Match longest key prefix first
                                const sortedKeys = Object.keys(appIdMap).sort((a, b) => b.length - a.length);

                                for (const key of sortedKeys) {
                                    if (inputText.startsWith(key)) {
                                        return {
                                            field: appIdMap[key],
                                            value: inputText.slice(key.length) // text without the identifier
                                        };
                                    }
                                }

                                return null;
                            }
                            // Parse and validate scanned input
                            // var filtered = getFieldByAppIdentifier(oResult.text);
                            // this._validateInputValue.bind(this)(filtered.field, filtered.value);
                            // Split the scanned text by '#' and process each part
                            const parts = oResult.text.split('#');
                            for (const part of parts) {
                                const parsed = getFieldByAppIdentifier(part);
                                if (parsed) {
                                    this._validateInputValue(parsed.field, parsed.value);
                                } else {
                                    // Handle invalid parts (optional)
                                    console.warn("Unrecognized scanned part: " + part);
                                }
                            }
                        }
                    }.bind(this),
                    function(oError) {
                        // Handle errors
                        sap.m.MessageToast.show("Scan failed: " + oError);
                    }
                );

            },

            _validateInputValue: function(source, text) {

                // Mapping of scan sources to paths and fields
                const filterConfig = {
                    'PROD': {
                        path: "/ZSCM_I_ProductVH",
                        key: "Product",
                        filterKey: "Product",
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'DSB': {
                        path: "/ZSCM_I_StorageBinVH",
                        key: "StorageBin",
                        filterKey: "StorageBin",
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'HU': {
                        path: "/ZSCM_I_HandlingUnitTypeVH",
                        key: "HandlingUnitType",
                        filterKey: "SourceHandlingUnit",
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'BATCH': {
                        path: "/ZSCM_I_PhysStkBatchVH",
                        key: "Batch",
                        filterKey: "Batch",
                        additionalFilters: ["WarehouseNumber"]
                    },
                    'DST': {
                        path: "/ZSCM_I_StorageTypeVH",
                        key: "StorageType",
                        filterKey: "StorageType",
                        additionalFilters: ["WarehouseNumber"]
                    }
                };

                // If no config or path, treat as direct assignment (for WH)
                const config = filterConfig[source];
                if (!config || !config.path) {
                    if (source === 'WH') {
                        obj.HeaderFilter.WarehouseNumber = text;
                        this._oComponent.getModel("globalDataModel").refresh(true);
                        this.onSearch();
                    }
                    return;
                }

                const filterList = [new Filter(config.key, FilterOperator.EQ, text)];

                // Add additional filters from HeaderFilter context
                var oSmartFilterBar = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter");
                config.additionalFilters.forEach(field => {
                    const value = oSmartFilterBar.getFilterData().EWMWarehouse;
                    if (value) {
                        filterList.push(new Filter("EWMWarehouse", FilterOperator.EQ, value));
                    }
                });

                const that = this;

                // Validate the scan value
                const validateScan = () => {
                    return new Promise((resolve, reject) => {
                        that._validateScanValue(config.path, filterList, resolve, reject, "");
                    });
                };

                // On successful validation, update HeaderFilter and refresh
                const onSuccess = () => {
                    console.log("sucess");

                    var id = "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-filterItemControlFG1-",
                        filterId = "scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter";
                    var oSmartFilterBar = sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter");
                    var filterData = oSmartFilterBar.getFilterData();
                    // obj.HeaderFilter[config.filterKey] = text;
                    // that._oComponent.getModel("globalDataModel").refresh(true);
                    // that._handleFilterClear.bind(this)(config.filterKey);
                    // that.onSearch();
                    switch (config.filterKey) {
                        case 'Product':
                            id = id + "Product";
                            if (this.getView().byId(id)) {
                                var oField = this.getView().byId(id);
                                var aFilterItems = this.getView().byId(filterId).getAllFilterItems();
                            } else {
                                oField = sap.ui.getCore().byId(id);
                                var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                            }

                            oField.setValue(text);
                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "Product") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });
                            break;
                        case "StorageBin":
                            id = id + "SourceStorageBin";
                            if (this.getView().byId(id)) {
                                var oField = this.getView().byId(id);
                                var aFilterItems = this.getView().byId(filterId).getAllFilterItems();
                            } else {
                                oField = sap.ui.getCore().byId(id);
                                var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                            }

                            // oField.setValue(text);

                            let SourceStorageBin = {
                                items: [{
                                    key: text,
                                    text: text
                                }],
                                ranges: [],
                                value: null
                            };
                            filterData.SourceStorageBin = SourceStorageBin;
                            oSmartFilterBar.setFilterData(filterData);

                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "StorageBin") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });
                            break;
                        case "StorageType":
                            id = id + "SourceStorageType";
                            if (this.getView().byId(id)) {
                                var oField = this.getView().byId(id);
                                var aFilterItems = this.getView().byId(filterId).getAllFilterItems();
                            } else {
                                oField = sap.ui.getCore().byId(id);
                                var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                            }

                            // oField.setValue(text);

                            let SourceStorageType = {
                                items: [{
                                    key: text,
                                    text: text
                                }],
                                ranges: [],
                                value: null
                            };
                            filterData.SourceStorageType = SourceStorageType;
                            oSmartFilterBar.setFilterData(filterData);

                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "StorageType") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });
                            break;
                        case "Batch":
                            id = id + "Batch";
                            if (this.getView().byId(id)) {
                                var oField = this.getView().byId(id);
                                var aFilterItems = this.getView().byId(filterId).getAllFilterItems();
                            } else {
                                oField = sap.ui.getCore().byId(id);
                                var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                            }

                            // oField.setValue(text);
                            let Batch = {
                                items: [{
                                    key: text,
                                    text: text
                                }],
                                ranges: [],
                                value: null
                            };
                            filterData.Batch = Batch;
                            oSmartFilterBar.setFilterData(filterData);
                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "Batch") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });
                            break;
                        case "SourceHandlingUnit":
                            id = id + "SourceHandlingUnit";
                            if (this.getView().byId(id)) {
                                //     var oField = this.getView().byId(id);
                                var aFilterItems = this.getView().byId(filterId).getAllFilterItems();
                            } else {
                                //     oField = sap.ui.getCore().byId(id);
                                var aFilterItems = sap.ui.getCore().byId(filterId).getAllFilterItems();
                            }

                            // oField.setValue(text);

                            let SourceHandlingUnit = {
                                items: [{
                                    key: text,
                                    text: text
                                }],
                                ranges: [],
                                value: null
                            };
                            filterData.SourceHandlingUnit = SourceHandlingUnit;
                            oSmartFilterBar.setFilterData(filterData);
                            aFilterItems.forEach(function(filterItem) {
                                if (filterItem.getName() === "SourceHandlingUnit") {
                                    filterItem.setVisibleInFilterBar(true);
                                }
                            });
                            break;
                            // ... more cases
                        default:
                            // Code to execute if no case matches
                    }
                    sap.ui.getCore().byId("scm.ewm.picklistpapers1::sap.suite.ui.generic.template.ListReport.view.ListReport::WarehouseTaskSet--listReportFilter-btnGo").firePress();
                };

                // On failed validation, clear the field and search again
                const onError = () => {
                    console.log("error");
                    // obj.HeaderFilter[config.filterKey] = '';
                    // that._oComponent.getModel("globalDataModel").refresh(true);
                    // that.onSearch();
                };

                validateScan().then(onSuccess).catch(onError);

            },

            // Validates scanned value and resolves/rejects based on result
            _validateScanValue: function(path, filter, resolve, reject, messageText) {
                var url = "/sap/opu/odata/sap/ZSCM_PUTAWAY_SRV" + path

                $.ajax({
                    url: url,
                    type: "GET",
                    headers: {
                        "Accept": "application/json" // Ensure JSON response
                    },
                    success: function(response, textStatus, jqXHR) {
                        if (response.d.results.length > 0)
                            resolve(response);
                        else {
                            // Show message if no data found
                            var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                            MessageBox.error(messageText, {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            });
                            reject();
                        }

                    }.bind(this),
                    error: function(oError, status, error) {
                        const errorMsg = oError?.responseText ? JSON.parse(oError.responseText).error.message : "Unknown error";
                        reject(errorMsg);
                        this._handlePostingFailure.bind(this)(xhr.responseText);
                    }.bind(this)
                });

            }

        });
    }
);