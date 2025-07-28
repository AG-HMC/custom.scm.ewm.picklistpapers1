sap.ui.define(
    [
        'sap/ui/core/mvc/ControllerExtension',
        // ,'sap/ui/core/mvc/OverrideExecution'
        "scm/ewm/picklistpapers1/modelHelper/Global", 
        "scm/ewm/picklistpapers1/utils/util", 
        "scm/ewm/picklistpapers1/service/ODataService", 
        "sap/ndc/BarcodeScanner"
    ],
    function(
        ControllerExtension
        // ,OverrideExecution
        , Global, util, ODataService, BarcodeScanner
    ) {
        'use strict';
        return ControllerExtension.extend("customer.custom.scm.ewm.picklistpapers1.detailControllerExt", {
            // Triggered when the user presses the scan button for the destination bin
            onDestinationBinScanPress: function() {
                var that = this;
                // Launch barcode scanner
                BarcodeScanner.scan(
                    function(oResult) {
                        if (!oResult.cancelled) {
                            // Helper function to parse input text and get field based on prefix
                            function getFieldByAppIdentifier(inputText) {
                                const appIdMap = {
                                    "GTN": "PROD",  // Product
                                    "00": "HU",     // Handling Unit
                                    "Q04": "DST",   // Destination Storage Type
                                    "Q05": "DSB",   // Destination Storage Bin
                                    "10": "BATCH"   // Batch
                                };

                                // Sort keys to ensure longer prefixes are matched first
                                const sortedKeys = Object.keys(appIdMap).sort((a, b) => b.length - a.length);

                                 // To find a matching prefix
                                for (const key of sortedKeys) {
                                    if (inputText.startsWith(key)) {
                                        return {
                                            field: appIdMap[key],
                                            value: inputText.slice(key.length) // text without the identifier
                                        };
                                    }
                                }

                                return null; // Return null if no prefix matched
                            }

                            // Parse scanned text and call _updateBin with extracted value
                            var filtered = getFieldByAppIdentifier("Q05" + oResult.text);
                            this._updateBin.bind(this)(filtered.value);
                        }
                    }.bind(this),
                    function(oError) {
                        // Handle errors
                        sap.m.MessageToast.show("Scan failed: " + oError);
                    }
                );

            },
            // Internal function to update the destination storage bin
            _updateBin: function(i) {
                var w = Global.getWarehouseNumber(); // Get current warehouse number
                const url = window.location.href;

                // Use regex to extract key-value pairs inside the OData parentheses
                const match = url.match(/\(([^)]+)\)/);

                let EWMWarehouseTask = null;
                let WarehouseTaskItem = null;

                if (match && match[1]) {
                    const params = match[1].split(",");
                    params.forEach(param => {
                        const [key, rawValue] = param.split("=");
                        const value = rawValue?.replace(/^'|'$/g, ""); // remove single quotes
                        // Assign values to relevant variables
                        if (key === "EWMWarehouseTask") {
                            EWMWarehouseTask = value;
                        }
                        if (key === "WarehouseTaskItem") {
                            WarehouseTaskItem = value;
                        }
                    });
                }

                // console.log("EWMWarehouseTask:", EWMWarehouseTask);
                // console.log("WarehouseTaskItem:", WarehouseTaskItem);

                // Build path to OData property
                const path = "/WarehouseTaskSet(EWMWarehouse='" + w + "',EWMWarehouseTask='" + EWMWarehouseTask + "',WarehouseTaskItem='" + WarehouseTaskItem + "')/DestinationStorageBin"
                // Update the property and refresh the model
                this.getView().getModel().setProperty(path, i);
                this.getView().getModel().refresh(true);

                // Get relevant UI elements
                var n = this.getView().byId("dest-bin-input");
                var R = this.getView().getModel("i18n").getResourceBundle().getText("removeDestinationHU");
                var t = this.getView().byId("dest-hu-select");
                var P = this.getView().byId('maintain-pick-hu-button');
                this.getView().setBusy(true);

                // Call service to get UI settings for the destination HU input
                ODataService.getDestHUUIInfo(i, w).then(function(u) {
                        if (!u.GetDestHUUIInfo.isAllowedToEdit && t.getValue() !== "") {
                            M.warning(R, {
                                actions: [M.Action.OK, M.Action.CANCEL],
                                emphasizedAction: M.Action.OK,
                                onClose: function(A) {
                                    if (A === M.Action.OK) {
                                        t.setValue("");
                                        t.setEditable(u.GetDestHUUIInfo.isAllowedToEdit);
                                        t.setRequired(u.GetDestHUUIInfo.isObligatoryToInput);
                                        P.setVisible(u.GetDestHUUIInfo.isAllowedToEdit);
                                    } else {
                                        n.setValue(l);
                                    }
                                }
                            });
                        } else {
                            t.setEditable(u.GetDestHUUIInfo.isAllowedToEdit);
                            t.setRequired(u.GetDestHUUIInfo.isObligatoryToInput);
                            P.setVisible(u.GetDestHUUIInfo.isAllowedToEdit);
                        }
                    }
                    .bind(this)).finally(function() {
                        this.getView().setBusy(false);
                    }
                    .bind(this));
            },
            onStorageBinInfoPress: function(oEvent) {
                // sap.m.MessageToast.show("Not implemented");
                if(!this._oPopover){
                this._oPopover = new sap.m.Popover({
                    placement: sap.m.PlacementType.Bottom,
                    contentWidth: "200px",
                    showHeader: false,
                    content: new sap.m.Text({ id: "popoverText", text: "" }) // initially empty
                });
                this.getView().addDependent(this._oPopover);
            }
            this._fetchDesc(oEvent.getSource().getParent().getFields()[0].getText(), Global.getWarehouseNumber(),oEvent.getSource()).bind(this)();
            },
            onDestinationBinInfoPress: function(oEvent) {
                if(!this._oPopover){
                    // this._oPopover = new sap.m.Popover({
                    //     placement: sap.m.PlacementType.Bottom,
                    //     contentWidth: "200px",
                    //     showHeader: false,
                    //     content: new sap.m.Text({ id: "popoverText", text: "" }) // initially empty
                    // });
                    var oObjectStatus = new sap.m.ObjectStatus({
                        id: "popoverText",
                        inverted: true,
                        active: true,
                        state: "Indication07"
                    });
                    oObjectStatus.addStyleClass("sapUiSmallMarginBottom");
                    var oVerticalLayout = new sap.ui.layout.VerticalLayout({
                        width: "100%",
                        content: [oObjectStatus]
                    });
                    oVerticalLayout.addStyleClass("sapUiContentPadding");
                    this._oPopover = new sap.m.Popover({
                        // placement: sap.m.PlacementType.Bottom,
                        contentWidth: "auto",
                        showHeader: false,
                        content: oVerticalLayout
                    });
                    
                    this.getView().addDependent(this._oPopover);
                }
                this._fetchDesc(oEvent.getSource().getParent().getFields()[0].getValue(), Global.getWarehouseNumber(),oEvent.getSource()).bind(this)();
            },
            _fetchDesc: function(bin, warehouse, source){
                var url = "/sap/opu/odata/sap/ZSCM_BIN_DESC_SRV/ZSCM_C_StorageBin_Desc?$filter=Lgnum eq '"+warehouse+"' and Lgpla eq '"+bin+"'"

                $.ajax({
                    url: url,
                    type: "GET",
                    headers: {
                        "Accept": "application/json" // Ensure JSON response
                    },
                    success: function(response, textStatus, jqXHR) {
                        if (response.d.results.length > 0){
                        sap.ui.getCore().byId("popoverText").setText(response.d.results[0].Lgobe);

                        // Open the popover by the source control
                        this._oPopover.openBy(source);
                        }

                    }.bind(this),
                    error: function(oError, status, error) {
                        
                    }.bind(this)
                });

            }
        });
    }
);