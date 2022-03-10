var ABFieldListCore = require("../../core/dataFields/ABFieldListCore");
var ABFieldComponent = require("./ABFieldComponent");

var ABFieldSelectivity = require("./ABFieldSelectivity");

var defaultValues = ABFieldListCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

var ids = {
   isMultiple: "ab-list-multiple-option",
   hasColors: "ab-list-colors-option",
   default: "ab-list-single-default",
   multipleDefault: "ab-list-multiple-default",
   options: "ab-list-option",
   colorboard: "ab-colorboard",
};

var colors = [
   ["#F44336", "#E91E63", "#9C27B0", "#673AB7"],
   ["#3F51B5", "#2196F3", "#03A9F4", "#00BCD4"],
   ["#009688", "#4CAF50", "#8BC34A", "#CDDC39"],
   ["#FFEB3B", "#FFC107", "#FF9800", "#FF5722"],
   ["#795548", "#9E9E9E", "#607D8B", "#000000"],
];

function getNextHex() {
   var options = $$(ids.options);
   var usedColors = [];
   options.data.each(function (item) {
      usedColors.push(item.hex);
   });
   var allColors = [];
   colors.forEach(function (c) {
      if (typeof c == "object") {
         c.forEach(function (j) {
            allColors.push(j);
         });
      }
   });
   var newHex = "#3498db";
   for (var i = 0; i < allColors.length; i++) {
      if (usedColors.indexOf(allColors[i]) == -1) {
         newHex = allColors[i];
         break;
      }
   }
   return newHex;
}

function toggleColorControl(value) {
   var colorPickers = $$(ids.options).$view.querySelectorAll(
      ".ab-color-picker"
   );
   colorPickers.forEach(function (itm) {
      if (value == 1) itm.classList.remove("hide");
      else itm.classList.add("hide");
   });
}

function updateDefaultList(ids, settings = {}, L) {
   var optList = $$(ids.options)
      .find({})
      .map(function (opt) {
         return {
            id: opt.id,
            value: opt.value,
            hex: opt.hex,
         };
      });

   if ($$(ids.isMultiple).getValue()) {
      // Multiple default selector
      var domNode = $$(ids.multipleDefault).$view.querySelector(
         ".list-data-values"
      );
      if (!domNode) return false;

      // TODO : use to render selectivity to set default values
      let selectivityRender = new ABFieldSelectivity(
         {
            settings: {},
         },
         {},
         {}
      );

      selectivityRender.selectivityRender(domNode, {
         multiple: true,
         data: settings.multipleDefault,
         placeholder: L("Select items"),
         items: optList.map(function (opt) {
            return {
               id: opt.id,
               text: opt.value,
               hex: opt.hex,
            };
         }),
      });
      domNode.addEventListener("change", function (e) {
         if (e.value.length) {
            $$(ids.multipleDefault).define("required", false);
         } else if (
            $$(ids.multipleDefault)
               .$view.querySelector(".webix_inp_label")
               .classList.contains("webix_required")
         ) {
            $$(ids.multipleDefault).define("required", true);
         }
      });
   } else {
      // Single default selector
      $$(ids.default).define("options", optList);
      if (settings.default) $$(ids.default).setValue(settings.default);

      $$(ids.default).refresh();
   }
}

/**
 * ABFieldListComponent
 *
 * Defines the UI Component for this Data Field.  The ui component is responsible
 * for displaying the properties editor, populating existing data, retrieving
 * property values, etc.
 */
