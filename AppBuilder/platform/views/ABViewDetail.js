const ABViewDetailCore = require("../../core/views/ABViewDetailCore");
const ABViewDetailComponent = require("./ABViewDetailComponent");
const ABObjectQuery = require("../ABObjectQuery");

const ABViewDetailPropertyComponentDefaults = ABViewDetailCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABViewDetail extends ABViewDetailCore {
   // constructor(values, application, parent, defaultValues) {
   //    super(values, application, parent, defaultValues);
   // }

   /**
    * @method editorComponent
    * return the Editor for this UI component.
    * the editor should display either a "block" view or "preview" of
    * the current layout of the view.
    * @param {string} mode what mode are we in ['block', 'preview']
    * @return {Component}
    */
   editorComponent(App, mode) {
      var comp = super.editorComponent(App, mode);

      // Define height of cell
      comp.ui.rows[0].cellHeight = 75;

      return comp;
   }

   //
   // Property Editor
   //

   static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {
      var commonUI = super.propertyEditorDefaultElements(
         App,
         ids,
         _logic,
         ObjectDefaults
      );

      // _logic functions

      _logic.selectSource = async (dcId, oldDcId) => {
         // TODO : warning message

         _logic.busy();

         let currView = _logic.currentEditObject();
         currView.settings.dataviewID = dcId;

         // clear sub views
         currView._views = [];

         this.propertyUpdateFieldOptions(ids, currView, dcId);

         // add all fields to editor by default
         if (currView._views.length > 0) return Promise.resolve();

         let fieldSaves = [];
         let fields = $$(ids.fields).find({});
         fields.reverse();
         fields.forEach((f, index) => {
            if (!f.selected) {
               let yPosition = fields.length - index - 1;

               var fieldView = currView.addFieldToView(f, yPosition, ids, App);
               fieldSaves.push(fieldView.save());

               // update item to UI list
               f.selected = 1;
               $$(ids.fields).updateItem(f.id, f);
            }
         });

         await Promise.all(fieldSaves);

         // Saving
         await currView.save();

         currView.emit("properties.updated", currView);

         _logic.ready();
      };

      _logic.listTemplate = (field, common) => {
         return `${common.markCheckbox(field)} ${field.label}`;
      };

      _logic.check = async (e, fieldId) => {
         var currView = _logic.currentEditObject();

         // update UI list
         var item = $$(ids.fields).getItem(fieldId);
         item.selected = item.selected ? 0 : 1;
         $$(ids.fields).updateItem(fieldId, item);

         // add a field to the form
         if (item.selected) {
            await currView.addFieldToView(item, null, ids, App).save();

            // Refresh UI
            currView.emit("properties.updated", currView);

            // .addFieldToView() does not auto update the currView:
            await currView.save();
         }
         // remove field in the form
         else {
            let fieldView = currView.views(
               (c) => c.settings.fieldId == fieldId
            )[0];
            if (fieldView) {
               // let remainingViews = currView.views(c => c.settings.fieldId != fieldId);
               // currView._views = remainingViews;

               await fieldView.destroy();

               // Refresh UI
               currView.emit("properties.updated", currView);
            }
         }

         // trigger a save()
         // this.propertyEditorSave(ids, currView);
      };

      return commonUI.concat([
         {
            name: "datacollection",
            view: "richselect",
            label: L("Data Source"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            skipAutoSave: true,
            on: {
               onChange: (dcId, oldDcId) => _logic.selectSource(dcId, oldDcId),
            },
         },
         {
            name: "fields",
            view: "list",
            select: false,
            minHeight: 200,
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
               check: (e, fieldId) => _logic.check(e, fieldId),
            },
         },
         {
            name: "showLabel",
            view: "checkbox",
            label: L("Display Label"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
         },
         {
            name: "labelPosition",
            view: "richselect",
            label: L("Label Position"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            options: [
               {
                  id: "left",
                  value: L("Left"),
               },
               {
                  id: "top",
                  value: L("Top"),
               },
            ],
         },
         {
            name: "labelWidth",
            view: "counter",
            label: L("Label Width"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
         },
         {
            view: "counter",
            name: "height",
            label: L("Height:"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      var SourceSelector = $$(ids.datacollection);
      var datacollectionId = view.settings.dataviewID || null;

      // Pull data views to options
      var dcOptions = view.propertyDatacollections();
      SourceSelector.define("options", dcOptions);
      SourceSelector.define("value", datacollectionId);
      SourceSelector.refresh();

      this.propertyUpdateFieldOptions(ids, view, datacollectionId);

      $$(ids.showLabel).setValue(
         view.settings.showLabel != null
            ? view.settings.showLabel
            : ABViewDetailPropertyComponentDefaults.showLabel
      );
      $$(ids.labelPosition).setValue(
         view.settings.labelPosition ||
            ABViewDetailPropertyComponentDefaults.labelPosition
      );
      $$(ids.labelWidth).setValue(
         parseInt(view.settings.labelWidth) ||
            ABViewDetailPropertyComponentDefaults.labelWidth
      );
      $$(ids.height).setValue(
         view.settings.height >= 0
            ? view.settings.height
            : ABViewDetailPropertyComponentDefaults.height
      );

      // update properties when a field component is deleted
      view.views().forEach((v) => {
         if (v instanceof ABViewDetailComponent)
            v.once("destroyed", () =>
               this.propertyEditorPopulate(App, ids, view)
            );
      });
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.dataviewID = $$(ids.datacollection).getValue();
      view.settings.showLabel = $$(ids.showLabel).getValue();
      view.settings.labelPosition = $$(ids.labelPosition).getValue();
      view.settings.labelWidth = $$(ids.labelWidth).getValue();
      view.settings.height = $$(ids.height).getValue();
   }

   static propertyUpdateFieldOptions(ids, view, dcId) {
      var datacollection = view.AB.datacollectionByID(dcId);
      var object = datacollection ? datacollection.datasource : null;

      // Pull field list
      var fieldOptions = [];
      if (object != null) {
         fieldOptions = object.fields().map((f) => {
            f.selected =
               view.views((com) => {
                  return f.id == com.settings.fieldId;
               }).length > 0;

            return f;
         });
      }

      $$(ids.fields).clearAll();
      $$(ids.fields).parse(fieldOptions);
   }

   /**
    * @method component()
    * return a UI component based upon this view.
    * @param {obj } App
    * @param {string} idPrefix - define to support in 'Datacollection' widget
    *
    * @return {obj } UI component
    */
   component(App, idPrefix) {
      // get webix.dashboard
      var container = super.component(App, idPrefix);

      var _ui = {
         type: "form",
         borderless: true,
         // height: this.settings.height || ABViewDetailPropertyComponentDefaults.height,
         rows: [
            {
               // view: "scrollview",
               body: container.ui,
            },
         ],
      };

      // make sure each of our child views get .init() called
      var _init = (options, parentAccessLevel) => {
         // populate .views to webix.dashboard
         container.init(options, parentAccessLevel);
      };

      var _logic = {
         displayData: (rowData) => {
            rowData = rowData || {};

            let views = this.views() || [];
            views = views.sort((a, b) => {
               if (!a || !b || !a.field || !b.field) return 0;

               // NOTE: sort order of calculated fields.
               // FORMULA field type should be calculated before CALCULATE field type
               if (a.field.key == "formula" && b.field.key == "calculate") {
                  return -1;
               } else if (
                  a.field.key == "calculate" &&
                  b.field.key == "formula"
               ) {
                  return 1;
               } else {
                  return 0;
               }
            });

            views.forEach((f) => {
               if (f.field) {
                  var field = f.field();
                  var val;

                  if (!field) return;

                  if (!rowData) return;

                  // get value of relation when field is a connect field
                  switch (field.key) {
                     case "connectObject":
                        val = field.pullRelationValues(rowData);
                        break;
                     case "list":
                        val = rowData[field.columnName];
                        if (!val) {
                           val = "";
                           break;
                        }

                        if (field.settings.isMultiple == 0) {
                           let myVal = "";

                           field.settings.options.forEach(function (options) {
                              if (options.id == val) myVal = options.text;
                           });

                           if (field.settings.hasColors) {
                              let myHex = "#66666";
                              let hasCustomColor = "";
                              field.settings.options.forEach(function (h) {
                                 if (h.text == myVal) {
                                    myHex = h.hex;
                                    hasCustomColor = "hascustomcolor";
                                 }
                              });
                              myVal = `<span class="webix_multicombo_value ${hasCustomColor}" style="background-color: ${myHex} !important;"><span>${myVal}</span></span>`;
                           }

                           val = myVal;
                        } else {
                           let items = [];
                           let myVal = "";
                           val.forEach((value) => {
                              var hasCustomColor = "";
                              var optionHex = "";
                              if (field.settings.hasColors && value.hex) {
                                 hasCustomColor = "hascustomcolor";
                                 optionHex = `background: ${value.hex};`;
                              }
                              field.settings.options.forEach(function (
                                 options
                              ) {
                                 if (options.id == value.id)
                                    myVal = options.text;
                              });
                              items.push(
                                 `<span class="webix_multicombo_value ${hasCustomColor}" style="${optionHex}" optvalue="${value.id}"><span>${myVal}</span></span>`
                              );
                           });
                           val = items.join("");
                        }
                        break;
                     case "user":
                        val = field.pullRelationValues(rowData);
                        break;
                     case "file":
                        val = rowData[field.columnName];
                        break;
                     case "formula":
                        if (rowData) {
                           let dv = this.datacollection;
                           let ds = dv ? dv.datasource : null;
                           let needRecalculate =
                              !ds || ds instanceof ABObjectQuery ? false : true;

                           val = field.format(rowData, needRecalculate);
                        }
                        break;
                     default:
                        val = field.format(rowData);
                     // break;
                  }
               }

               // set value to each components
               var vComponent = f.component(App, idPrefix);

               // if (vComponent.onShow) vComponent.onShow();

               if (vComponent.logic && vComponent.logic.setValue) {
                  vComponent.logic.setValue(val);
               }

               if (vComponent.logic && vComponent.logic.displayText) {
                  vComponent.logic.displayText(rowData);
               }
            });
         },
      };

      var _onShow = () => {
         container.onShow();
         try {
            const dataCy = `Detail ${this.name.split(".")[0]} ${this.id}`;
            $$(container.ui.id).$view.setAttribute("data-cy", dataCy);
         } catch (e) {
            console.warn("Problem setting data-cy", e);
         }

         // listen DC events
         let dv = this.datacollection;
         if (dv) {
            let currData = dv.getCursor();
            if (currData) {
               _logic.displayData(currData);
            }

            this.eventAdd({
               emitter: dv,
               eventName: "changeCursor",
               listener: (newRow) => {
                  _logic.displayData(newRow);
               },
            });

            this.eventAdd({
               emitter: dv,
               eventName: "create",
               listener: (createdRow) => {
                  let currCursor = dv.getCursor();
                  if (currCursor && currCursor.id == createdRow.id)
                     _logic.displayData(createdRow);
               },
            });

            this.eventAdd({
               emitter: dv,
               eventName: "update",
               listener: (updatedRow) => {
                  let currCursor = dv.getCursor();
                  if (currCursor && currCursor.id == updatedRow.id)
                     _logic.displayData(updatedRow);
               },
            });
         }
      };

      return {
         ui: _ui,
         init: _init,
         logic: _logic,

         onShow: _onShow,
      };
   }

   clearFieldComponents() {
      let tasks = [];

      this.views().forEach((comp) => {
         tasks.push(() => comp.destroy());
      });

      return tasks.reduce((promiseChain, currTask) => {
         return promiseChain.then(currTask);
      }, Promise.resolve([]));
   }

   addFieldToView(field, yPosition, ids, App) {
      if (field == null) return;

      let newView = field.detailComponent().newInstance(this.application, this);
      if (newView == null) return;

      // set settings to component
      newView.settings = newView.settings || {};
      newView.settings.fieldId = field.id;
      newView.settings.labelWidth =
         this.settings.labelWidth ||
         ABViewDetailPropertyComponentDefaults.labelWidth;

      // keep alias to support Query that contains alias name
      // [alias].[columnName]
      newView.settings.alias = field.alias;

      // TODO : Default settings

      newView.position.y = yPosition;

      // add a new component
      this._views.push(newView);

      // update properties when a sub-view is destroyed
      newView.once("destroyed", () => {
         ABViewDetail.propertyEditorPopulate(App, ids, this);
      });

      return newView;
   }
};
