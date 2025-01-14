const ABViewCSVImporterCore = require("../../core/views/ABViewCSVImporterCore");
// import ClassUI from "../../../ui/ClassUI";
const ClassUI = require("../../../ui/ClassUI").default;

const CSVImporter = require("../CSVImporter");
const ABRecordRule = require("../../rules/ABViewRuleListFormRecordRules");

const ABViewCSVImporterPropertyComponentDefaults =
   ABViewCSVImporterCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);
// multilingual Label fn()

let PopupRecordRule = null;

class ABViewCSVImporterComponent extends ClassUI {
   constructor(viewCSVImporter, idBase) {
      idBase = idBase || `ABCSVImporter_${viewCSVImporter.id}`;

      super(idBase, {
         button: "",
         popup: "",

         form: "",
         uploader: "",
         uploadFileList: "",
         separatedBy: "",
         headerOnFirstLine: "",
         columnList: "",

         search: "",
         datatable: "",

         statusMessage: "",
         progressBar: "",

         importButton: "",
         rules: "",
      });

      this.viewCSVImporter = viewCSVImporter;
      // {ABViewCSVImporter}
      // The ABView that has created this CSVImporter.

      this.settings = this.viewCSVImporter.settings;
      // {json}
      // a local copy of the settings for our ABView

      this.csvImporter = new CSVImporter(L);
      // {CSVImporter}
      // An instance of the object that imports the CSV data.

      this._dataRows = null;

      this.CurrentObjectID = null;
      // {string}
      // the ABObject.id of the object we are working with.

      this._csvFileInfo = null;

      this.validationError = false;
   }

   ui() {
      return {
         cols: [
            {
               view: "button",
               css: "webix_primary",
               type: "icon",
               icon: "fa fa-upload",
               label: L(
                  this.settings.buttonLabel ||
                     ABViewCSVImporterPropertyComponentDefaults.buttonLabel
               ),
               width:
                  this.settings.width ||
                  ABViewCSVImporterPropertyComponentDefaults.width,
               click: () => {
                  this.showPopup();
               },
            },
            {
               fillspace: true,
            },
         ],
      };
   }

   uiConfig() {
      var ids = this.ids;

      return {
         view: "form",
         type: "clean",
         id: ids.form,
         borderless: true,
         minWidth: 400,
         gravity: 1,
         elements: [
            {
               rows: [
                  {
                     id: ids.uploader,
                     view: "uploader",
                     name: "csvFile",
                     css: "webix_primary",
                     value: L("Choose a CSV file"),
                     accept: "text/csv",
                     multiple: false,
                     autosend: false,
                     link: ids.uploadFileList,
                     on: {
                        onBeforeFileAdd: (fileInfo) => {
                           this._csvFileInfo = fileInfo;
                           return this.loadCsvFile();
                        },
                     },
                  },
                  {
                     id: ids.uploadFileList,
                     name: "uploadedFile",
                     view: "list",
                     type: "uploader",
                     autoheight: true,
                     borderless: true,
                     onClick: {
                        webix_remove_upload: (e, id /*, trg */) => {
                           this.removeCsvFile(id);
                        },
                     },
                  },
                  {
                     padding: 10,
                     rows: [
                        {
                           id: ids.separatedBy,
                           view: "richselect",
                           name: "separatedBy",
                           label: L("Separated by"),
                           labelWidth: 140,
                           options: this.csvImporter.getSeparateItems(),
                           value: ",",
                           on: {
                              onChange: () => {
                                 this.loadCsvFile();
                              },
                           },
                        },
                        {
                           id: ids.headerOnFirstLine,
                           view: "checkbox",
                           name: "headerOnFirstLine",
                           label: L("Header on first line"),
                           labelWidth: 140,
                           disabled: true,
                           value: true,
                           on: {
                              onChange: (/*newVal, oldVal*/) => {
                                 this.populateColumnList();
                              },
                           },
                        },
                     ],
                  },
                  {
                     type: "space",
                     rows: [
                        {
                           view: "scrollview",
                           minHeight: 300,
                           body: {
                              padding: 10,
                              id: ids.columnList,
                              rows: [],
                           },
                        },
                     ],
                  },
               ],
            },
         ],
      };
   }

   uiRecordsView() {
      var ids = this.ids;
      return {
         gravity: 2,
         rows: [
            {
               view: "toolbar",
               css: "bg_gray",
               cols: [
                  { width: 5 },
                  {
                     id: ids.search,
                     view: "search",
                     value: "",
                     label: "",
                     placeholder: L("Search records..."),
                     keyPressTimeout: 200,
                     on: {
                        onTimedKeyPress: () => {
                           let text = $$(ids.search).getValue();
                           this.search(text);
                        },
                     },
                  },
                  { width: 2 },
               ],
            },
            {
               id: ids.datatable,
               view: "datatable",
               resizeColumn: true,
               editable: true,
               editaction: "dblclick",
               css: "ab-csv-importer",
               borderless: false,
               tooltip: (obj) => {
                  var tooltip = obj._errorMsg
                     ? obj._errorMsg
                     : "No validation errors";
                  return tooltip;
               },
               minWidth: 650,
               columns: [],
               on: {
                  onValidationError: function (id, obj, details) {
                     // console.log(`item ${id} invalid`);
                     var errors = "";
                     Object.keys(details).forEach((key) => {
                        this.$view.complexValidations[key].forEach((err) => {
                           errors += err.invalidMessage + "</br>";
                        });
                     });
                     var $dt = $$(ids.datatable);
                     $dt.blockEvent();
                     $dt.updateItem(id, {
                        _status: "invalid",
                        _errorMsg: errors,
                     });
                     $dt.unblockEvent();
                     this.validationError = true;
                  },
                  onValidationSuccess: function (id, obj, details) {
                     // console.log(`item ${id} valid`);
                     var $dt = $$(ids.datatable);
                     $dt.blockEvent();
                     $dt.updateItem(id, {
                        _status: "valid",
                        _errorMsg: "",
                     });
                     $dt.unblockEvent();
                     this.validationError = false;
                  },
                  onCheck: () => {
                     var selected = $$(ids.datatable).find({ _included: true });
                     $$(ids.importButton).setValue(this.labelImport(selected));
                     if (this.overLimitAlert(selected)) {
                        $$(ids.importButton).disable();
                     } else {
                        $$(ids.importButton).enable();
                     }
                  },
               },
            },
            {
               id: ids.progressBar,
               height: 6,
            },
            {
               view: "button",
               name: "import",
               id: ids.importButton,
               value: L("Import"),
               css: "webix_primary",
               disabled: true,
               click: () => {
                  this.import();
               },
            },
         ],
      };
   }

