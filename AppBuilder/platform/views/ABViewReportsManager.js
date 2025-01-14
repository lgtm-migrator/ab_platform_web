const ABViewReportsManagerCore = require("../../core/views/ABViewReportsManagerCore");

module.exports = class ABViewReportsManager extends ABViewReportsManagerCore {
   constructor(values, application, parent, defaultValues) {
      super(values, application, parent, defaultValues);
   }

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
      let idBase = "ABViewReportsManagerEditorComponent";
      let ids = {
         component: App.unique(`${idBase}_component`),
      };

      let component = this.component(App);

      component.ui.id = ids.component;

      component.init = (options) => {};

      return component;
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

      return commonUI.concat([]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.dataviewID = $$(ids.datacollection).getValue();
   }

   /*
    * @component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      let baseCom = super.component(App);

      let idBase = `ABViewReportManager_${this.id}`;
      let ids = {
         component: App.unique(`${idBase}_component`),
      };

      let compInstance = this;

      let _ui = {
         id: ids.component,
         view: "reports",
         toolbar: true,
         override: new Map([
            [
               reports.services.Backend,
               class MyBackend extends reports.services.Backend {
                  getModules() {
                     return Promise.resolve(
                        compInstance.settings.moduleList || []
                     );
                  }
                  saveModule(id, data) {
                     id = id || webix.uid();
                     compInstance.settings.moduleList =
                        compInstance.settings.moduleList || [];

                     let indexOfModule = null;
                     let module = compInstance.settings.moduleList.filter(
                        (m, index) => {
                           let isExists = m.id == id;
                           if (isExists) indexOfModule = index;

                           return isExists;
                        }
                     )[0];

                     // Update
                     if (module) {
                        compInstance.settings.moduleList[indexOfModule] = data;
                     }
                     // Add
                     else {
                        compInstance.settings.moduleList.push(data);
                     }

                     return new Promise((resolve, reject) => {
                        compInstance
                           .save()
                           .catch(reject)
                           .then(() => {
                              resolve({ id: id });
                           });
                     });
                  }
                  deleteModule(id) {
                     compInstance.settings.moduleList =
                        compInstance.settings.moduleList || [];

                     compInstance.settings.moduleList = compInstance.settings.moduleList.filter(
                        (m) => m.id != id
                     );

                     return new Promise((resolve, reject) => {
                        compInstance
                           .save()
                           .catch(reject)
                           .then(() => {
                              resolve({ id: id });
                           });
                     });
                  }

                  getModels() {
                     let reportModels = {};

                     (compInstance.AB.datacollections() || []).forEach((dc) => {
                        let obj = dc.datasource;
                        if (!obj) return;

                        let reportFields = _logic.getReportFields(dc);

                        // get connected data collections
                        // let linkedFields = [];
                        // (obj.connectFields() || []).forEach((f, index) => {
                        //    let connectedDcs = compInstance.AB.datacollections(
                        //       (dColl) =>
                        //          dColl &&
                        //          dColl.datasource &&
                        //          dColl.datasource.id == f.settings.linkObject
                        //    );
                        //    (connectedDcs || []).forEach((linkedDc) => {
                        //       linkedFields.push({
                        //          id: index + 1,
                        //          name: linkedDc.label,
                        //          source: dc.id,
                        //          target: linkedDc.id
                        //       });
                        //    });
                        // });

                        // // MOCK UP for testing
                        // let linkedFields = [
                        //    {
                        //       id: "id",
                        //       name: "id",
                        //       source: "39378ee0-38f0-4b9d-a5aa-dddc61137fcd", // Player
                        //       target: "0de82362-4ab5-4f0f-8cfa-d1288d173cba" // Team
                        //    }
                        // ];

                        reportModels[dc.id] = {
                           id: dc.id,
                           name: dc.label,
                           data: reportFields,
                           refs: [],
                        };
                     });

                     return Promise.resolve(reportModels);
                  }

                  getQueries() {
                     return Promise.resolve(
                        compInstance.settings.queryList || []
                     );
                  }
                  saveQuery(id, data) {
                     id = id || webix.uid();
                     compInstance.settings.queryList =
                        compInstance.settings.queryList || [];

                     let indexOfQuery = null;
                     let query = compInstance.settings.queryList.filter(
                        (m, index) => {
                           let isExists = m.id == id;
                           if (isExists) indexOfQuery = index;

                           return isExists;
                        }
                     )[0];

                     // Update
                     if (query) {
                        compInstance.settings.queryList[indexOfQuery] = data;
                     }
                     // Add
                     else {
                        compInstance.settings.queryList.push(data);
                     }

                     return new Promise((resolve, reject) => {
                        compInstance
                           .save()
                           .catch(reject)
                           .then(() => {
                              resolve({ id: id });
                           });
                     });
                  }
                  deleteQuery(id) {
                     compInstance.settings.queryList =
                        compInstance.settings.queryList || [];

                     compInstance.settings.queryList = compInstance.settings.queryList.filter(
                        (m) => m.id != id
                     );

                     return new Promise((resolve, reject) => {
                        compInstance
                           .save()
                           .catch(reject)
                           .then(() => {
                              resolve({ id: id });
                           });
                     });
                  }

                  getData(config) {
                     let result = [];
                     let pullDataTasks = [];
                     let dcIds = [];
                     let dcData = {};
                     let reportFields = [];

                     // pull data of the base and join DCs
                     dcIds.push(config.data);
                     (config.joins || []).forEach((j) => {
                        dcIds.push(j.sid);
                        dcIds.push(j.tid);
                     });
                     dcIds = compInstance.AB.uniq(dcIds);
                     dcIds.forEach((dcId) => {
                        pullDataTasks.push(
                           new Promise((next, bad) => {
                              _logic
                                 .getData(dcId)
                                 .catch(bad)
                                 .then((data) => {
                                    dcData[dcId] = data || [];
                                    next();
                                 });
                           })
                        );
                     });

                     dcIds.forEach((dcId) => {
                        let dataCol = compInstance.AB.datacollectionByID(dcId);
                        if (!dataCol) return;

                        reportFields = reportFields.concat(
                           _logic.getReportFields(dataCol).map((f) => {
                              // change format of id to match the report widget
                              f.id = `${dcId}.${f.id}`; // dc_id.field_id
                              return f;
                           })
                        );
                     });

                     return (
                        Promise.resolve()
                           .then(() => Promise.all(pullDataTasks))
                           .then(
                              () =>
                                 new Promise((next, bad) => {
                                    // the data result equals data of the base DC
                                    result = dcData[config.data] || [];

                                    // no join settings
                                    if (!config.joins || !config.joins.length) {
                                       return next();
                                    }

                                    (config.joins || []).forEach((j) => {
                                       let sourceDc = compInstance.AB.datacollectionByID(
                                          j.sid
                                       );
                                       if (!sourceDc) return;

                                       let sourceObj = sourceDc.datasource;
                                       if (!sourceObj) return;

                                       let targetDc = compInstance.AB.datacollectionByID(
                                          j.tid
                                       );
                                       if (!targetDc) return;

                                       let targetObj = targetDc.datasource;
                                       if (!targetObj) return;

                                       let sourceLinkField = sourceObj.fieldByID(
                                          j.sf
                                       );
                                       let targetLinkField = targetObj.fieldByID(
                                          j.tf
                                       );
                                       if (!sourceLinkField && !targetLinkField)
                                          return;

                                       let sourceData = dcData[j.sid] || [];
                                       let targetData = dcData[j.tid] || [];
                                       sourceData.forEach((sData) => {
                                          targetData.forEach((tData) => {
                                             let sVal =
                                                sData[
                                                   sourceLinkField
                                                      ? `${j.sid}.${sourceLinkField.columnName}.id`
                                                      : `${j.sid}.id`
                                                ] || [];

                                             let tVal =
                                                tData[
                                                   targetLinkField
                                                      ? `${j.tid}.${targetLinkField.columnName}.id`
                                                      : `${j.tid}.id`
                                                ] || [];

                                             if (!Array.isArray(sVal))
                                                sVal = [sVal];
                                             if (!Array.isArray(tVal))
                                                tVal = [tVal];

                                             // Add joined row to the result array
                                             let matchedVal = sVal.filter(
                                                (val) => tVal.indexOf(val) > -1
                                             );
                                             if (
                                                matchedVal &&
                                                matchedVal.length
                                             ) {
                                                let updateRows =
                                                   result.filter(
                                                      (r) =>
                                                         r[`${j.sid}.id`] ==
                                                            sData[
                                                               `${j.sid}.id`
                                                            ] &&
                                                         r[`${j.tid}.id`] ==
                                                            null
                                                   ) || [];

                                                if (
                                                   updateRows &&
                                                   updateRows.length
                                                ) {
                                                   (updateRows || []).forEach(
                                                      (r) => {
                                                         for (let key in tData) {
                                                            if (key != "id")
                                                               r[key] =
                                                                  tData[key];
                                                         }
                                                      }
                                                   );
                                                } else {
                                                   result.push(
                                                      Object.assign(
                                                         compInstance.AB.cloneDeep(
                                                            sData
                                                         ),
                                                         compInstance.AB.cloneDeep(
                                                            tData
                                                         )
                                                      )
                                                   );
                                                }
                                             }
                                          });
                                       });
                                    });

                                    next();
                                 })
                           )
                           // filter & sort
                           .then(
                              () =>
                                 new Promise((next, bad) => {
                                    let queryVal;
                                    try {
                                       queryVal = JSON.parse(
                                          config.query || "{}"
                                       );
                                    } catch (err) {
                                       bad(err);
                                    }

                                    if (
                                       queryVal &&
                                       queryVal.rules &&
                                       queryVal.rules.length
                                    ) {
                                       queryVal.rules.forEach((r) => {
                                          if (!r || !r.type || !r.condition)
                                             return;

                                          switch (r.type) {
                                             case "date":
                                             case "datetime":
                                                // Convert string to Date object
                                                if (r.condition.filter) {
                                                   if (
                                                      this.AB.isString(
                                                         r.condition.filter
                                                      )
                                                   ) {
                                                      r.condition.filter = this.AB.toDate(
                                                         r.condition.filter
                                                      );
                                                   }

                                                   if (
                                                      r.condition.filter
                                                         .start &&
                                                      this.AB.isString(
                                                         r.condition.filter
                                                            .start
                                                      )
                                                   ) {
                                                      r.condition.filter.start = this.AB.toDate(
                                                         r.condition.filter
                                                            .start
                                                      );
                                                   }

                                                   if (
                                                      r.condition.filter.end &&
                                                      this.AB.isString(
                                                         r.condition.filter.end
                                                      )
                                                   ) {
                                                      r.condition.filter.end = this.AB.toDate(
                                                         r.condition.filter.end
                                                      );
                                                   }
                                                }
                                                break;
                                          }
                                       });
                                    }

                                    // create a new query widget to get the filter function
                                    let filterElem = webix.ui({
                                       view: "query",
                                       fields: reportFields,
                                       value: queryVal,
                                    });

                                    // create a new data collection and apply the query filter
                                    let tempDc = new webix.DataCollection();
                                    tempDc.parse(result);

                                    // filter
                                    let filterFn;
                                    try {
                                       filterFn = filterElem.getFilterFunction();
                                    } catch (error) {
                                       // continue regardless of error
                                    }
                                    if (filterFn) tempDc.filter(filterFn);

                                    // sorting
                                    (config.sort || []).forEach((sort) => {
                                       if (sort.id)
                                          tempDc.sort({
                                             as: "string",
                                             dir: sort.mod || "asc",
                                             by: `#${sort.id}#`,
                                          });
                                    });

                                    result = tempDc.serialize();

                                    // clear
                                    filterElem.destructor();
                                    tempDc.destructor();

                                    // group by
                                    if (config.group && config.group.length) {
                                       (config.group || []).forEach(
                                          (groupProp) => {
                                             result = _(result).groupBy(
                                                groupProp
                                             );
                                          }
                                       );

                                       result = result
                                          .map((groupedData, id) => {
                                             let groupedResult = {};

                                             (config.columns || []).forEach(
                                                (col) => {
                                                   let agg = col.split(".")[0];
                                                   let rawCol = col.replace(
                                                      /sum.|avg.|count.|max.|min./g,
                                                      ""
                                                   );

                                                   switch (agg) {
                                                      case "sum":
                                                         groupedResult[
                                                            col
                                                         ] = compInstance.AB.sumBy(
                                                            groupedData,
                                                            rawCol
                                                         );
                                                         break;
                                                      case "avg":
                                                         groupedResult[
                                                            col
                                                         ] = compInstance.AB.meanBy(
                                                            groupedData,
                                                            rawCol
                                                         );
                                                         break;
                                                      case "count":
                                                         groupedResult[col] = (
                                                            groupedData || []
                                                         ).length;
                                                         break;
                                                      case "max":
                                                         groupedResult[col] =
                                                            (compInstance.AB.maxBy(
                                                               groupedData,
                                                               rawCol
                                                            ) || {})[rawCol] ||
                                                            "";
                                                         break;
                                                      case "min":
                                                         groupedResult[col] =
                                                            (compInstance.AB.minBy(
                                                               groupedData,
                                                               rawCol
                                                            ) || {})[rawCol] ||
                                                            "";
                                                         break;
                                                      default:
                                                         groupedResult[col] =
                                                            groupedData[0][col];
                                                         break;
                                                   }
                                                }
                                             );

                                             return groupedResult;
                                          })
                                          .value();
                                    }

                                    next();
                                 })
                           )
                           .then(() => Promise.resolve(result))
                     );
                  }
                  getOptions(fields) {
                     // TODO
                     // [
                     //    {"id":"1","value":"South"},
                     //    {"id":"2","value":"North"},
                     //    // other options
                     //  ]
                     return Promise.resolve([]);
                  }
                  getFieldData(fieldId) {
                     // TODO
                     return Promise.resolve([]);
                  }
               },
            ],
            [
               reports.views.table,
               class MyTable extends reports.views.table {
                  // NOTE: fix format of date column type
                  GetColumnConfig(a) {
                     if (a.type === "date") {
                        return {
                           id: a.id,
                           header:
                              !a.meta.header || a.meta.header === "none"
                                 ? a.meta.name || a.name
                                 : [
                                      a.meta.name || a.name,
                                      {
                                         content:
                                            a.header === "text"
                                               ? "textFilter"
                                               : "richSelectFilter",
                                      },
                                   ],
                           type: a.type,
                           sort: "date",
                           width: a.width || 200,
                           format: (val) => {
                              // check valid date
                              if (val && val.getTime && !isNaN(val.getTime())) {
                                 return webix.i18n.dateFormatStr(val);
                              } else {
                                 return "";
                              }
                           },
                        };
                     } else {
                        return super.GetColumnConfig(a);
                     }
                  }
               },
            ],
         ]),
      };

      // make sure each of our child views get .init() called
      let _init = (options) => {
         options = options || {};
         options.componentId = options.componentId || ids.component;

         return Promise.resolve();
      };

      let _logic = {
         getReportFields: (dc) => {
            if (!dc) return [];

            let object = dc.datasource;
            if (!object) return [];

            let fields = [];

            object.fields().forEach((f) => {
               let columnFormat = f.columnHeader();

               fields.push({
                  id: f.columnName,
                  name: f.label,
                  filter: f.fieldIsFilterable(),
                  edit: false,
                  type: columnFormat.editor || "text",
                  format: columnFormat.format,
                  options: columnFormat.options,
                  ref: "",
                  key: false,
                  show: true,
                  abField: f,
               });

               if (f.isConnection && f.settings.isSource) {
                  let linkedDcs = compInstance.AB.datacollectionByID(f.settings.linkObject);
                  (linkedDcs || []).forEach((linkDc) => {
                     fields.push({
                        id: f.id,
                        name: f.label,
                        filter: false,
                        edit: false,
                        type: "reference",
                        ref: linkDc.id,
                        key: false,
                        show: false,
                     });
                  });
               }
            });

            return fields;
         },

         getData: (datacollectionId) => {
            let datacollection = compInstance.AB.datacollectionByID(
               datacollectionId
            );
            if (!datacollection) return Promise.resolve([]);

            let object = datacollection.datasource;
            if (!object) return Promise.resolve([]);

            return Promise.resolve()
               .then(
                  () =>
                     new Promise((next, bad) => {
                        if (
                           datacollection.dataStatus ==
                           datacollection.dataStatusFlag.notInitial
                        ) {
                           datacollection
                              .loadData()
                              .catch(bad)
                              .then(() => next());
                        } else {
                           next();
                        }
                     })
               )
               .then(
                  () =>
                     new Promise((next, bad) => {
                        let reportFields = _logic.getReportFields(
                           datacollection
                        );

                        let reportData = [];
                        let rawData = datacollection.getData();
                        (rawData || []).forEach((row) => {
                           let reportRow = { id: row.id };
                           reportRow[`${datacollection.id}.id`] = row.id;

                           object.fields().forEach((field) => {
                              let columnName = field.columnName;
                              let col = `${datacollection.id}.${columnName}`;

                              reportRow[col] = field
                                 ? field.format(row)
                                 : row[columnName];

                              // FK value of the connect field
                              if (field && field.isConnection) {
                                 if (Array.isArray(row[columnName])) {
                                    reportRow[`${col}.id`] = row[
                                       columnName
                                    ].map(
                                       (link) =>
                                          link[field.datasourceLink.PK()] ||
                                          link.id ||
                                          link
                                    );
                                 } else if (row[columnName]) {
                                    reportRow[`${col}.id`] =
                                       row[columnName][
                                          field.datasourceLink.PK()
                                       ] ||
                                       row[columnName].id ||
                                       row[columnName];
                                 }
                              }

                              let rField = reportFields.filter(
                                 (f) => f.id == columnName
                              )[0];
                              if (!rField) return;

                              switch (rField.type) {
                                 case "text":
                                 case "reference":
                                    reportRow[col] = (
                                       reportRow[col] || ""
                                    ).toString();
                                    break;
                                 case "number":
                                    reportRow[col] = parseFloat(
                                       (reportRow[col] || 0)
                                          .toString()
                                          .replace(/[^\d.-]/g, "")
                                    );
                                    break;
                                 case "date":
                                 case "datetime":
                                    reportRow[col] = row[columnName];
                                    if (reportRow[col]) {
                                       if (!(reportRow[col] instanceof Date)) {
                                          reportRow[
                                             col
                                          ] = compInstance.AB.toDate(
                                             row[columnName]
                                          );
                                       }
                                    } else {
                                       reportRow[col] = "";
                                    }
                                    break;
                              }
                           });
                           reportData.push(reportRow);
                        });

                        return next(reportData);
                     })
               );
         },
      };

      return {
         ui: _ui,
         init: _init,
         logic: _logic,

         onShow: baseCom.onShow,
      };
   }
};
