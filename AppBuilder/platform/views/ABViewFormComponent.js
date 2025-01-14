const ABViewFormComponentCore = require("../../core/views/ABViewFormComponentCore");

const ABViewFormFieldPropertyComponentDefaults = ABViewFormComponentCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABViewFormComponent extends ABViewFormComponentCore {
   // constructor(values, application, parent, defaultValues) {
   //    super(values, application, parent, defaultValues);
   // }

   static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {
      var commonUI = super.propertyEditorDefaultElements(
         App,
         ids,
         _logic,
         ObjectDefaults
      );

      return commonUI.concat([
         {
            name: "fieldLabel",
            view: "text",
            disabled: true,
            label: L("Field"),
         },
         {
            name: "required",
            view: "checkbox",
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
            labelRight: L("Required"),
         },
         {
            name: "disable",
            view: "checkbox",
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
            labelRight: L("Disable"),
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      var field = view.field();

      $$(ids.fieldLabel).setValue(field ? field.label : "");

      if (field && field.settings.required == 1) {
         $$(ids.required).setValue(field.settings.required);
         $$(ids.required).disable();
      } else {
         $$(ids.required).setValue(
            view.settings.required != null
               ? view.settings.required
               : ABViewFormFieldPropertyComponentDefaults.required
         );
      }

      if (view && view.settings.disable == 1) {
         $$(ids.disable).setValue(view.settings.disable);
      } else {
         $$(ids.disable).setValue(
            ABViewFormFieldPropertyComponentDefaults.disable
         );
      }
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      // console.log("here");
      view.settings.required = $$(ids.required).getValue();
      view.settings.disable = $$(ids.disable).getValue();
      // console.log(view);
   }

   /*
    * @component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      // setup 'label' of the element
      var form = this.parentFormComponent(),
         field = this.field(),
         label = "";

      var settings = {};
      if (form) settings = form.settings;

      var _ui = {
         labelPosition: settings.labelPosition,
         labelWidth: settings.labelWidth,
         label: label,
      };

      if (field != null) {
         _ui.name = field.columnName;

         // default value
         var data = {};
         field.defaultValue(data);
         if (data[field.columnName]) _ui.value = data[field.columnName];

         if (settings.showLabel == true) {
            _ui.label = field.label;
         }

         if (
            field.settings.required == true ||
            this.settings.required == true
         ) {
            _ui.required = 1;
         }

         if (this.settings.disable == 1) {
            _ui.disabled = true;
         }

         // add data-cy to form element for better testing code
         _ui.on = {
            onAfterRender() {
               if (this.getList) {
                  var popup = this.getPopup();
                  if (!popup) return;
                  this.getList().data.each((option) => {
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
               this.getInputNode().setAttribute(
                  "data-cy",
                  `${field.key} ${field.columnName} ${field.id} ${form.id}`
               );
            },
         };

         // this may be needed if we want to format data at this point
         // if (field.format) data = field.format(data);

         _ui.validate = (val, data, colName) => {
            let validator = this.AB.Validation.validator();

            field.isValidData(data, validator);

            return validator.pass();
         };
      }

      var _init = () => {};

      return {
         ui: _ui,
         init: _init,
      };
   }

   /**
    * @method parentFormUniqueID
    * return a unique ID based upon the closest form object this component is on.
    * @param {string} key  The basic id string we will try to make unique
    * @return {string}
    */
   parentFormUniqueID(key) {
      var form = this.parentFormComponent();
      var uniqueInstanceID;
      if (form) {
         uniqueInstanceID = form.uniqueInstanceID;
      } else {
         uniqueInstanceID = webix.uid();
      }

      return key + uniqueInstanceID;
   }
};
