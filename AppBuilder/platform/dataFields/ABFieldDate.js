var ABFieldDateCore = require("../../core/dataFields/ABFieldDateCore");

module.exports = class ABFieldDate extends ABFieldDateCore {
   constructor(values, object) {
      super(values, object);
   }

   ///
   /// Instance Methods
   ///

   isValid() {
      var validator = super.isValid();

      // validator.addError('columnName', L('ab.validation.object.name.unique', 'Field columnName must be unique (#name# already used in this Application)').replace('#name#', this.name) );

      return validator;
   }

   ///
   /// Working with Actual Object Values:
   ///

   // return the grid column header definition for this instance of ABFieldDate
   columnHeader(options) {
      var config = super.columnHeader(options);

      // if (this.settings.includeTime)
      // config.editor = "datetime";
      // else
      config.editor = "date";

      // allows entering characters in datepicker input, false by default
      config.editable = true;

      // NOTE: it seems that the default value is a string in ISO format.

      //// NOTE: webix seems unable to parse ISO string into => date here.
      // config.map = '(date)#'+this.columnName+'#';   // so don't use this.

      config.template = (row) => {
         if (row.$group) return row[this.columnName];

         return this.format(row);
      };

      config.format = (d) => {
         var rowData = {};
         rowData[this.columnName] = d;

         return this.format(rowData);
      };

      config.editFormat = (d) => {
         // this routine needs to return a Date() object for the editor to work with.

         if (d == "" || d == null) {
            return "";
         }

         // else retun the actual ISO string => Date() value
         return this.AB.toDate(d);
      };

      return config;
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
      var formComponentSetting = super.formComponent("datepicker");

      // .common() is used to create the display in the list
      formComponentSetting.common = () => {
         return {
            key: "datepicker",
         };
      };

      return formComponentSetting;
   }

   detailComponent() {
      var detailComponentSetting = super.detailComponent();

      detailComponentSetting.common = () => {
         return {
            key: "detailtext",
         };
      };

      return detailComponentSetting;
   }

   dateToString(dateFormat, dateData) {
      return webix.Date.dateToStr(dateFormat)(dateData);
   }
};
