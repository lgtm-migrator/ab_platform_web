/*
 * ab_work_object_workspace_gantt
 *
 * Manage the Object Workspace Gantt area.
 *
 */

const ABComponent = require("../AppBuilder/platform/ABComponent");

const DAY_SCALE = { unit: "day", format: "%d" },
   WEEK_SCALE = {
      unit: "week",
      format: (start) => {
         const parser = webix.Date.dateToStr("%d %M");
         const wstart = webix.Date.weekStart(start);
         const wend = webix.Date.add(
            webix.Date.add(wstart, 1, "week", true),
            -1,
            "day",
            true
         );
         return parser(wstart) + " - " + parser(wend);
      },
   },
   MONTH_SCALE = { unit: "month", format: "%F" },
   YEAR_SCALE = { unit: "year", format: "%Y" };

module.exports = class ABWorkObjectGantt extends ABComponent {
   /**
    *
    * @param {*} App
    * @param {*} idBase
    */
   constructor(App, idBase) {
      idBase = idBase || "ab_work_object_workspace_gantt";
      super(App, idBase);

      let L = this.Label();

      // internal list of Webix IDs to reference our UI components.
      let ids = {
         component: this.unique(`${idBase}_workspace_gantt_component`),
         menu: this.unique(`${idBase}_workspace_gantt_menu`),
         gantt: this.unique(`${idBase}_workspace_gantt`),
      };

      let CurrentObject = null,
         CurrentDatacollection = null,
         CurrentGanttView = null,
         CurrentTitleField = null,
         CurrentStartDateField = null,
         CurrentEndDateField = null,
         CurrentDurationField = null,
         CurrentProgressField = null,
         CurrentNotesField = null;

      // Our webix UI definition:
      let gantt = require("../js/webix/components/gantt/gantt");
      this.ui = {
         id: ids.component,
         rows: [
            {
               cols: [
                  { fillspace: true },
                  {
                     view: "menu",
                     id: ids.menu,
                     layout: "x",
                     width: 300,
                     data: [
                        {
                           id: "day",
                           value: L("Day"),
                        },
                        {
                           id: "week",
                           value: L("Week"),
                        },
                        {
                           id: "month",
                           value: L("Month"),
                        },
                        {
                           id: "year",
                           value: L("Year"),
                        },
                     ],
                     on: {
                        onItemClick: (id, e, node) => {
                           _logic.setScale(id);
                        },
                     },
                  },
               ],
            },
            {
               id: ids.gantt,
               view: "gantt",
               scales: [YEAR_SCALE, MONTH_SCALE, DAY_SCALE],
               override: new Map([
                  [
                     gantt.services.Backend,
                     class MyBackend extends gantt.services.Backend {
                        async tasks() {
                           if (!CurrentDatacollection) return [];

                           if (
                              CurrentDatacollection.dataStatus !=
                              CurrentDatacollection.dataStatusFlag.initialized
                           )
                              await CurrentDatacollection.loadData();

                           return (
                              CurrentDatacollection.getData() || []
                           ).map((d, index) => _logic.convertFormat(d));
                        }
                        async links() {
                           return [];
                        }
                        async addTask(obj, index, parent) {
                           let newTask = await _logic.addTask(obj);
                           return { id: (newTask || {}).id };
                        }
                        async updateTask(id, obj) {
                           await _logic.updateTask(obj.id, obj);
                           return {};
                        }
                        async removeTask(id) {
                           await _logic.removeTask(id);
                           return {};
                        }
                     },
                  ],
               ]),
            },
         ],
      };

      // Our init() function for setting up our UI
      this.init = (options) => {};

      let originalStartDate = null;
      let originalEndDate = null;

      // our internal business logic
      var _logic = (this._logic = {
         /**
          * @function hide()
          *
          * hide this component.
          */
         hide: function () {
            if (!$$(ids.component)) return;
            $$(ids.component).hide();
         },

         /**
          * @function show()
          *
          * Show this component.
          */
         show: () => {
            if (!$$(ids.component)) return;
            $$(ids.component).show();

            // Get object's kanban view
            CurrentGanttView = _logic.getCurrentView();
            if (!CurrentGanttView) return;

            // Fields
            this.setFields({
               titleField: CurrentGanttView.titleField,
               startDateField: CurrentGanttView.startDateField,
               endDateField: CurrentGanttView.endDateField,
               durationField: CurrentGanttView.durationField,
               progressField: CurrentGanttView.progressField,
               notesField: CurrentGanttView.notesField,
            });
         },

         objectLoad: (object) => {
            CurrentObject = object;
         },

         /**
          * @method datacollectionLoad
          *
          * @param datacollection {ABDatacollection}
          */
         datacollectionLoad: (datacollection) => {
            CurrentDatacollection = datacollection;

            if (
               CurrentDatacollection.dataStatus ==
               CurrentDatacollection.dataStatusFlag.initialized
            ) {
               _logic.initData();
            }

            CurrentDatacollection.on("initializedData", () => {
               if (CurrentObject.currentView().type != "gantt") return;

               _logic.initData();
            });

            // real-time update
            CurrentDatacollection.on("create", (vals) => {
               if (CurrentObject.currentView().type != "gantt") return;

               _logic.initData();
            });

            CurrentDatacollection.on("update", (vals) => {
               if (CurrentObject.currentView().type != "gantt") return;

               _logic.initData();
            });
            CurrentDatacollection.on("delete", (taskId) => {
               if (CurrentObject.currentView().type != "gantt") return;

               // remove this task in gantt
               if (_logic.ganttElement.isExistsTask(taskId))
                  _logic.ganttElement.removeTask(taskId);
            });
         },

         setFields: ({
            titleField,
            startDateField,
            endDateField,
            durationField,
            progressField,
            notesField,
         }) => {
            CurrentTitleField = titleField;
            CurrentStartDateField = startDateField;
            CurrentEndDateField = endDateField;
            CurrentDurationField = durationField;
            CurrentProgressField = progressField;
            CurrentNotesField = notesField;
         },

         getCurrentView: () => {
            if (!CurrentObject || !CurrentObject.workspaceViews) return null;

            // Get object's kanban view
            let ganttView = CurrentObject.workspaceViews.getCurrentView();
            if (ganttView && ganttView.type == "gantt") return ganttView;
            else return null;
         },

         setScale: (scale) => {
            let ganttElem = $$(ids.gantt);
            if (!ganttElem) return;

            let ganttData = ganttElem.getService("local");
            if (!ganttData) return;

            let newScales = [];

            switch (scale) {
               case "day":
                  newScales = [YEAR_SCALE, MONTH_SCALE, DAY_SCALE];
                  break;
               case "week":
                  newScales = [YEAR_SCALE, MONTH_SCALE, WEEK_SCALE];
                  break;
               case "month":
                  newScales = [YEAR_SCALE, MONTH_SCALE];
                  break;
               case "year":
                  newScales = [YEAR_SCALE];
                  break;
            }

            const currScale = ganttElem.getService("local").getScales(),
               start = webix.Date.add(originalStartDate, -1, scale, true),
               end = webix.Date.add(originalEndDate, 1, scale, true);

            ganttData.setScales(
               start,
               end,
               currScale.precise,
               currScale.cellWidth,
               currScale.cellHeight,
               newScales
            );
            ganttElem.$app.refresh();
            ganttElem.getState().$batch({ top: 0, left: 0 });
         },

         initData: () => {
            let ganttElem = $$(ids.gantt);
            if (!ganttElem) return;

            let dataService = ganttElem.getService("local");
            if (!dataService) return;

            let dcTasks = dataService.tasks();
            if (!dcTasks) return;

            dcTasks.clearAll();

            let gantt_data = {
               data: CurrentDatacollection
                  ? (CurrentDatacollection.getData() || []).map((d, index) =>
                       _logic.convertFormat(d)
                    )
                  : [],
            };

            // check required fields before parse
            if (
               CurrentStartDateField &&
               (CurrentEndDateField || CurrentDurationField)
            ) {
               dcTasks.parse(gantt_data);
            }

            // Keep original start and end dates for calculate scale to display
            const currScale = dataService.getScales();
            originalStartDate = currScale.start;
            originalEndDate = currScale.end;

            _logic.sort();
         },

         convertFormat: (row, index) => {
            let data = {};
            row = row || {};

            if (
               !CurrentStartDateField ||
               (!CurrentEndDateField && !CurrentDurationField)
            )
               return data;

            let currDate = new Date();
            data["id"] = row.id;
            data["type"] = "task";
            data["parent"] = 0;
            data["open"] = true;
            // define label
            data["text"] = CurrentTitleField
               ? row[CurrentTitleField.columnName] || ""
               : CurrentObject.displayData(row);
            data["start_date"] =
               row[CurrentStartDateField.columnName] || currDate;
            data["progress"] = CurrentProgressField
               ? parseFloat(row[CurrentProgressField.columnName] || 0)
               : 0;

            if (CurrentNotesField)
               data["details"] = row[CurrentNotesField.columnName] || "";

            if (CurrentEndDateField)
               data["end_date"] =
                  row[CurrentEndDateField.columnName] || currDate;

            if (CurrentDurationField)
               data["duration"] = row[CurrentDurationField.columnName] || 1;

            // Default values
            if (!data["end_date"] && !data["duration"]) {
               data["end_date"] = currDate;
               data["duration"] = 1;
            }

            if (index != null) data["order"] = index;

            return data;
         },

         convertValues: (task) => {
            let patch = {};

            if (CurrentTitleField)
               patch[CurrentTitleField.columnName] = task["text"] || "";

            if (CurrentStartDateField)
               patch[CurrentStartDateField.columnName] = task["start_date"];

            if (CurrentProgressField)
               patch[CurrentProgressField.columnName] = parseFloat(
                  task["progress"] || 0
               );

            if (CurrentNotesField)
               patch[CurrentNotesField.columnName] = task["details"];

            if (CurrentEndDateField)
               patch[CurrentEndDateField.columnName] = task["end_date"];

            if (CurrentDurationField)
               patch[CurrentDurationField.columnName] = task["duration"];

            return patch;
         },

         addTask: async (taskData) => {
            let patch = _logic.convertValues(taskData);

            try {
               return await CurrentObject.model().create(patch);
            } catch (err) {
               this.AB.notify.developer(err, {
                  message: "Error when's adding a task in gantt workspace",
               });

               throw err;
            }
         },

         updateTask: async (rowId, updatedTask) => {
            let patch = _logic.convertValues(updatedTask);

            try {
               await CurrentObject.model().update(rowId, patch);
            } catch (err) {
               this.AB.notify.developer(err, {
                  message: "Error when's updating a task in gantt workspace",
               });

               throw err;
            }
         },

         removeTask: async (rowId) => {
            try {
               await CurrentObject.model().delete(rowId);
            } catch (err) {
               this.AB.notify.developer(err, {
                  message: "Error when's deleting a task in gantt workspace",
               });
            }
         },

         sort: () => {
            if (
               CurrentObject.workspaceSortFields &&
               CurrentObject.workspaceSortFields.length > 0
            )
               return;

            // TODO: sorting;
            return;
            // let gantt = $$(ids.gantt).getGantt();
            // if (!gantt) return;

            // // default sort
            // let MAX_date = new Date(8640000000000000);
            // gantt.sort(function(a, b) {
            //    let aStartDate = a["start_date"],
            //       aEndDate = a["end_date"],
            //       aDuration = a["duration"] || 1,
            //       bStartDate = b["start_date"],
            //       bEndDate = b["end_date"],
            //       bDuration = b["duration"] || 1;

            //    // if no start date, then be a last item
            //    if (
            //       a[CurrentStartDateField.columnName] == null ||
            //       b[CurrentStartDateField.columnName] == null
            //    ) {
            //       return (
            //          (a[CurrentStartDateField.columnName] || MAX_date) -
            //          (b[CurrentStartDateField.columnName] || MAX_date)
            //       );
            //    } else if (aStartDate != bStartDate) {
            //       return aStartDate - bStartDate;
            //    } else if (aEndDate != bEndDate) {
            //       return aEndDate - bEndDate;
            //    } else if (aDuration != bDuration) {
            //       return bDuration - aDuration;
            //    }
            // }, false);
         },

         ganttElement: {
            isExistsTask: (taskId) => {
               let localService = $$(ids.gantt).getService("local");
               if (!localService) return false;

               let tasksData = localService.tasks();
               if (!tasksData || !tasksData.exists) return false;

               return tasksData.exists(taskId);
            },
            removeTask: (taskId) => {
               if (!_logic.ganttElement.isExistsTask(taskId)) return;

               let opsService = $$(ids.gantt).getService("operations");
               if (!opsService) return;

               return opsService.removeTask(taskId);
            },
         },
      });

      //
      // Define our external interface methods:
      //

      this.hide = _logic.hide;
      this.show = _logic.show;
      this.objectLoad = _logic.objectLoad;
      this.datacollectionLoad = _logic.datacollectionLoad;
      this.setFields = _logic.setFields;
   }
};
