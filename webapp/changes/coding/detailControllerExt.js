sap.ui.define(
    [
        'sap/ui/core/mvc/ControllerExtension',
        // ,'sap/ui/core/mvc/OverrideExecution'
        "scm/ewm/picklistpapers1/modelHelper/Global", "scm/ewm/picklistpapers1/utils/util", "scm/ewm/picklistpapers1/service/ODataService", "sap/ndc/BarcodeScanner"
    ],
    function(
        ControllerExtension
        // ,OverrideExecution
        , Global, util, ODataService, BarcodeScanner
    ) {
        'use strict';
        return ControllerExtension.extend("customer.custom.scm.ewm.picklistpapers1.detailControllerExt", {
            onDestinationBinScanPress: function() {
                var that = this;

                BarcodeScanner.scan(
                    function(oResult) {
                        if (!oResult.cancelled) {
                            // Success: Handle the scanned text
                            // sap.m.MessageToast.show("Scanned: " + oResult.text);
                            // Example: Set scanned value to a field
                            // that.byId("myInput").setValue(oResult.text);
                            function getFieldByAppIdentifier(inputText) {
                                const appIdMap = {
                                    "GTN": "PROD",
                                    "00": "HU",
                                    "Q04": "DST",
                                    "Q05": "DSB",
                                    "10": "BATCH"
                                };

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
                            var filtered = getFieldByAppIdentifier("Q05"+oResult.text);
                            this._updateBin.bind(this)(filtered.value);
                        }
                    }.bind(this),
                    function(oError) {
                        // Handle errors
                        sap.m.MessageToast.show("Scan failed: " + oError);
                    }
                );

            },
            _updateBin: function(i) {
                var w = Global.getWarehouseNumber();
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

                        if (key === "EWMWarehouseTask") {
                            EWMWarehouseTask = value;
                        }
                        if (key === "WarehouseTaskItem") {
                            WarehouseTaskItem = value;
                        }
                    });
                }

                console.log("EWMWarehouseTask:", EWMWarehouseTask);
                console.log("WarehouseTaskItem:", WarehouseTaskItem);
                const path = "/WarehouseTaskSet(EWMWarehouse='" + w + "',EWMWarehouseTask='" + EWMWarehouseTask + "',WarehouseTaskItem='" + WarehouseTaskItem + "')/DestinationStorageBin"
                this.getView().getModel().setProperty(path, i);
                this.getView().getModel().refresh(true);
                var n = this.getView().byId("dest-bin-input");
                var R = this.getView().getModel("i18n").getResourceBundle().getText("removeDestinationHU");
                var t = this.getView().byId("dest-hu-select");
                var P = this.getView().byId('maintain-pick-hu-button');
                this.getView().setBusy(true);
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
            onStorageBinInfoPress: function() {
                sap.m.MessageToast.show("Not implemented");
            },
            onDestinationBinInfoPress: function() {
                sap.m.MessageToast.show("Not implemented");
            }
            // metadata: {
            // 	// extension can declare the public methods
            // 	// in general methods that start with "_" are private
            // 	methods: {
            // 		publicMethod: {
            // 			public: true /*default*/ ,
            // 			final: false /*default*/ ,
            // 			overrideExecution: OverrideExecution.Instead /*default*/
            // 		},
            // 		finalPublicMethod: {
            // 			final: true
            // 		},
            // 		onMyHook: {
            // 			public: true /*default*/ ,
            // 			final: false /*default*/ ,
            // 			overrideExecution: OverrideExecution.After
            // 		},
            // 		couldBePrivate: {
            // 			public: false
            // 		}
            // 	}
            // },
            // // adding a private method, only accessible from this controller extension
            // _privateMethod: function() {},
            // // adding a public method, might be called from or overridden by other controller extensions as well
            // publicMethod: function() {},
            // // adding final public method, might be called from, but not overridden by other controller extensions as well
            // finalPublicMethod: function() {},
            // // adding a hook method, might be called by or overridden from other controller extensions
            // // override these method does not replace the implementation, but executes after the original method
            // onMyHook: function() {},
            // // method public per default, but made private via metadata
            // couldBePrivate: function() {},
            // // this section allows to extend lifecycle hooks or override public methods of the base controller
            // override: {
            // 	/**
            // 	 * Called when a controller is instantiated and its View controls (if available) are already created.
            // 	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
            // 	 * @memberOf customer.custom.scm.ewm.picklistpapers1.detailControllerExt
            // 	 */
            // 	onInit: function() {
            // 	},
            // 	/**
            // 	 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
            // 	 * (NOT before the first rendering! onInit() is used for that one!).
            // 	 * @memberOf customer.custom.scm.ewm.picklistpapers1.detailControllerExt
            // 	 */
            // 	onBeforeRendering: function() {
            // 	},
            // 	/**
            // 	 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
            // 	 * This hook is the same one that SAPUI5 controls get after being rendered.
            // 	 * @memberOf customer.custom.scm.ewm.picklistpapers1.detailControllerExt
            // 	 */
            // 	onAfterRendering: function() {
            // 	},
            // 	/**
            // 	 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
            // 	 * @memberOf customer.custom.scm.ewm.picklistpapers1.detailControllerExt
            // 	 */
            // 	onExit: function() {
            // 	},
            // 	// override public method of the base controller
            // 	basePublicMethod: function() {
            // 	}
            // }
        });
    }
);