   uiPopup() {
      var ids = this.ids;

      return {
         id: ids.popup,
         view: "window",
         hidden: true,
         position: "center",
         modal: true,
         resize: true,
         head: {
            view: "toolbar",
            css: "webix_dark",
            cols: [
               {},
               {
                  view: "label",
                  label: L("CSV Importer"),
                  autowidth: true,
               },
               {},
               {
                  view: "button",
                  width: 35,
                  css: "webix_transparent",
                  type: "icon",
                  icon: "nomargin fa fa-times",
                  click: () => {
                     this.hide();
                  },
               },
            ],
         },
         body: {
            type: "form",
            rows: [
               {
                  type: "line",
                  cols: [
                     this.uiConfig(),
                     { width: 20 },
                     this.uiRecordsView(),
                     { width: 1 },
                  ],
               },
               {
                  id: ids.statusMessage,
                  view: "label",
                  align: "right",
                  hidden: true,
               },
               {
                  hidden: true,
                  margin: 5,
                  cols: [
                     { fillspace: true },
                     {
                        view: "button",
                        name: "cancel",
                        value: L("Cancel"),
                        css: "ab-cancel-button",
                        autowidth: true,
                        click: () => {
                           this.hide();
                        },
                     },
                     /*,
                        {
                           view: "button",
                           name: "import",
                           id: ids.importButton,
                           value: labels.component.import,
                           css: "webix_primary",
                           disabled: true,
                           autowidth: true,
                           type: "form",
                           click: () => {
                              _logic.import();
                           }
                        }*/
                  ],
               },
            ],
         },
      };
   }

   /**
    * @method CurrentObject()
    * A helper to return the current ABObject we are working with.
    * @return {ABObject}
    */
   get CurrentObject() {
      return this.AB.objectByID(this.CurrentObjectID);
   }

   objectLoad(object) {
      this.CurrentObjectID = object?.id;
   }

   init(AB) {
      this.AB = AB;
      var ids = this.ids;

      // Populate values to rules

      let selectedDv = this.viewCSVImporter.datacollection;

      if (selectedDv) {
         this.CurrentObjectID = selectedDv.datasource.id;
      }

      webix.ui(this.uiPopup());

      if ($$(ids.form)) webix.extend($$(ids.form), webix.ProgressBar);
      if ($$(ids.progressBar))
         webix.extend($$(ids.progressBar), webix.ProgressBar);
   }

   showPopup() {
      $$(this.ids.popup)?.show();

      this.formClear();

      // open file dialog to upload
      $$(this.ids.uploader).fileDialog();
   }

   hide() {
      $$(this.ids.popup)?.hide();
   }

   formClear() {
      var ids = this.ids;
      this._dataRows = null;
      this._csvFileInfo = null;

      $$(ids.form).clearValidation();
      $$(ids.form).clear();
      $$(ids.separatedBy).setValue(",");

      webix.ui([], $$(ids.columnList));

      $$(ids.headerOnFirstLine).disable();
      $$(ids.importButton).disable();

      $$(ids.search).setValue("");
      $$(ids.uploadFileList).clearAll();
      $$(ids.datatable).clearAll();

      $$(ids.statusMessage).setValue("");
      $$(ids.statusMessage).hide();
   }

   search(searchText) {
      let $datatable = $$(this.ids.datatable);
      if (!$datatable) return;

      searchText = (searchText || "").toLowerCase();

      let matchFields = this.getMatchFields();

      $datatable.filter((row) => {
         let exists = false;

         (matchFields || []).forEach((f) => {
            if (exists) return;

            exists =
               (row[`${f.columnIndex}`] || "")
                  .toString()
                  .toLowerCase()
                  .indexOf(searchText) > -1;
         });

         return exists;
      });
   }

   statusTemplate(item) {
      let template = "";

      if (!item) return template;

      switch (item._status) {
         case "in-progress":
            template = "<span class='fa fa-refresh'></span>";
            break;
         case "invalid":
            template = "<span class='fa fa-exclamation-triangle'></span>";
            break;
         case "valid":
            template = "<span class='fa fa-check'></span>";
            break;
         case "done":
            template = "<span class='fa fa-check'></span>";
            break;
         case "fail":
            template = "<span class='fa fa-remove'></span>";
            break;
      }

      return template;
   }

   async loadCsvFile() {
      if (!this._csvFileInfo) return false;

      if (!this.csvImporter.validateFile(this._csvFileInfo)) {
         webix.alert({
            title: L("This file extension is not allowed"),
            text: L("Please only upload CSV files"),
            ok: L("Ok"),
         });

         return false;
      }

      var ids = this.ids;

      // show loading cursor
      $$(ids.form)?.showProgress?.({ type: "icon" });

      // read CSV file
      let separatedBy = $$(ids.separatedBy).getValue();
      this._dataRows = await this.csvImporter.getDataRows(
         this._csvFileInfo,
         separatedBy
      );

      $$(ids.headerOnFirstLine).enable();
      $$(ids.importButton).enable();
      let length = this._dataRows.length;
      if ($$(ids.headerOnFirstLine).getValue()) {
         length = this._dataRows.length - 1;
      }
      $$(ids.importButton).setValue(this.labelImport(length));

      this.populateColumnList();

      $$(ids.form)?.hideProgress?.();

      return true;
   }

   removeCsvFile(fileId) {
      $$(this.ids.uploadFileList).remove(fileId);
      this.formClear();
      return true;
   }

