const ABFieldConnectCore = require("../../core/dataFields/ABFieldConnectCore");

const L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABFieldConnect extends ABFieldConnectCore {
   constructor(values, object, fieldDefaults) {
      super(values, object, fieldDefaults);
   }

   /**
    * @method destroy()
    *
    * destroy the current instance of ABApplication
    *
    * also remove it from our _AllApplications
    *
    * @return {Promise}
    */
   async destroy() {
      // verify we have been .save()d before:
      if (!this.id) return Promise.resolve();

      // NOTE: our .migrateXXX() routines expect the object to currently exist
      // in the DB before we perform the DB operations.  So we need to
      // .migrateDrop()  before we actually .objectDestroy() this.
      // this.migrateDrop()
      //    // .then(() => {
      //    //    // NOTE : prevent recursive remove connected fields
      //    //    // - remove this field from JSON
      //    //    this.object._fields = this.object.fields((f) => {
      //    //       return f.id != this.id;
      //    //    });
      //    // })
      //    .then(() => {
      //       // Save JSON of the object
      //       return this.object.fieldRemove(this);
      //    })
      await super.destroy();

      // Now we need to remove our linked Object->field

      const linkObject = this.datasourceLink;
      if (!linkObject) return Promise.resolve(); // already notified

      const linkField = this.fieldLink;
      if (!linkField) return Promise.resolve(); // already notified

      // destroy linked field
      return linkField.destroy();
   }

   ///
   /// Working with Actual Object Values:
   ///

   /**
    * @method pullRelationValues
    *
    * On the Web client, we want our returned relation values to be
    * ready for Webix objects that require a .text and .value field.
    *
    * @param {*} row
    * @return {array}
    */
   pullRelationValues(row) {
      let selectedData = [];

      const data = super.pullRelationValues(row);
      const linkedObject = this.datasourceLink;

      if (data && linkedObject) {
         // if this select value is array
         if (Array.isArray(data)) {
            selectedData = data.map(function (d) {
               // display label in format
               if (d) {
                  d.text = d.text || linkedObject.displayData(d);
                  d.value = d.text;
               }

               return d;
            });
         } else if (data.id || data.uuid) {
            selectedData = data;
            selectedData.text =
               selectedData.text || linkedObject.displayData(selectedData);
            selectedData.value = selectedData.text;
         } else if (typeof data == "string") {
            selectedData = { text: data };
         }
      }

      return selectedData;
   }

   columnHeader(options) {
      options = options || {};
      const config = super.columnHeader(options);
      const field = this;
      const App = field.AB._App;

      if (options.filters == null) {
         options.filters = {};
      }

      var multiselect = this.settings.linkType == "many";

      config.editor = multiselect ? "multiselect" : "combo";
      config.editFormat = (value) => {
         return this.editFormat(value);
      };
      config.editParse = (value) => {
         return this.editParse(value);
      };
      config.template = (row) => {
         var selectedData = this.pullRelationValues(row);
         var values = [];
         values.push('<div class="badgeContainer">');
         if (
            selectedData &&
            Array.isArray(selectedData) &&
            selectedData.length
         ) {
            selectedData.forEach((val) => {
               values.push(
                  `<div class='webix_multicombo_value'><span>${val.value}</span><!-- span data-uuid="${val.id}" class="webix_multicombo_delete" role="button" aria-label="Remove item"></span --></div>`
               );
            });
            if (selectedData.length > 1) {
               values.push(
                  `<span class="webix_badge selectivityBadge">${selectedData.length}</span>`
               );
            }
         } else if (selectedData.value) {
            let clear = "";
            if (options.editable) {
               clear = `<span class="webix_multicombo_delete clear-combo-value" role="button" aria-label="Remove item"></span>`;
            }
            values.push(
               `<div class='webix_multicombo_value'>${clear}<span class="ellip">${selectedData.value}</span></div>`
            );
         } else {
            return "";
         }
         values.push("</div>");
         return values.join("");
      };

      config.suggest = {
         on: {
            onBeforeShow: function () {
               field.openOptions(this);
            },
         },

         // Support partial matches
         filter: ({ value }, search) =>
            (value ?? "").toLowerCase().includes((search ?? "").toLowerCase()),
      };

      if (multiselect) {
         config.suggest.view = "checksuggest";
         config.suggest.button = true;
      }

      return config;
   }

   openOptions($suggest) {
      // PREVENT repeatedly pull data:
      // If the options list was populated, then skip
      const $list = $suggest.getList();
      if (($list?.find({}) ?? []).length) return;

      // Listen create/update events of the linked object, then clear data list to re-populate
      ["create", "update"].forEach((key) => {
         if (this[`_dc_${key}_event`]) return;

         this[`_dc_${key}_event`] = this.AB.on(
            `ab.datacollection.${key}`,
            (res) => {
               if (this.datasourceLink.id == res.objectId) $list.clearAll();
            }
         );
      });

      this.getAndPopulateOptions($suggest);
   }

   /*
    * @function customEdit
    *
    * @param {object} row is the {name=>value} hash of the current row of data.
    * @param {App} App the shared ui App object useful more making globally
    *					unique id references.
    * @param {HtmlDOM} node  the HTML Dom object for this field's display.
    */

   //// NOTE: why do we pass in row, App, and node?  is this something we do in our external components?
   ////       are these values present when this Object is instanciated? Can't we just pass these into the
   ////       object constructor and have it internally track these things?
   customEdit(row, App, node) {
      // var selectedData = this.pullRelationValues(row);
      // this._selectedData = selectedData;
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
      return super.formComponent("connect");
   }

   detailComponent() {
      const detailComponentSetting = super.detailComponent();

      detailComponentSetting.common = () => {
         return {
            key: "detailconnect",
         };
      };

      return detailComponentSetting;
   }

   /**
    * @method getOptions
    * show options list in selectivity
    *
    * @return {Promise}
    */
   getOptions(where, term, sort) {
      return new Promise((resolve, reject) => {
         let haveResolved = false;
         // {bool}
         // have we already passed back a result?

         const respond = (options) => {
            // filter the raw lookup with the provided search term
            options = options.filter((item) => {
               if (item.text.toLowerCase().includes(term.toLowerCase())) {
                  return true;
               }
            });

            if (!haveResolved) {
               haveResolved = true;
               resolve(options);
            } else {
               // if we have already resolved() then .emit() that we have
               // updated "option.data".
               this.emit("option.data", options);
            }
         };

         // Prepare Where clause

         where = where || {};
         sort = sort || [];

         if (!where.glue) where.glue = "and";

         if (!where.rules) where.rules = [];

         term = term || "";

         // check if linked object value is not define, should return a empty array
         if (!this.settings.linkObject) return [];

         // if options was cached
         // if (this._options != null) return resolve(this._options);

         const linkedObj = this.datasourceLink;

         // System could not found the linked object - It may be deleted ?
         if (linkedObj == null) throw new Error("No linked object");

         const linkedCol = this.fieldLink;

         // System could not found the linked field - It may be deleted ?
         if (linkedCol == null) throw new Error("No linked column");

         // Get linked object model
         const linkedModel = linkedObj.model();

         // M:1 - get data that's only empty relation value
         if (
            this.settings.linkType == "many" &&
            this.settings.linkViaType == "one"
         ) {
            // Mar 8, 2022 I (James) removed this because we need these options
            // to appear so we can put a checkbox next to them with the new UI
            // where.rules.push({
            //    key: linkedCol.id,
            //    rule: "is_null",
            // });
            // where[linkedCol.columnName] = null;
         }
         // 1:1
         else if (
            this.settings.linkType == "one" &&
            this.settings.linkViaType == "one"
         ) {
            // 1:1 - get data is not match link id that we have
            if (this.settings.isSource == true) {
               // NOTE: make sure "haveNoRelation" shows up as an operator
               // the value ":0" doesn't matter, we just need 'haveNoRelation' as an operator.
               // newRule[linkedCol.id] = { 'haveNoRelation': 0 };
               where.rules.push({
                  key: linkedCol.id,
                  rule: "have_no_relation",
               });
            }
            // 1:1 - get data that's only empty relation value by query null value from link table
            else {
               where.rules.push({
                  key: linkedCol.id,
                  rule: "is_null",
               });
               // newRule[linkedCol.id] = 'null';
               // where[linkedCol.id] = null;
            }
         }

         const storageID = `${this.id}-${JSON.stringify(where)}`;

         Promise.resolve()
            // TODO: debug the cached data + response so the droplist can display
            // updated data.
            .then(async () => {
               // Get Local Storage

               // We store the .findAll() results locally and return that for a
               // quick response:
               const storedOptions = await this.AB.Storage.get(storageID);
               if (storedOptions) {
                  // immediately respond with our stored options.
                  this._options = storedOptions;
                  return respond(this._options);
               }
            })
            .then(async () => {
               try {
                  // Pull linked object data
                  const result = await linkedModel.findAll({
                     where: where,
                     sort: sort,
                     populate: false,
                  });

                  // cache linked object data
                  this._options = result.data || result || [];

                  // populate display text
                  (this._options || []).forEach((opt) => {
                     opt.text = linkedObj.displayData(opt);
                     opt.value = opt.text;
                  });

                  this.AB.Storage.set(storageID, this._options);
                  return respond(this._options);
               } catch (err) {
                  this.AB.notify.developer(err, {
                     context:
                        "ABFieldConnect:getOptions(): unable to retrieve options from server",
                     field: this.toObj(),
                     where,
                  });

                  haveResolved = true;
                  throw err;
               }
            });
      });
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
      var multiselect = this.settings.linkType == "many";
      if (multiselect) {
         if (!value) {
            return [];
         } else {
            let returnVals = [];
            let vals = value.split(",");
            vals.forEach((val) => {
               returnVals.push(this.getItemFromVal(val));
            });
            return returnVals;
         }
      } else {
         let item = this.getItemFromVal(value);
         return item;
      }
   }

   getAndPopulateOptions(editor, options, field, form) {
      const theEditor = editor;

      // if we are filtering based off another selectivity's value we
      // need to do it on fetch each time because the value can change
      // copy the filters so we don't add to them every time there is a change
      const combineFilters = options?.filters
         ? Object.assign({}, options.filters)
         : { glue: "and", rules: [] };

      if (options?.filterByConnectValues) {
         const parseFilterByConnectValues = (conditions, values, depth = 0) => {
            const valuesByDepth = values.filter((e) => e.depth === depth);

            return [
               ...conditions.rules.map((e) => {
                  if (e.glue)
                     return {
                        glue: e.glue,
                        rules: parseFilterByConnectValues(e, values, depth + 1),
                     };

                  const value = valuesByDepth.filter(
                     (ef) => ef.key === e.key && ef.value === e.value
                  )[0];

                  if (!value) return e;

                  const $parentField = value?.filterValue?.config.id
                     ? $$(value.filterValue.config.id)
                     : null;

                  if (!$parentField)
                     throw Error(
                        "Some parent field's view components don't exist"
                     );

                  const parentValue = value?.filterValue
                     ? $parentField.getValue() ?? ""
                     : "";

                  let newVal = "";

                  if (parentValue) {
                     if (value.filterColumn) {
                        if (
                           field.object
                              .fieldByID(value.filterValue.config.dataFieldId)
                              .getItemFromVal(parentValue)
                        ) {
                           newVal = field.object
                              .fieldByID(value.filterValue.config.dataFieldId)
                              .getItemFromVal(parentValue)[value.filterColumn];
                        } else {
                           newVal = parentValue;
                        }
                     } else {
                        newVal = parentValue;
                     }
                  }

                  return {
                     key: e.key,
                     rule: "equals",
                     value: newVal,
                  };
               }),
            ];
         };

         combineFilters.rules = parseFilterByConnectValues(
            combineFilters,
            options.filterByConnectValues
         );
      }

      const handlerOptionData = (data) => {
         this.populateOptions(theEditor, data, field, form, true);
      };

      // try to make sure we don't continually add up listeners.
      this.removeListener("option.data", handlerOptionData).once(
         "option.data",
         handlerOptionData
      );

      this.getOptions(combineFilters, "").then((data) => {
         this.populateOptions(theEditor, data, field, form, false);
      });
   }

   populateOptions(theEditor, data, field, form, addCy) {
      theEditor.blockEvent();
      theEditor.getList().clearAll();
      theEditor.getList().define("data", data);
      if (addCy) {
         this.populateOptionsDataCy(theEditor, field, form);
      }
      if (theEditor.getValue && theEditor.getValue()) {
         theEditor.setValue(theEditor.getValue());
         // } else if (this._selectedData && this._selectedData.length) {
         //    theEditor.setValue(this.editFormat(this._selectedData));
      }
      theEditor.unblockEvent();
   }

   populateOptionsDataCy(theEditor, field, form) {
      // Add data-cy attributes
      if (theEditor?.getList) {
         if (!theEditor.getPopup) return;
         var popup = theEditor.getPopup();
         if (!popup) return;
         theEditor.getList().data.each((option) => {
            if (!option) return;
            var node = popup.$view.querySelector(
               "[webix_l_id='" + option.id + "']"
            );
            if (!node) return;
            node.setAttribute(
               "data-cy",
               `${field.key} options ${option.id} ${field.id} ${form.id}`
            );
         });
      }
   }

   getItemFromVal(val) {
      let item;
      let options = this._options || [];
      if (options.length > 0) {
         for (let i = 0; i < options.length; i++) {
            if (
               this.indexField &&
               options[i][this.indexField.object.PK()] == val
            ) {
               item = options[i];
               break;
            } else if (
               this.indexField2 &&
               options[i][this.indexField2.object.PK()] == val
            ) {
               item = options[i];
               break;
            } else {
               if (options[i].id == val) {
                  item = options[i];
                  break;
               }
            }
         }
         return item;
      } else {
         return "";
      }
   }

   getValue(item) {
      var multiselect = this.settings.linkType == "many";
      if (multiselect) {
         let vals = [];
         if (item.getValue()) {
            let val = item.getValue().split(",");
            val.forEach((record) => {
               vals.push(item.getList().getItem(record));
            });
         }
         return vals;
      } else {
         if (item.getValue()) {
            return item.getList().getItem(item.getValue());
         } else {
            return "";
         }
      }
   }

   setValue(item, rowData) {
      if (!item) return;
      // if (AB.isEmpty(rowData)) return; removed because sometimes we will
      // want to set this to empty
      let val = this.pullRelationValues(rowData);
      // put in current values as options so we can display them before
      // the rest of the options are fetched when field is clicked
      if (item.getList && item.getList().count() == 0) {
         if (this.settings.linkType != "one" && !Array.isArray(val)) {
            val = [val];
         }
         item.getList().define("data", val);
      }
      item.define("value", val);
   }

   /**
    * @method pullRecordRelationValues
    *
    * On the Web client, we want our returned relation values to be
    * ready for Webix objects that require a .text and .value field.
    *
    * @param {*} row
    * @return {array}
    */
   pullRecordRelationValues(record) {
      var selectedData = [];

      var data = record;
      var linkedObject = this.datasourceLink;

      if (data && linkedObject) {
         // if this select value is array
         if (Array.isArray(data)) {
            selectedData = data.map(function (d) {
               // display label in format
               if (d) {
                  d.text = d.text || linkedObject.displayData(d);
                  d.value = d.text;
               }

               return d;
            });
         } else if (data.id || data.uuid) {
            selectedData = data;
            selectedData.text =
               selectedData.text || linkedObject.displayData(selectedData);
            selectedData.value = selectedData.text;
         }
      }

      return selectedData;
   }
};