var ABFieldListComponent = new ABFieldComponent({
   fieldDefaults: ABFieldListCore.defaults(),

   elements: (App, field) => {
      ids = field.idsUnique(ids, App);

      return [
         {
            view: "checkbox",
            name: "isMultiple",
            disallowEdit: true,
            id: ids.isMultiple,
            labelRight: L("Multiselect"),
            labelWidth: 0,
            value: false,
            on: {
               onChange: (newV /* , oldV */) => {
                  if (newV == true) {
                     $$(ids.default).hide();
                     $$(ids.multipleDefault).show();
                  } else {
                     $$(ids.default).show();
                     $$(ids.multipleDefault).hide();
                  }

                  updateDefaultList(ids, field.settings, L);
               },
            },
         },
         {
            view: "checkbox",
            name: "hasColors",
            id: ids.hasColors,
            labelRight: L("Customize Colors"),
            labelWidth: 0,
            value: false,
            on: {
               onChange: (newV, oldV) => {
                  if (newV == oldV) return false;

                  toggleColorControl(newV);
               },
            },
         },
         {
            view: "label",
            label: `<b>${L("Options")}</b>`,
         },
         {
            id: ids.options,
            name: "options",
            css: "padList",
            view: App.custom.editlist.view,
            template:
               "<div style='position: relative;'><i class='ab-color-picker fa fa-lg fa-chevron-circle-down' style='color:#hex#'></i> #value#<i class='ab-new-field-remove fa fa-remove' style='position: absolute; top: 7px; right: 7px;'></i></div>",
            autoheight: true,
            drag: true,
            editable: true,
            hex: "",
            editor: "text",
            editValue: "value",
            onClick: {
               "ab-new-field-remove": (e, itemId /*, trg */) => {
                  // Remove option item
                  // check that item is in saved data already
                  var matches = (
                     ABFieldListComponent._originalOptions || []
                  ).filter(function (x) {
                     return x.id == itemId;
                  })[0];
                  if (matches) {
                     // Ask the user if they want to remove option
                     webix
                        .confirm({
                           title: L("Delete Option"),
                           text: L(
                              "All exisiting entries with this value will be cleared. Are you sure you want to delete this option?"
                           ),
                           type: "confirm-warning",
                        })
                        .then(() => {
                           // This is the "Yes"/"OK" click

                           // store the item that will be deleted for the save action
                           ABFieldListComponent._currentField.pendingDeletions =
                              ABFieldListComponent._currentField
                                 .pendingDeletions || [];
                           ABFieldListComponent._currentField.pendingDeletions.push(
                              itemId
                           );
                           $$(ids.options).remove(itemId);
                        });
                  }
                  // If this item did not be saved, then remove from list
                  else {
                     $$(ids.options).remove(itemId);
                  }
               },
               "ab-color-picker": function (e, itemId, trg) {
                  // alert("open color picker");
                  var item = itemId;
                  webix
                     .ui({
                        id: ids.colorboard,
                        view: "popup",
                        body: {
                           view: "colorboard",
                           type: "classic",
                           id: "color",
                           width: 125,
                           height: 150,
                           palette: colors,
                           left: 125,
                           top: 150,
                           on: {
                              onSelect: (hex) => {
                                 var vals = $$(ids.options).getItem(item);
                                 vals.hex = hex;
                                 $$(ids.options).updateItem(item, vals);
                                 $$(ids.colorboard).hide();
                              },
                           },
                        },
                     })
                     .show(trg, { x: -7 });
                  return false;
               },
            },
            on: {
               onAfterAdd: () => {
                  updateDefaultList(ids, field.settings, L);
               },
               onAfterEditStop: () => {
                  updateDefaultList(ids, field.settings, L);
               },
               onAfterDelete: () => {
                  updateDefaultList(ids, field.settings, L);
               },
               onAfterRender: () => {
                  toggleColorControl($$(ids.hasColors).getValue());
               },
            },
         },
         {
            view: "button",
            css: "webix_primary",
            value: L("Add new option"),
            click: function () {
               let itemId = webix.uid();
               let nextHex = getNextHex();
               let optionElem = $$(ids.options);
               if (!optionElem) return;

               optionElem.add(
                  {
                     id: itemId,
                     value: "",
                     hex: nextHex,
                     isNew: true,
                  },
                  optionElem.count()
               );

               if (optionElem.exists(itemId)) optionElem.edit(itemId);
            },
         },
         {
            id: ids.default,
            placeholder: L("Select Default"),
            name: "default",
            view: "richselect",
            label: L("Default"),
         },
         {
            id: ids.multipleDefault,
            name: "multipleDefault",
            view: "forminput",
            labelWidth: 0,
            height: 36,
            borderless: true,
            hidden: true,
            body: {
               view: App.custom.focusabletemplate.view,
               css: "customFieldCls",
               borderless: true,
               template:
                  `<label style="width: 80px;text-align: left;line-height:32px;" class="webix_inp_label">${L(
                     "Default"
                  )}</label>` +
                  '<div style="margin-left: 80px; height: 36px;" class="list-data-values form-entry"></div>',
            },
         },
      ];
   },

   // defaultValues: the keys must match a .name of your elements to set it's default value.
   defaultValues: defaultValues,

   // rules: basic form validation rules for webix form entry.
   // the keys must match a .name of your .elements for it to apply
   rules: {},

   // include additional behavior on default component operations here:
   // The base routines will be processed first, then these.  Any results
   // from the base routine, will be passed on to these:
   logic: {
      // isValid: function (ids, isValid) {

      // }

      clear: (ids) => {
         $$(ids.isMultiple).setValue(0);
         $$(ids.hasColors).setValue(0);
         $$(ids.options).clearAll();

         $$(ids.default).define("options", []);
         $$(ids.default).setValue(defaultValues.default);

         var domNode = $$(ids.multipleDefault).$view.querySelector(
            ".list-data-values"
         );
         if (domNode && domNode.selectivity) {
            domNode.selectivity.setData([]);
         }
      },

      populate: (ids, field) => {
         // store the options that currently exisit to compare later for deletes
         ABFieldListComponent._originalOptions = field.settings.options;
         // set options to webix list
         let opts = [];
         // we need to access the fields -> object -> model to run updates on save (may be refactored later)
         ABFieldListComponent._currentField = field;
         if (ABFieldListComponent._currentField) {
            // empty this out so we don't try to delete already deleted options (or delete options that we canceled before running)
            ABFieldListComponent._currentField.pendingDeletions = [];
            opts = (field.settings.options || []).map((opt) => {
               return {
                  id: opt.id,
                  value: opt.text,
                  hex: opt.hex,
                  translations: opt.translations,
               };
            });
         }
         $$(ids.options).parse(opts);
         $$(ids.options).refresh();

         setTimeout(() => {
            updateDefaultList(ids, field.settings, L);
         }, 10);
      },

      /*
       * @function requiredOnChange
       *
       * The ABField.definitionEditor implements a default operation
       * to look for a default field and set it to a required field
       * if the field is set to required
       *
       * if you want to override that functionality, implement this fn()
       *
       * @param {string} newVal	The new value of label
       * @param {string} oldVal	The previous value
       */
      // requiredOnChange: (newVal, oldVal, ids) => {

      // 	// when require number, then default value needs to be reqired
      // 	$$(ids.default).define("required", newVal);
      // 	$$(ids.default).refresh();

      // 	if ($$(ids.multipleDefault).$view.querySelector(".webix_inp_label")) {
      // 		if (newVal) {
      // 			$$(ids.multipleDefault).define("required", true);
      // 			$$(ids.multipleDefault).$view.querySelector(".webix_inp_label").classList.add("webix_required");
      // 		} else {
      // 			$$(ids.multipleDefault).define("required", false);
      // 			$$(ids.multipleDefault).$view.querySelector(".webix_inp_label").classList.remove("webix_required");
      // 		}
      // 	}

      // },

      values: (ids, values) => {
         // Get options list from UI, then set them to settings
         values.settings.options = [];
         $$(ids.options).data.each((opt) => {
            let optionId = opt.id;

            // If it is a new option item, then .id uses string instead of UID
            // for support custom index
            if (
               opt.isNew &&
               opt.value &&
               !values.settings.options.filter((o) => o.id == opt.value).length
            ) {
               optionId = opt.value;
            }

            values.settings.options.push({
               id: optionId,
               text: opt.value,
               hex: opt.hex,
               translations: opt.translations,
            });
         });

         // Un-translate options list
         values.settings.options.forEach((opt) => {
            this.AB.Multilingual.unTranslate(opt, opt, ["text"]);
         });

         // Set multiple default value
         values.settings.multipleDefault = [];
         var domNode = $$(ids.multipleDefault).$view.querySelector(
            ".list-data-values"
         );
         if (domNode && domNode.selectivity) {
            values.settings.multipleDefault =
               domNode.selectivity.getData() || [];
         }

         return values;
      },
   },
});