   populateColumnList() {
      var ids = this.ids;
      var self = this;

      // clear list
      webix.ui([], $$(ids.columnList));

      if (this._dataRows == null) return;

      // check first line of CSV
      let firstLine = this._dataRows[0];
      if (firstLine == null) return;

      let csvColumnList = [];
      let fieldList = [];
      if (this.CurrentObject) {
         fieldList =
            this.CurrentObject.fields((f) => {
               // available fields
               if (
                  this.settings.availableFieldIds?.length &&
                  this.settings.availableFieldIds.indexOf(f.id) < 0
               ) {
                  return false;
               }

               // filter editable fields
               let formComp = f.formComponent();
               if (!formComp) return true;

               let formConfig = formComp.common();
               if (!formConfig) return true;

               return formConfig.key != "fieldreadonly";
            }) || [];
      }
      // check first line be header columns
      if ($$(ids.headerOnFirstLine).getValue()) {
         csvColumnList = firstLine.map((colName, index) => {
            return {
               id: index + 1, // webix .options list disallow value 0
               value: colName,
               key: this.csvImporter.getGuessDataType(this._dataRows, index),
            };
         });
      } else {
         for (let i = 0; i < firstLine.length; i++) {
            csvColumnList.push({
               id: i + 1, // webix .options list disallow value 0
               value: L("Column {0}", [i + 1]),
               key: this.csvImporter.getGuessDataType(this._dataRows, i),
            });
         }
      }

      // Add unselect item
      csvColumnList.unshift({
         id: "none",
         value: L("None"),
      });

      // populate columns to UI
      let uiColumns = [];
      let selectedCsvCols = [];
      fieldList.forEach((f) => {
         let selectVal = "none";

         // match up by data type
         let matchCol = csvColumnList.filter(
            (c) => c.key == f.key && selectedCsvCols.indexOf(c.id) < 0
         )[0];
         if (matchCol) {
            selectVal = matchCol.id;

            // cache
            selectedCsvCols.push(selectVal);
         }

         let columnOptUI = {
            view: "richselect",
            gravity: 2,
            options: csvColumnList,
            fieldId: f.id,
            abName: "columnIndex",
            value: selectVal,
            on: {
               onChange: function () {
                  self.toggleLinkFields(this);
                  self.loadDataToGrid();
               },
            },
         };

         // Add date format options
         if (f.key == "date") {
            let dateSeparatorOptions = ["/", "-", ".", ",", " "];
            let dayFormatOptions = [
               { value: L("1 to 31"), id: "D" },
               { value: L("01 to 31"), id: "DD" },
            ];
            let monthFormatOptions = [
               { value: L("1 to 12"), id: "M" },
               { value: L("01 to 12"), id: "MM" },
            ];
            let yearFormatOptions = [
               { value: L("00 to 99"), id: "YY" },
               { value: L("2000 to 2099"), id: "YYYY" },
            ];
            let dateOrderOptions = [
               {
                  value: L("D-M-Y"),
                  id: 1,
               },
               {
                  value: L("M-D-Y"),
                  id: 2,
               },
               {
                  value: L("Y-M-D"),
                  id: 3,
               },
               {
                  value: L("Y-D-M"),
                  id: 4,
               },
            ];

            columnOptUI = {
               gravity: 2,
               rows: [
                  columnOptUI,
                  {
                     view: "richselect",
                     label: L("Separator"),
                     labelWidth: 100,
                     on: {
                        onChange: () => {
                           this.loadDataToGrid();
                        },
                     },
                     name: "separator",
                     abName: "columnDateFormat",
                     options: dateSeparatorOptions,
                     value: "/",
                  },
                  {
                     view: "richselect",
                     label: L("Day"),
                     labelWidth: 100,
                     on: {
                        onChange: () => {
                           this.loadDataToGrid();
                        },
                     },
                     name: "day",
                     abName: "columnDateFormat",
                     options: dayFormatOptions,
                     value: "D",
                  },
                  {
                     view: "richselect",
                     label: L("Month"),
                     labelWidth: 100,
                     on: {
                        onChange: () => {
                           this.loadDataToGrid();
                        },
                     },
                     name: "month",
                     abName: "columnDateFormat",
                     options: monthFormatOptions,
                     value: "M",
                  },
                  {
                     view: "richselect",
                     label: L("Year"),
                     labelWidth: 100,
                     on: {
                        onChange: () => {
                           this.loadDataToGrid();
                        },
                     },
                     name: "year",
                     abName: "columnDateFormat",
                     options: yearFormatOptions,
                     value: "YY",
                  },
                  {
                     view: "richselect",
                     label: L("Order"),
                     labelWidth: 100,
                     on: {
                        onChange: () => {
                           this.loadDataToGrid();
                        },
                     },
                     name: "order",
                     abName: "columnDateFormat",
                     options: dateOrderOptions,
                     value: 1,
                  },
               ],
            };
         }

         // Add connected field options
         if (f.isConnection) {
            let linkFieldOptions = [];

            if (f.datasourceLink) {
               linkFieldOptions = f.datasourceLink
                  .fields((fld) => !fld.isConnection)
                  .map((fld) => {
                     return {
                        id: fld.id,
                        value: fld.label,
                     };
                  });
            }

            columnOptUI = {
               gravity: 2,
               rows: [
                  columnOptUI,
                  {
                     view: "richselect",
                     label: "=",
                     labelWidth: 20,
                     abName: "columnLinkData",
                     hidden: true,
                     options: linkFieldOptions,
                     value: linkFieldOptions[0] ? linkFieldOptions[0].id : null,
                  },
               ],
            };
         }

         uiColumns.push({
            view: "layout",
            borderless: true,
            cols: [
               {
                  view: "template",
                  gravity: 1,
                  borderless: true,
                  css: { "padding-top": 10 },
                  template: `<span class="fa fa-${f.icon}"></span> ${f.label}`,
               },
               columnOptUI,
            ],
         });
      });
      webix.ui(uiColumns, $$(ids.columnList));

      this.loadDataToGrid();
   }

   toggleLinkFields($columnOption) {
      if (!$columnOption) return;

      let $optionPanel = $columnOption.getParentView();
      let $linkFieldOption = $optionPanel.queryView(
         { abName: "columnLinkData" },
         "all"
      )[0];
      if (!$linkFieldOption) return;

      if ($columnOption.getValue() == "none") {
         $linkFieldOption.hide();
      } else {
         $linkFieldOption.show();
      }
   }

   overLimitAlert(data) {
      var limit = 1000;
      if (data.length > limit) {
         // we only allow 1000 record imports
         webix.alert({
            title: L("Too many records"),
            ok: L("Ok"),
            text: L(
               "Due to browser limitations we only allow imports of {0} records. Please upload a new CSV or deselect records to import.",
               [limit]
            ),
         });
         return true;
      }
      return false;
   }

