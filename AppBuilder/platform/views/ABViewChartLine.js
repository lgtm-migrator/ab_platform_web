const ABViewChartLineCore = require("../../core/views/ABViewChartLineCore");

const ABViewChartLinePropertyComponentDefaults = ABViewChartLineCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABViewChartLine extends ABViewChartLineCore {
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
      let idBase = "ABViewChartLineEditorComponent";
      let ids = {
         component: App.unique(`${idBase}_component`),
      };

      let baseEditor = super.editorComponent(App, mode, {
         componentId: ids.component,
      });

      return baseEditor;
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

      // in addition to the common .label  values, we
      // ask for:
      return commonUI.concat([
         {
            name: "lineType",
            view: "richselect",
            label: L("Chart Type"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            options: [
               {
                  id: "line",
                  value: L("Line"),
               },
               {
                  id: "spline",
                  value: L("Spline"),
               },
            ],
         },
         {
            name: "linePreset",
            view: "richselect",
            label: L("Chart Preset"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            options: [
               {
                  id: "plot",
                  value: L("Plot"),
               },
               {
                  id: "diamond",
                  value: L("Diamond"),
               },
               {
                  id: "simple",
                  value: L("Simple"),
               },
            ],
         },
         // {
         // 	name: 'chartWidth',
         // 	view: 'counter',
         // 	min: 1,
         // 	label: L('ab.component.chart.line.chartWidth', '*Width')
         // },
         {
            name: "chartHeight",
            view: "counter",
            min: 1,
            label: L("Height"),
         },
         {
            name: "stepValue",
            view: "counter",
            min: 1,
            label: L("Step"),
         },
         {
            name: "maxValue",
            view: "counter",
            min: 1,
            label: L("Max Value"),
         },
         {
            name: "labelFontSize",
            view: "counter",
            min: 1,
            label: L("Label Font Size"),
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
         },
         {
            name: "isLegend",
            view: "checkbox",
            labelRight: L("Show Legend"),
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      // Make sure you set the values for this property editor in Webix
      // $$(ids.chartWidth).setValue(view.settings.chartWidth != null ? view.settings.chartWidth : ABViewChartLinePropertyComponentDefaults.chartWidth);
      $$(ids.chartHeight).setValue(
         view.settings.chartHeight != null
            ? view.settings.chartHeight
            : ABViewChartLinePropertyComponentDefaults.chartHeight
      );
      $$(ids.labelFontSize).setValue(
         view.settings.labelFontSize != null
            ? view.settings.labelFontSize
            : ABViewChartLinePropertyComponentDefaults.labelFontSize
      );
      $$(ids.stepValue).setValue(
         view.settings.stepValue != null
            ? view.settings.stepValue
            : ABViewChartLinePropertyComponentDefaults.stepValue
      );
      $$(ids.maxValue).setValue(
         view.settings.maxValue != null
            ? view.settings.maxValue
            : ABViewChartLinePropertyComponentDefaults.maxValue
      );
      $$(ids.lineType).setValue(
         view.settings.lineType != null
            ? view.settings.lineType
            : ABViewChartLinePropertyComponentDefaults.lineType
      );
      $$(ids.linePreset).setValue(
         view.settings.linePreset != null
            ? view.settings.linePreset
            : ABViewChartLinePropertyComponentDefaults.linePreset
      );
      $$(ids.isLegend).setValue(
         view.settings.isLegend != null
            ? view.settings.isLegend
            : ABViewChartLinePropertyComponentDefaults.isLegend
      );
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      // Retrive the values of your properties from Webix and store them in the view
      view.settings.lineType = $$(ids.lineType).getValue();
      view.settings.linePreset = $$(ids.linePreset).getValue();
      view.settings.isLegend = $$(ids.isLegend).getValue();
      // view.settings.chartWidth = $$(ids.chartWidth).getValue();
      view.settings.chartHeight = $$(ids.chartHeight).getValue();
      view.settings.labelFontSize = $$(ids.labelFontSize).getValue();
      view.settings.stepValue = $$(ids.stepValue).getValue();
      view.settings.maxValue = $$(ids.maxValue).getValue();
   }

   /**
    * @method component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      let baseComp = super.component(App);

      // get a UI component for each of our child views
      var viewComponents = [];
      this.views().forEach((v) => {
         viewComponents.push(v.component(App));
      });

      var idBase = "ABViewChartLine_" + this.id;
      var ids = {
         component: App.unique(`${idBase}_component`),
      };

      var _ui = {
         id: ids.component,
         view: "chart",
         type:
            this.settings.lineType != null
               ? this.settings.lineType
               : ABViewChartLinePropertyComponentDefaults.lineType,
         preset:
            this.settings.linePreset != null
               ? this.settings.linePreset
               : ABViewChartLinePropertyComponentDefaults.linePreset,
         value: "#value#",
         color: "#color#",
         yAxis: {
            start: 0,
            step:
               this.settings.stepValue != null
                  ? this.settings.stepValue
                  : ABViewChartLinePropertyComponentDefaults.stepValue, //"#stepValue#",
            end:
               this.settings.maxValue != null
                  ? this.settings.maxValue
                  : ABViewChartLinePropertyComponentDefaults.maxValue, //"#maxValue#"
         },
         xAxis: {
            template:
               this.settings.isLegend == true
                  ? "<div style='font-size:" +
                    this.settings.labelFontSize +
                    "px;'>#label#</div>"
                  : "",
         },
         legend:
            this.settings.isLegend == true
               ? {
                    template:
                       "<div style='font-size:" +
                       this.settings.labelFontSize +
                       "px;'>#label#</div>",
                    values: [], // TODO : bug in webix 5.1.7
                 }
               : null,
         height:
            this.settings.chartHeight != null
               ? this.settings.chartHeight
               : ABViewChartLinePropertyComponentDefaults.chartHeight,
         // width: this.settings.chartWidth != null ? this.settings.chartWidth : ABViewChartLinePropertyComponentDefaults.chartWidth,
         // data: reportData
      };

      let _init = () => {
         baseComp.init({
            componentId: ids.component,
         });
      };
      let _logic = baseComp.logic;
      let _onShow = baseComp.onShow;

      return {
         ui: _ui,
         init: _init,
         logic: _logic,

         onShow: _onShow,
      };
   }
};