module.exports = class ABFieldList extends ABFieldListCore {
   constructor(values, object) {
      super(values, object);

      // this._Selectivity = new ABFieldSelectivity(values, object);
   }

   /*
    * @function propertiesComponent
    *
    * return a UI Component that contains the property definitions for this Field.
    *
    * @param {App} App the UI App instance passed around the Components.
    * @param {stirng} idBase
    * @return {Component}
    */
   static propertiesComponent(App, idBase) {
      return ABFieldListComponent.component(App, idBase);
   }

   ///
   /// Instance Methods
   ///

   save() {
      return super.save().then(() => {
         // Now we want to clear out any entries that had values == to item removed from our list:
         if (this.pendingDeletions.length) {
            var model = this.object.model();

            if (this.settings.isMultiple == true) {
               // find all the entries that have one of the deleted values:
               // use Promise to prevent issues with data being loaded before it is deleted on client side
               return new Promise((resolve, reject) => {
                  var numDone = 0;
                  var numToDo = 0;

                  model
                     .findAll({})
                     .then((list) => {
                        list = list.data || list;

                        // for each list item
                        list.forEach((item) => {
                           if (Array.isArray(item[this.columnName])) {
                              // get fields not in pendingDeletions
                              var remainingFields = item[
                                 this.columnName
                              ].filter((i) => {
                                 return (
                                    this.pendingDeletions.indexOf(i.id) == -1
                                 );
                              });

                              if (
                                 remainingFields.length !=
                                 item[this.columnName].length
                              ) {
                                 numToDo++;

                                 // update value to new field list
                                 if (remainingFields.length == 0) {
                                    remainingFields = "";
                                 }
                                 var value = {};
                                 value[this.columnName] = remainingFields;
                                 model.update(item.id, value).then(() => {
                                    // if ($$(node) && $$(node).updateItem)
                                    // 	$$(node).updateItem(value.id, value);
                                    numDone++;
                                    if (numDone >= numToDo) {
                                       resolve();
                                    }
                                 });
                              }
                           }
                        });
                        if (numToDo == 0) {
                           resolve();
                        }
                     })
                     .catch(reject);
               });
            } else {
               // find all the entries that have one of the deleted values:
               var where = {};
               where[this.columnName] = this.pendingDeletions;
               return new Promise((resolve, reject) => {
                  var numDone = 0;

                  model
                     .findAll(where)
                     .then((list) => {
                        // make sure we just work with the { data:[] } that was returned
                        list = list.data || list;

                        // for each one, set the value to ''
                        // NOTE: jQuery ajax routines filter out null values, so we can't
                        // set them to null. :(
                        // var numDone = 0;
                        var value = {};
                        value[this.columnName] = "";

                        list.forEach((item) => {
                           model.update(item.id, value).then(() => {
                              numDone++;
                              if (numDone >= list.length) {
                                 resolve();
                              }
                           });
                        });
                        if (list.length == 0) {
                           resolve();
                        }
                     })
                     .catch(reject);
               });
            }
         }
      });
   }

   isValid() {
      var validator = super.isValid();

      // validator.addError('columnName', L('ab.validation.object.name.unique', 'Field columnName must be unique (#name# already used in this Application)').replace('#name#', this.name) );

      return validator;
   }

   ///
   /// Working with Actual Object Values:
   ///

   // return the grid column header definition for this instance of ABFieldList
   columnHeader(options) {
      options = options || {};

      var config = super.columnHeader(options);
      var field = this;
      var App = App;

      var formClass = "";
      var placeHolder = "";
      if (options.editable) {
         formClass = " form-entry";
         placeHolder = `<span style='color: #CCC; padding: 0 5px;'>${L(
            "Select item"
         )}</span>`;
      }
      var isRemovable = options.editable && !this.settings.required;

      config.editFormat = (value) => {
         return this.editFormat(value);
      };
      config.editParse = (value) => {
         return this.editParse(value);
      };

      config.template = (rowData) => {
         let selectedData = rowData[this.columnName];
         if (selectedData == null) return "";
         if (this.settings.isMultiple) {
            selectedData = _getSelectedOptions(this, rowData);
         }
         var values = [];
         let hasCustomColor = "";
         let optionHex = "";
         if (
            selectedData &&
            Array.isArray(selectedData) &&
            selectedData.length
         ) {
            selectedData.forEach((val) => {
               if (this.settings.hasColors && val.hex) {
                  hasCustomColor = "hascustomcolor";
                  optionHex = `background: ${val.hex};`;
               }
               values.push(
                  `<div style="${optionHex}" class='webix_multicombo_value ${hasCustomColor}'><span>${val.text}</span><!-- span data-uuid="${val.id}" class="webix_multicombo_delete" role="button" aria-label="Remove item"></span --></div>`
               );
            });
         } else if (selectedData) {
            let selectedObj = selectedData;
            if (typeof selectedData == "string") {
               selectedObj = this.getItemFromVal(selectedData);
            }
            if (!selectedObj) return "";
            if (this.settings.hasColors && selectedObj.hex) {
               hasCustomColor = "hascustomcolor";
               optionHex = `background: ${selectedObj.hex};`;
            }
            values.push(
               `<div style="${optionHex}" class='webix_multicombo_value ${hasCustomColor}'><span>${selectedObj.text}</span><!-- span data-uuid="${selectedObj.id}" class="webix_multicombo_delete" role="button" aria-label="Remove item"></span --></div>`
            );
         }
         return values.join("");
      };
      config.editor = this.settings.isMultiple ? "multiselect" : "combo";
      config.suggest = {
         button: true,
         data: this.settings.options.map(function (opt) {
            return {
               id: opt.id,
               value: opt.text,
               hex: opt.hex,
            };
         }),
      };
      if (this.settings.isMultiple) {
         config.suggest.view = "checksuggest";
      }

      return config;
   }

   /*
    * @function customDisplay
    * perform any custom display modifications for this field.
    * @param {object} row is the {name=>value} hash of the current row of data.
    * @param {App} App the shared ui App object useful more making globally
    *					unique id references.
    * @param {HtmlDOM} node  the HTML Dom object for this field's display.
    */
   customDisplay(row, App, node, options) {
      // sanity check.
      if (!node) {
         return;
      }

      options = options || {};

      if (!node.querySelector) return;

      var clearButton = node.querySelector(
         ".selectivity-single-selected-item-remove"
      );
      if (clearButton) {
         clearButton.addEventListener("click", (e) => {
            e.stopPropagation();
            var values = {};
            values[this.columnName] = "";
            this.object
               .model()
               .update(row.id, values)
               .then(() => {
                  // update the client side data object as well so other data changes won't cause this save to be reverted
                  $$(node)?.updateItem?.(row.id, values);
               })
               .catch((err) => {
                  node.classList.add("webix_invalid");
                  node.classList.add("webix_invalid_cell");

                  this.AB.notify.developer(err, {
                     message: "Error updating our entry.",
                     row: row,
                     values: "",
                     field: this.toObj(),
                  });
               });
         });
      }
   }

   /*
    * @function customEdit
    *
    * @param {object} row is the {name=>value} hash of the current row of data.
    * @param {App} App the shared ui App object useful more making globally
    *					unique id references.
    * @param {HtmlDOM} node  the HTML Dom object for this field's display.
    */
   customEdit(row, App, node) {
      return super.customEdit(row, App, node);
   }

   /*
    * @funciton formComponent
    * returns a drag and droppable component that is used on the UI
    * interface builder to place form components related to this ABField.
    *
    * an ABField defines which form component is used to edit it's contents.
    * However, what is returned here, needs to be able to create an instance of
    * the component that will be stored with the ABViewForm.
    */
   formComponent() {
      // NOTE: what is being returned here needs to mimic an ABView CLASS.
      // primarily the .common() and .newInstance() methods.
      var formComponentSetting = super.formComponent();

      // .common() is used to create the display in the list
      formComponentSetting.common = () => {
         return {
            key: this.settings.isMultiple ? "selectmultiple" : "selectsingle",
            settings: {
               options: this.settings.options.map(function (opt) {
                  return {
                     id: opt.id,
                     value: opt.text,
                     hex: opt.hex,
                  };
               }),
            },
         };
      };

      return formComponentSetting;
   }

   detailComponent() {
      var detailComponentSetting = super.detailComponent();

      detailComponentSetting.common = () => {
         return {
            key: this.settings.isMultiple ? "detailtext" : "detailtext",
         };
      };

      return detailComponentSetting;
   }

   editFormat(value) {
      if (!value) return "";
      let vals = [];
      if (Array.isArray(value)) {
         value.forEach((val) => {
            if (typeof val == "object") {
               vals.push(val.id);
            } else {
               let itemObj = this.getItemFromVal(val);
               vals.push(itemObj.id);
            }
         });
      } else {
         if (typeof value == "object") {
            vals.push(value.id);
         } else {
            let itemObj = this.getItemFromVal(value);
            if (itemObj && itemObj.id) {
               vals.push(itemObj.id);
            }
         }
      }
      return vals.join();
   }

   editParse(value) {
      if (this.settings.isMultiple) {
         let returnVals = [];
         let vals = value.split(",");
         vals.forEach((val) => {
            returnVals.push(this.getItemFromVal(val));
         });
         return returnVals;
      } else {
         return value;
      }
   }

   getItemFromVal(val) {
      let item;
      let options = this.options();
      if (options.length > 1) {
         options.forEach((option) => {
            if (option.id == val) {
               item = option;
               return false;
            }
         });
         return item;
      } else {
         return "";
      }
   }

   getValue(item, rowData) {
      return this.editParse(item.getValue());
   }

   getSelectedOptions(field, rowData = {}) {
      let result = [];
      if (rowData[this.columnName] != null) {
         result = rowData[this.columnName];
      } else if (rowData) {
         if (Array.isArray(rowData)) {
            result = rowData;
         } else {
            result.push(rowData);
         }
      }
      if (result.length) {
         if (typeof result == "string") result = JSON.parse(result);

         // Pull text with current language
         if (this.settings) {
            result = (this.settings.options || []).filter((opt) => {
               return (
                  (result || []).filter((v) => (opt.id || opt) == (v.id || v))
                     .length > 0
               );
            });
         }
      }

      return result;
   }

   setValue(item, rowData) {
      if (!item) return;

      if (this.settings.isMultiple) {
         // do we need anything here?
      } else {
         super.setValue(item, rowData);
      }
   }
};

// == Private methods ==
function _getSelectedOptions(field, rowData = {}) {
   let result = [];
   if (rowData[field.columnName] != null) {
      result = rowData[field.columnName];

      if (typeof result == "string") result = JSON.parse(result);

      // Pull text with current language
      if (field.settings) {
         result = (field.settings.options || []).filter((opt) => {
            return (
               (result || []).filter((v) => (opt.id || opt) == (v.id || v))
                  .length > 0
            );
         });
      }
   }

   return result;
}