   loadDataToGrid() {
      var ids = this.ids;
      let $datatable = $$(ids.datatable);
      if (!$datatable) return;

      $datatable.clearAll();

      // show loading cursor
      $datatable?.showProgress?.({ type: "icon" });

      /** Prepare Columns */
      let matchFields = this.getMatchFields();

      let columns = [];

      // add "status" column
      columns.push({
         id: "_status",
         header: "",
         template: this.statusTemplate,
         width: 30,
      });

      // add "checkbox" column
      columns.push({
         id: "_included",
         header: { content: "masterCheckbox" },
         template: "{common.checkbox()}",
         width: 30,
      });

      var fieldValidations = [];
      var rulePops = [];
      // populate columns
      (matchFields || []).forEach((f) => {
         var validationRules = f.field.settings.validationRules;
         // parse the rules because they were stored as a string
         // check if rules are still a string...if so lets parse them
         if (validationRules && typeof validationRules === "string") {
            validationRules = JSON.parse(validationRules);
         }

         if (validationRules && validationRules.length) {
            var validationUI = [];
            // there could be more than one so lets loop through and build the UI
            validationRules.forEach((rule) => {
               var Filter = this.AB.filterComplexNew(
                  `${f.field.id}_${webix.uid()}`
               );
               // add the new ui to an array so we can add them all at the same time
               validationUI.push(Filter.ui);
               // store the filter's info so we can assign values and settings after the ui is rendered
               fieldValidations.push({
                  filter: Filter,
                  view: Filter.ids.querybuilder,
                  columnName: f.field.id,
                  validationRules: rule.rules,
                  invalidMessage: rule.invalidMessage,
                  columnIndex: f.columnIndex,
               });
            });
            // create a unique view id for popup
            var popUpId = ids.rules + "_" + f.field.id + "_" + webix.uid();
            // store the popup ids so we can remove the later
            rulePops.push(popUpId);
            // add the popup to the UI but don't show it
            webix.ui({
               view: "popup",
               css: "ab-rules-popup",
               id: popUpId,
               body: {
                  rows: validationUI,
               },
            });
         }

         var editor = "text";
         switch (f.field.key) {
            case "number":
               editor = "number";
               break;
            default:
            // code block
         }
         columns.push({
            id: f.columnIndex,
            header: f.field.label,
            editor: editor,
            template: function (obj, common, value /*, col, ind */) {
               return value.replace(/[<]/g, "&lt;");
            },
            minWidth: 150,
            fillspace: true,
         });
      });

      if (fieldValidations.length) {
         // we need to store the rules for use later so lets build a container array
         var complexValidations = [];
         fieldValidations.forEach((f) => {
            // init each ui to have the properties (app and fields) of the object we are editing
            // f.filter.applicationLoad(App);
            f.filter.fieldsLoad(this.CurrentObject.fields());
            // now we can set the value because the fields are properly initialized
            f.filter.setValue(f.validationRules);
            // if there are validation rules present we need to store them in a lookup hash
            // so multiple rules can be stored on a single field
            if (!Array.isArray(complexValidations[f.columnName]))
               complexValidations[f.columnName] = [];

            // now we can push the rules into the hash
            complexValidations[f.columnName].push({
               filters: $$(f.view).getFilterHelper(),
               values: $$(ids.datatable).getSelectedItem(),
               invalidMessage: f.invalidMessage,
               columnIndex: f.columnIndex,
            });
         });
         var rules = {};
         var dataTable = $$(ids.datatable);
         // store the rules in a data param to be used later
         dataTable.$view.complexValidations = complexValidations;
         // use the lookup to build the validation rules
         Object.keys(complexValidations).forEach(function (key) {
            rules[key] = function (value, data) {
               // default valid is true
               var isValid = true;
               dataTable.$view.complexValidations[key].forEach((filter) => {
                  let rowValue = {};
                  // use helper funtion to check if valid
                  // map the column names to the index numbers of data
                  // reformat data to display
                  (matchFields || []).forEach((f) => {
                     let record = data[f.columnIndex];
                     if (
                        f.field.key == "date" &&
                        record.includes("Invalid date")
                     ) {
                        isValid = false;
                     }
                     rowValue[f.field.id] = record;
                  });
                  var ruleValid = filter.filters(rowValue);
                  // if invalid we need to tell the field
                  if (ruleValid == false) {
                     isValid = false;
                     // webix.message({
                     //    type: "error",
                     //    text: invalidMessage
                     // });
                  }
               });
               return isValid;
            };
         });
         // define validation rules
         dataTable.define("rules", rules);
         // store the array of view ids on the webix object so we can get it later
         dataTable.config.rulePops = rulePops;
         dataTable.refresh();
      } else {
         var dataTable = $$(ids.datatable);
         // check if the previous datatable had rule popups and remove them
         if (dataTable.config.rulePops) {
            dataTable.config.rulePops.forEach((popup) => {
               if ($$(popup)) $$(popup).destructor();
            });
         }
         // remove any validation rules from the previous table
         dataTable.define("rules", {});
         dataTable.refresh();
      }

      /** Prepare Data */
      let parsedData = [];

      (this._dataRows || []).forEach((row, index) => {
         let rowValue = {
            id: index + 1,
         };

         // reformat data to display
         (matchFields || []).forEach((f) => {
            let data = row[f.columnIndex - 1];

            if (f.field.key == "date") {
               // let dateFormat = moment(data, f.format).format(
               //    "YYYY-MM-DD"
               // );
               // debugger;
               let dateFormat = this.AB.toDate(data, { format: f.format });
               dateFormat = this.AB.toDateFormat(dateFormat, {
                  format: "YYYY-MM-DD",
               });
               if (dateFormat == "Invalid date") {
                  dateFormat = dateFormat + " - " + data;
               }
               rowValue[f.columnIndex] = dateFormat;
            } else {
               rowValue[f.columnIndex] = data; // array to object
            }
         });

         // insert "true" value of checkbox
         rowValue["_included"] = true;

         parsedData.push(rowValue);
      });

      // skip the first line
      let isSkipFirstLine = $$(ids.headerOnFirstLine).getValue();
      if (isSkipFirstLine && parsedData.length > 1) {
         parsedData = parsedData.slice(1);
      }

      $$(ids.importButton).setValue(this.labelImport(parsedData));

      $datatable.refreshColumns(columns);

      $datatable.parse(parsedData);

      if (this.overLimitAlert(parsedData)) {
         $$(ids.importButton).disable();
      } else {
         $$(ids.importButton).enable();
      }

      // hide loading cursor
      $datatable?.hideProgress?.();
   }

   refreshRemainingTimeText(startUpdateTime, total, index) {
      const ids = this.ids;

      // Calculate remaining time
      let spentTime = new Date() - startUpdateTime; // milliseconds that has passed since last completed record since start

      let averageRenderTime = spentTime / index; // average milliseconds per single render at this point

      let remainTime = averageRenderTime * (total - index);

      let result = "";

      // Convert milliseconds to a readable string
      let days = (remainTime / 86400000).toFixed(0);
      let hours = (remainTime / 3600000).toFixed(0);
      let minutes = (remainTime / 60000).toFixed(0);
      let seconds = (remainTime / 1000).toFixed(0);

      if (seconds < 1) result = "";
      else if (seconds < 60)
         result = L("Approximately {0} second(s) remaining", [seconds]);
      // result = `Approximately ${seconds} second${
      //    seconds > 1 ? "s" : ""
      // }`;
      else if (minutes == 1)
         result = L("Approximately 1 minute {0} seconds remaining", [
            seconds - 60,
         ]);
      // result = `Approximately 1 minute ${seconds - 60} seconds`;
      else if (minutes < 60)
         result = L("Approximately {0} minutes remaining", [minutes]);
      else if (hours < 24)
         result = L("Approximately {0} hour(s) remaining", [hours]);
      else result = L("Approximately {0} day(s) remaining", [days]);

      if (result) {
         $$(ids.importButton)?.setValue(result);
      } else {
         const selected = $$(ids.datatable)?.find({ _included: true });
         $$(ids.importButton)?.setValue(this.labelImport(selected));
      }
   }

   /**
    * @method getMatchFields
    *
    * @return {Object} - [
    *                      {
    *                         columnIndex: {number},
    *                         field: {ABField},
    *                         searchField: {ABField} [optional]
    *                      },
    *                      ...
    *                    ]
    */
   getMatchFields() {
      let result = [];
      var ids = this.ids;

      // get richselect components
      let $selectorViews = $$(ids.columnList)
         .queryView({ abName: "columnIndex" }, "all")
         .filter((selector) => selector.getValue() != "none");

      ($selectorViews || []).forEach(($selector) => {
         if (!this.CurrentObject) return;

         // webix .options list disallow value 0
         let colIndex = $selector.getValue();

         let field = this.CurrentObject.fieldByID($selector.config.fieldId);
         if (!field) return;

         let fieldData = {
            columnIndex: colIndex,
            field: field,
         };

         if (field.key == "date") {
            let $optionPanel = $selector.getParentView();
            let $dateFormatSelectors = $optionPanel.queryView(
               { abName: "columnDateFormat" },
               "all"
            );

            // define the column to compare data to search .id
            if ($dateFormatSelectors) {
               $dateFormatSelectors.forEach((selector) => {
                  fieldData[selector.config.name] = selector.getValue();
               });

               // convert all dates into mysql date format YYYY-DD-MM
               var format;
               switch (fieldData.order) {
                  case "1":
                     format =
                        fieldData.day +
                        fieldData.separator +
                        fieldData.month +
                        fieldData.separator +
                        fieldData.year;
                     break;
                  case "2":
                     format =
                        fieldData.month +
                        fieldData.separator +
                        fieldData.day +
                        fieldData.separator +
                        fieldData.year;
                     break;
                  case "3":
                     format =
                        fieldData.year +
                        fieldData.separator +
                        fieldData.month +
                        fieldData.separator +
                        fieldData.day;
                     break;
                  case "4":
                     format =
                        fieldData.year +
                        fieldData.separator +
                        fieldData.day +
                        fieldData.separator +
                        fieldData.month;
               }
               fieldData.format = format;
            }
         }

         if (field.isConnection) {
            let $optionPanel = $selector.getParentView();
            let $linkDataSelector = $optionPanel.queryView(
               { abName: "columnLinkData" },
               "all"
            )[0];

            // define the column to compare data to search .id
            if ($linkDataSelector) {
               let searchField = field.datasourceLink.fieldByID(
                  $linkDataSelector.getValue()
               );
               fieldData.searchField = searchField;
            }
         }

         result.push(fieldData);
      });

      return result;
   }

   labelImport(selected) {
      var length = selected;
      if (Array.isArray(selected)) length = selected.length;

      return L("Import {0} Records", [length]);
   }

   /**
    * @method import
    *
    * @return {Promise}
    */
   import() {
      // get ABDatacollection
      let dv = this.viewCSVImporter.datacollection;
      // if (dv == null) return Promise.resolve();

      // // get ABObject
      // let obj = dv.datasource;

      // Make sure we are connected to an Object
      let obj = this.CurrentObject;
      if (obj == null) return Promise.resolve();

      // get ABModel
      // let model = dv.model;
      // if (model == null) return Promise.resolve();

      var ids = this.ids;
      $$(ids.importButton).disable();

      // Show loading cursor
      $$(ids.form).showProgress({ type: "icon" });
      $$(ids.progressBar).showProgress({
         type: "top",
         position: 0.0001,
      });

      // get richselect components
      let matchFields = this.getMatchFields();

      // Get object's model
      let objModel = this.CurrentObject.model();

      let selectedRows = $$(ids.datatable).find({ _included: true });

      let _currProgress = 0;
      let increaseProgressing = () => {
         _currProgress += 1;
         $$(ids.progressBar).showProgress({
            type: "bottom",
            position: _currProgress / selectedRows.length,
         });
      };

      let itemFailed = (itemId, errMessage) => {
         let $datatable = $$(ids.datatable);
         if ($datatable) {
            // set "fail" status
            $datatable.addRowCss(itemId, "row-fail");
            $datatable.blockEvent();
            $datatable.updateItem(itemId, {
               _status: "fail",
               _errorMsg: errMessage,
            });
            $datatable.unblockEvent();
         }
         increaseProgressing();

         console.error(errMessage);
      };

      let itemInvalid = (itemId, errors = []) => {
         let $datatable = $$(ids.datatable);
         if ($datatable) {
            // combine all error messages to display in tooltip
            let errorMsg = [];
            // mark which column are invalid
            errors.forEach((err) => {
               if (!err || !err.name) return;
               let fieldInfo = matchFields.filter(
                  (f) => f.field && f.field.columnName == err.name
               )[0];
               errorMsg.push(err.name + ": " + err.message);
               // we also need to define an error message
               // webix.message({
               //    type: "error",
               //    text: err.name + ": " + err.message
               // });
            });
            // set "fail" status
            $$(ids.datatable).blockEvent();
            $$(ids.datatable).updateItem(itemId, {
               _status: "invalid",
               _errorMsg: errorMsg.join("</br>"),
            });
            $$(ids.datatable).unblockEvent();
            $datatable.addRowCss(itemId, "webix_invalid");
         }
         // increaseProgressing();
      };

      let itemPass = (itemId) => {
         let $datatable = $$(ids.datatable);
         if ($datatable) {
            // set "done" status
            $datatable.removeRowCss(itemId, "row-fail");
            $datatable.addRowCss(itemId, "row-pass");
            $datatable.blockEvent();
            $datatable.updateItem(itemId, {
               _status: "done",
               _errorMsg: "",
            });
            $datatable.unblockEvent();
         }
         increaseProgressing();
      };

      let itemValid = (itemId) => {
         let $datatable = $$(ids.datatable);
         if ($datatable) {
            // mark all columns valid (just in case they were invalid before)
            // matchFields.forEach((f) => {
            //    $datatable.removeCellCss(
            //       itemId,
            //       f.columnIndex,
            //       "webix_invalid_cell"
            //    );
            // });
            // highlight the row
            $datatable.removeRowCss(itemId, "webix_invalid");
            $datatable.blockEvent();
            $datatable.updateItem(itemId, {
               _status: "",
               _errorMsg: "",
            });
            $datatable.unblockEvent();
            // $datatable.addRowCss(itemId, "row-pass");
         }
      };

      let uiCleanUp = () => {
         // To Do anyUI updates
         // console.log("ui clean up now");
         $$(ids.importButton).enable();

         // Hide loading cursor
         $$(ids.form).hideProgress();
         $$(ids.progressBar).hideProgress();
         $$(ids.statusMessage).setValue("");
         $$(ids.statusMessage).hide();

         var selected = $$(ids.datatable).find({ _included: true });
         $$(ids.importButton).setValue(this.labelImport(selected));

         this.emit("done");
      };

      // Set parent's data collection cursor
      let dcLink = dv?.datacollectionLink;
      let objectLink;
      let linkConnectFields = [];
      let linkValues;
      if (dcLink && dcLink.getCursor()) {
         objectLink = dcLink.datasource;

         linkConnectFields = this.CurrentObject.fields(
            (f) => f.isConnection && f.settings.linkObject == objectLink.id
         );

         linkValues = dcLink.getCursor();
      }

      let allValid = true;
      let validRows = [];
      // Pre Check Validations of whole CSV import
      // update row to green if valid
      // update row to red if !valid
      (selectedRows || []).forEach((data, index) => {
         let newRowData = {};

         // Set parent's data collection cursor
         if (objectLink && linkConnectFields.length && linkValues) {
            linkConnectFields.forEach((f) => {
               let linkColName = f.indexField
                  ? f.indexField.columnName
                  : objectLink.PK();
               newRowData[f.columnName] = {};
               newRowData[f.columnName][linkColName] =
                  linkValues[linkColName] || linkValues.id;
            });
         }

         matchFields.forEach((f) => {
            if (!f.field || !f.field.key) return;

            switch (f.field.key) {
               // case "connectObject":
               //    // skip
               //    break;
               case "number":
                  if (typeof data[f.columnIndex] != "number") {
                     newRowData[f.field.columnName] = (
                        data[f.columnIndex] || ""
                     ).replace(/[^-0-9.]/gi, "");
                  } else {
                     newRowData[f.field.columnName] = data[f.columnIndex];
                  }
                  break;
               default:
                  newRowData[f.field.columnName] = data[f.columnIndex];
                  break;
            }
         });

         let isValid = false;
         let errorMsg = "";

         // first check legacy and server side validation
         let validator = this.CurrentObject.isValidData(newRowData);
         isValid = validator.pass();
         errorMsg = validator.errors;

         if (isValid) {
            // now check complex field validation rules
            isValid = $$(ids.datatable).validate(data.id);
         } else {
            allValid = false;
            itemInvalid(data.id, errorMsg);
         }
         if (isValid) {
            itemValid(data.id);
            validRows.push({ id: data.id, data: newRowData });
         } else {
            allValid = false;
         }
         // $$(ids.datatable).unblockEvent();
      });

      if (!allValid) {
         // To Do anyUI updates
         // $$(ids.importButton).enable();
         //
         // // Hide loading cursor
         // $$(ids.form).hideProgress();
         // $$(ids.progressBar).hideProgress();
         // $$(ids.statusMessage).setValue("");
         // $$(ids.statusMessage).hide();
         //
         // // _logic.hide();
         //
         // if (_logic.callbacks && _logic.callbacks.onDone)
         //    _logic.callbacks.onDone();
         uiCleanUp();

         webix.alert({
            title: L("Invalid Data"),
            ok: L("Ok"),
            text: L(
               "The highlighted row has invalid data. Please edit in the window or update the CSV and try again."
            ),
         });

         return Promise.resolve();
      }

      // if pass, then continue to process each row
      // ?? : can we process in Parallel?
      // ?? : implement hash Lookups for connected Fields
      var hashLookups = {};
      // {obj}  /*  { connectField.id : { 'searchWord' : "uuid"}}
      // use this hash to reduce the # of lookups needed to fill in our
      // connected entries

      let connectedFields = matchFields.filter(
         (f) => f && f.field && f.field.isConnection && f.searchField
      );

      let startUpdateTime;
      var numDone = 0;
      return Promise.resolve()
         .then(() => {
            // forEach connectedFields in csv

            var allLookups = [];

            (connectedFields || []).forEach((f) => {
               let connectField = f.field;
               let searchField = f.searchField;
               // let searchWord = newRowData[f.columnIndex];

               let connectObject = connectField.datasourceLink;
               if (!connectObject) return;

               let connectModel = connectObject.model();
               if (!connectModel) return;

               let linkIdKey = connectField.indexField
                  ? connectField.indexField.columnName
                  : connectField.object.PK();

               // prepare default hash entry:
               hashLookups[connectField.id] = {};

               // load all values of connectedField entries

               allLookups.push(
                  connectModel
                     .findAll({
                        where: {}, // !!!
                        populate: false,
                     })
                     .then((list) => {
                        if (list.data) {
                           list = list.data;
                        }
                        (list || []).forEach((row) => {
                           // store in hash[field.id] = { 'searchKey' : "uuid" }

                           hashLookups[connectField.id][
                              row[searchField.columnName]
                           ] = row[linkIdKey];
                        });
                     })
                     .catch((errMessage) => {
                        console.error(errMessage);
                     })
               );
            });

            return Promise.all(allLookups);
         })
         .then(() => {
            // forEach validRow
            validRows.forEach((data) => {
               let newRowData = data.data;

               // update the datagrid row to in-progress
               $$(ids.datatable).blockEvent();
               $$(ids.datatable).updateItem(data.id, {
                  _status: "in-progress",
                  _errorMsg: "",
               });
               $$(ids.datatable).unblockEvent();

               // forEach ConnectedField
               (connectedFields || []).forEach((f) => {
                  // find newRowData[field.columnName] = { field.PK : hash[field.id][searchWord] }
                  let connectField = f.field;
                  let linkIdKey = connectField.indexField
                     ? connectField.indexField.columnName
                     : connectField.object.PK();
                  var uuid =
                     hashLookups[connectField.id][
                        newRowData[connectField.columnName]
                     ];

                  if (!uuid) {
                     itemInvalid(data.id, [{ name: connectField.columnName }]);
                     allValid = false;
                  }

                  newRowData[connectField.columnName] = {};
                  newRowData[connectField.columnName][linkIdKey] = uuid;
               });
            });
         })
         .then(() => {
            if (!allValid) {
               webix.alert({
                  title: L("Invalid Data"),
                  ok: L("Ok"),
                  text: L(
                     "The highlighted row has invalid data. Please edit in the window or update the CSV and try again."
                  ),
               });
               uiCleanUp();

               return Promise.resolve();
            }
            // NOTE: Parallel exectuion of all these:
            var allSaves = [];

            const createRecord = (objModel, newRowsData, element, total) => {
               return new Promise((resolve, reject) => {
                  element.doRecordRulesPre(newRowsData);

                  objModel
                     .batchCreate({ batch: newRowsData })
                     .then((result) => {
                        var recordRules = [];

                        // Show errors of each row
                        Object.keys(result.errors).forEach((rowIndex) => {
                           let error = result.errors[rowIndex];
                           if (error) {
                              itemFailed(
                                 rowIndex,
                                 error.message || error.sqlMessage || error
                              );
                           }
                        });

                        Object.keys(result.data).forEach((rowIndex) => {
                           let rowData = result.data[rowIndex];
                           recordRules.push(
                              new Promise((next, err) => {
                                 // Process Record Rule
                                 element
                                    .doRecordRules(rowData)
                                    .then(() => {
                                       itemPass(rowIndex);
                                       next();
                                    })
                                    .catch((errMessage) => {
                                       itemFailed(rowIndex, errMessage);
                                       err("that didn't work");
                                    });
                              })
                           );
                        });
                        Promise.all(recordRules)
                           .then(() => {
                              newRowsData.forEach((row) => {
                                 // itemPass(row.id);
                                 numDone++;
                                 if (numDone % 50 == 0) {
                                    this.refreshRemainingTimeText(
                                       startUpdateTime,
                                       validRows.length,
                                       numDone
                                    );
                                 }
                              });
                              if (numDone == total) {
                                 uiCleanUp();
                                 $$(ids.importButton).disable();
                              }
                              resolve();
                           })
                           .catch((err) => {
                              // newRowsData.forEach((row) => {
                              //    itemFailed(row.id, err);
                              // });
                              reject(err);
                           });
                     })
                     .catch((errMessage) => {
                        console.error(errMessage);
                        reject(errMessage);
                     });
               });
            };

            validRows.forEach((data) => {
               let newRowData = data.data;
               allSaves.push({ id: data.id, data: newRowData });
            });

            // we are going to store these promises in an array of
            // arrays with 50 in each sub array
            var throttledSaves = [];
            var index = 0;
            var total = allSaves.length;
            while (allSaves.length) {
               throttledSaves[index] = allSaves.splice(0, 50);
               index++;
            }

            // execute the array of array of 100 promises one at at time
            function performThrottledSaves(
               currentRecords,
               remainingRecords,
               importer,
               total
            ) {
               // execute the next 100
               // const requests = currentRecords.map((data) => {
               //    return createRecord(
               //       objModel,
               //       data.record,
               //       data.data,
               //       importer
               //    );
               // });
               const requests = createRecord(
                  objModel,
                  currentRecords,
                  importer,
                  total
               );
               requests
                  .then(() => {
                     // when done get the next 10
                     var nextRecords = remainingRecords.shift();
                     // if there are any remaining in the group call performThrottledSaves
                     if (nextRecords && nextRecords.length) {
                        return performThrottledSaves(
                           nextRecords,
                           remainingRecords,
                           importer,
                           total
                        );
                     } else {
                        // uiCleanUp();
                        return Promise.resolve();
                     }
                  })
                  .catch((err) => {
                     // Handle errors here
                     return Promise.reject(err);
                  });
            }

            // now we are going to processes these new containers one at a time
            // $$(ids.datatable).blockEvent();
            // this is when the real work starts so lets begin our countdown timer now
            startUpdateTime = new Date();
            // get the first group of Promises out of the collection
            var next = throttledSaves.shift();
            // execute our Promise iterator
            return performThrottledSaves(
               next,
               throttledSaves,
               this.viewCSVImporter,
               total
            );
         })
         .catch((err) => {
            // resolve Error UI
            webix.alert({
               title: L("Error Creating Records"),
               ok: L("Ok"),
               text: L("One or more records failed upon creation."),
            });
            // $$(ids.datatable).unblockEvent();
            uiCleanUp();
            console.error(err);
         });
   }
}

module.exports = class ABViewCSVImporter extends ABViewCSVImporterCore {
   // constructor(values, application, parent, defaultValues) {
   //    super(values, application, parent, defaultValues);
   // }

   //
   //	Editor Related
   //

   /**
    * @method editorComponent
    * return the Editor for this UI component.
    * the editor should display either a "block" view or "preview" of
    * the current layout of the view.
    * @param {string} mode what mode are we in ['block', 'preview']
    * @return {Component}
    */
   editorComponent(App, mode) {
      let idBase = "ABViewCsvImporterEditorComponent";
      let component = this.component(App, idBase);

      return component;
   }

   //
   // Property Editor
   //

   static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {
      let commonUI = super.propertyEditorDefaultElements(
         App,
         ids,
         _logic,
         ObjectDefaults
      );

      let idBase = "ABViewCSVImporter";
      let L = App.Label;

      PopupRecordRule = new ABRecordRule();
      PopupRecordRule.component(App, idBase + "_recordrule"); // prepare the UI component.

      // _logic functions

      _logic.selectSource = (dcId, oldDcId) => {
         let currView = _logic.currentEditObject();

         this.propertyUpdateRules(ids, currView);

         // refresh UI
         currView.emit("properties.updated", currView);

         currView.settings.dataviewID = dcId;

         this.propertyAvailableFields(ids, currView, { selectAll: true });

         // save
         currView.save();
      };

      _logic.listTemplate = (field, common) => {
         let currView = _logic.currentEditObject();

         let fieldComponent = field.formComponent();
         if (fieldComponent == null)
            return `<i class='fa fa-times'></i>  ${field.label} <div class='ab-component-form-fields-component-info'> Disable </div>`;

         let componentKey = fieldComponent.common().key;
         let formComponent = currView.application.viewAll(
            (v) => v.common().key == componentKey
         )[0];

         return `${common.markCheckbox(field)} ${
            field.label
         } <div class='ab-component-form-fields-component-info'> <i class='fa fa-${
            formComponent ? formComponent.common().icon : "fw"
         }'></i> ${
            formComponent ? L(formComponent.common().labelKey, "Label") : ""
         } </div>`;
      };

      _logic.check = (e, fieldId) => {
         // update UI list
         let item = $$(ids.fields).getItem(fieldId);
         item.selected = item.selected ? 0 : 1;
         $$(ids.fields).updateItem(fieldId, item);

         let currView = _logic.currentEditObject();
         this.propertyEditorValues(ids, currView);
         currView.save();
      };

      _logic.recordRuleShow = () => {
         let currView = _logic.currentEditObject();

         PopupRecordRule.formLoad(currView);
         PopupRecordRule.fromSettings(currView.settings.recordRules);
         PopupRecordRule.show();

         // Workaround
         PopupRecordRule.qbFixAfterShow();
      };

      _logic.recordRuleSave = (settings) => {
         let currView = _logic.currentEditObject();
         currView.settings.recordRules = settings;

         // trigger a save()
         this.propertyEditorSave(ids, currView);

         // update badge number of rules
         this.populateBadgeNumber(ids, currView);
      };

      PopupRecordRule.init({
         onSave: _logic.recordRuleSave,
      });

      return commonUI.concat([
         {
            view: "fieldset",
            label: L("ab.component.label.dataSource", "*Data:"),
            labelWidth: App.config.labelWidthLarge,
            body: {
               name: "datacollection",
               view: "richselect",
               label: L("ab.components.form.dataSource", "*Data Source"),
               labelWidth: App.config.labelWidthLarge,
               skipAutoSave: true,
               on: {
                  onChange: _logic.selectSource,
               },
            },
         },
         {
            view: "fieldset",
            label: L(
               "ab.component.csvImporter.availableFields",
               "*Available Fields:"
            ),
            labelWidth: App.config.labelWidthLarge,
            body: {
               type: "clean",
               padding: 10,
               rows: [
                  {
                     name: "fields",
                     view: "list",
                     select: false,
                     minHeight: 250,
                     template: _logic.listTemplate,
                     type: {
                        markCheckbox: function (item) {
                           return (
                              "<span class='check webix_icon fa fa-" +
                              (item.selected ? "check-" : "") +
                              "square-o'></span>"
                           );
                        },
                     },
                     onClick: {
                        check: _logic.check,
                     },
                  },
               ],
            },
         },
         {
            view: "fieldset",
            label: L("ab.components.form.rules", "*Rules:"),
            labelWidth: App.config.labelWidthLarge,
            body: {
               type: "clean",
               padding: 10,
               rows: [
                  {
                     cols: [
                        {
                           view: "label",
                           label: L(
                              "ab.components.form.recordRules",
                              "*Record Rules:"
                           ),
                           width: App.config.labelWidthLarge,
                        },
                        {
                           view: "button",
                           name: "buttonRecordRules",
                           css: "webix_primary",
                           label: L("ab.components.form.settings", "*Settings"),
                           icon: "fa fa-gear",
                           type: "icon",
                           badge: 0,
                           click: function () {
                              _logic.recordRuleShow();
                           },
                        },
                     ],
                  },
               ],
            },
         },
         {
            view: "fieldset",
            label: L(
               "ab.component.label.customizeDisplay",
               "*Customize Display:"
            ),
            labelWidth: App.config.labelWidthLarge,
            body: {
               type: "clean",
               padding: 10,
               rows: [
                  {
                     name: "buttonLabel",
                     view: "text",
                     label: L("ab.components.csvImporter.label", "*Label"),
                     labelWidth: App.config.labelWidthXLarge,
                  },
                  {
                     view: "counter",
                     name: "width",
                     label: L("ab.components.csvImporter.width", "*Width:"),
                     labelWidth: App.config.labelWidthXLarge,
                  },
               ],
            },
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      // Pull data views to options
      let dcOptions = view.propertyDatacollections();

      let $DcSelector = $$(ids.datacollection);
      $DcSelector.define("options", dcOptions);
      $DcSelector.define("value", view.settings.dataviewID || null);
      $DcSelector.refresh();

      $$(ids.buttonLabel).setValue(view.settings.buttonLabel);
      $$(ids.width).setValue(view.settings.width);

      // compatible to previous version
      let availableFldOptions = {};
      if (view.settings.availableFieldIds == null) {
         availableFldOptions.selectAll = true;
      }

      this.propertyAvailableFields(ids, view, availableFldOptions);
      this.propertyUpdateRules(ids, view);
      this.populateBadgeNumber(ids, view);

      // when a change is made in the properties the popups need to reflect the change
      this.updateEventIds = this.updateEventIds || {}; // { viewId: boolean, ..., viewIdn: boolean }
      if (!this.updateEventIds[view.id]) {
         this.updateEventIds[view.id] = true;

         view.addListener("properties.updated", () => {
            this.populateBadgeNumber(ids, view);
         });
      }
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.dataviewID = $$(ids.datacollection).getValue();
      view.settings.buttonLabel = $$(ids.buttonLabel).getValue();
      view.settings.width = $$(ids.width).getValue();

      view.settings.availableFieldIds = [];
      let fields = $$(ids.fields).find({ selected: true });
      (fields || []).forEach((f) => {
         view.settings.availableFieldIds.push(f.id);
      });
   }

   static propertyAvailableFields(ids, view, options = {}) {
      let datacollection = view.AB.datacollections(
         (dc) => dc.id == view.settings.dataviewID
      )[0];
      let object = datacollection ? datacollection.datasource : null;

      view.settings = view.settings || {};
      let availableFields = view.settings.availableFieldIds || [];

      // Pull field list
      let fieldOptions = [];
      if (object != null) {
         fieldOptions = object.fields().map((f) => {
            f.selected = options.selectAll
               ? true
               : availableFields.filter((fieldId) => f.id == fieldId).length >
                 0;

            return f;
         });
      }

      $$(ids.fields).clearAll();
      $$(ids.fields).parse(fieldOptions);
   }

   static propertyUpdateRules(ids, view) {
      if (!view) return;

      // Populate values to rules
      let selectedDv = view.datacollection;
      if (selectedDv) {
         PopupRecordRule.objectLoad(selectedDv.datasource);
      }

      // PopupDisplayRule.formLoad(view);
      PopupRecordRule.formLoad(view);
   }

   static populateBadgeNumber(ids, view) {
      if (!view) return;

      if (view.settings.recordRules) {
         $$(ids.buttonRecordRules).define(
            "badge",
            view.settings.recordRules.length || null
         );
         $$(ids.buttonRecordRules).refresh();
      } else {
         $$(ids.buttonRecordRules).define("badge", null);
         $$(ids.buttonRecordRules).refresh();
      }
   }

   /**
    * @method component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(v1App = false, idBase) {
      var component = new ABViewCSVImporterComponent(this, idBase);

      // if this is our v1Interface
      if (v1App) {
         var newComponent = component;
         component = {
            ui: component.ui(),
            init: (options, accessLevel) => {
               return newComponent.init(this.AB, accessLevel);
            },
            onShow: (...params) => {
               return newComponent.onShow?.(...params);
            },
         };
      }

      return component;
   }
};
