/*
 * ab_work_object_workspace_kanban
 *
 * Manage the Object Workspace KanBan area.
 *
 */
const ABComponent = require("../AppBuilder/platform/ABComponent");

const ABFieldConnect = require("../AppBuilder/platform/dataFields/ABFieldConnect");
const ABFieldList = require("../AppBuilder/platform/dataFields/ABFieldList");
const ABFieldUser = require("../AppBuilder/platform/dataFields/ABFieldUser");

const AB_Work_Form = require("./ab_work_object_workspace_formSidePanel");

module.exports = class ABWorkObjectKanBan extends ABComponent {
   /**
    *
    * @param {*} App
    * @param {*} idBase
    */

   constructor(App, idBase) {
      idBase = idBase || "ab_work_object_workspace_kanban";
      super(App, idBase);

      var L = this.Label();

      // internal list of Webix IDs to reference our UI components.
      var ids = {
         component: this.unique(`${idBase}_workspace_kanban`),
         kanban: this.unique(`${idBase}_kanban`),
         resizer: this.unique(`${idBase}_resizer`),
      };

      let FormSide = new AB_Work_Form(App, `${idBase}_kanban_form`);

      var CurrentObject = null; // current ABObject being displayed
      var CurrentDatacollection = null;
      var CurrentVerticalField = null;
      var CurrentHorizontalField = null;
      var CurrentOwnerField = null;

      let _updatingOwnerRowId;

      // Our webix UI definition:
      this.ui = {
         id: ids.component,
         cols: [
            {
               id: ids.kanban,
               view: "kanban",
               cols: [],
               userList: {
                  view: "menu",
                  // yCount: 8,
                  // scroll: false,
                  template: '<i class="fa fa-user"></i> #value#',
                  width: 150,
                  on: {
                     onSelectChange: function () {
                        if (_updatingOwnerRowId == null)
                           // get this row id from onAvatarClick event
                           return;

                        let userId = this.getSelectedId(false);
                        if (userId == null) return;

                        _logic.updateOwner(_updatingOwnerRowId, userId);
                     },
                  },
               },
               editor: false, // we use side bar
               users: [],
               tags: [],
               data: [],
               on: {
                  onListAfterSelect: (itemId, list) => {
                     if (CurrentDatacollection)
                        CurrentDatacollection.setCursor(itemId);

                     if (_logic.callbacks.onSelect)
                        _logic.callbacks.onSelect(itemId);

                     if (itemId) {
                        let data = $$(ids.kanban).getItem(itemId);
                        FormSide.show(data);

                        if ($$(ids.resizer)) $$(ids.resizer).show();
                     } else {
                        FormSide.hide();

                        if ($$(ids.resizer)) $$(ids.resizer).hide();
                     }
                  },
                  onAfterStatusChange: (rowId, status, list) => {
                     _logic.updateStatus(rowId, status);
                  },
                  onAvatarClick: function (rowId, ev, node, list) {
                     // keep this row id for update owner data in .userList
                     _updatingOwnerRowId = rowId;
                  },
               },
            },
            {
               id: ids.resizer,
               view: "resizer",
               css: "bg_gray",
               width: 11,
               hidden: true,
            },
            FormSide.ui,
         ],
      };

      // Our init() function for setting up our UI
      this.init = (options = {}) => {
         // register our callbacks:
         for (var c in _logic.callbacks) {
            _logic.callbacks[c] = options[c] || _logic.callbacks[c];
         }

         if ($$(ids.kanban)) webix.extend($$(ids.kanban), webix.ProgressBar);

         FormSide.init({
            onAddData: _logic.saveData,
            onUpdateData: _logic.saveData,
            onClose: _logic.unselect,
         });
      };

      // our internal business logic
      var _logic = (this._logic = {
         callbacks: {
            onSelect: function (itemId) {},
         },

         kanbanListTemplate: function () {
            return {
               icons: [
                  // { icon: "mdi mdi-comment", show: function (obj) { return !!obj.comments }, template: "#comments.length#" },
                  {
                     icon: "fa fa-trash-o",
                     click: function (rowId, e) {
                        _logic.removeCard(rowId);
                     },
                  },
               ],
               // avatar template
               templateAvatar: function (obj) {
                  if (CurrentOwnerField && obj[CurrentOwnerField.columnName]) {
                     return CurrentOwnerField.format(obj);
                  } else {
                     return "<span class='webix_icon fa fa-user'></span>";
                  }
               },
               // template for item body
               // show item image and text
               templateBody: function (data) {
                  return CurrentObject.displayData(data);

                  // var html = "";
                  // if (obj.image)
                  // 	html += "<img class='image' src='../common/imgs/attachments/" + obj.image + "'/>";
                  // html += "<div>" + obj.text + "</div>";
                  // return html;
               },
            };
         },

         /**
          * @function hide()
          *
          * hide this component.
          */
         hide: function () {
            $$(ids.component).hide();
         },

         /**
          * @function show()
          *
          * Show this component.
          */
         show: async () => {
            if ($$(ids.component)) $$(ids.component).show();

            FormSide.hide();

            if ($$(ids.resizer)) $$(ids.resizer).hide();

            if (CurrentObject) {
               // Get object's kanban view
               let kanbanView = CurrentObject.workspaceViews.getCurrentView();
               if (kanbanView && kanbanView.type == "kanban") {
                  // Set Kanban fields
                  _logic.setFields({
                     verticalGrouping: kanbanView.getVerticalGroupingField(),
                     horizontalGrouping: kanbanView.getHorizontalGroupingField(),
                     ownerField: kanbanView.getOwnerField(),
                  });
               }
            }

            // Get vertical grouping field and populate to kanban list
            // NOTE: this field should be the select list type
            CurrentVerticalField = _logic.getVerticalGroupingField();
            if (!CurrentVerticalField) return;

            let horizontalOptions = [];
            CurrentHorizontalField = _logic.getHorizontalGroupingField();

            if (
               CurrentHorizontalField &&
               CurrentHorizontalField instanceof ABFieldConnect
            ) {
               // Pull horizontal options
               horizontalOptions = await CurrentHorizontalField.getOptions();
            }

            // Option format -  { id: "1543563751920", text: "Normal", hex: "#4CAF50" }
            let verticalOptions = (
               CurrentVerticalField.settings.options || []
            ).map((opt) => {
               // Vertical & Horizontal fields
               if (CurrentVerticalField && CurrentHorizontalField) {
                  let rows = [],
                     // [{
                     //		id: '',
                     //		text: ''
                     // }]
                     horizontalVals = [];

                  // pull options of the Horizontal field
                  if (CurrentHorizontalField instanceof ABFieldList) {
                     horizontalVals = CurrentHorizontalField.settings.options;
                  } else if (CurrentHorizontalField instanceof ABFieldUser) {
                     horizontalVals = CurrentHorizontalField.getUsers().map(
                        (u) => {
                           return {
                              id: u.id,
                              text: u.text || u.value,
                           };
                        }
                     );
                  } else if (CurrentHorizontalField instanceof ABFieldConnect) {
                     horizontalVals = horizontalOptions.map(({ id, text }) => ({
                        id,
                        text,
                     }));
                  }

                  horizontalVals.push({
                     id: null,
                     text: "Other",
                  });

                  horizontalVals.forEach((val) => {
                     let statusOps = {};
                     statusOps[CurrentVerticalField.columnName] = opt.id;
                     statusOps[CurrentHorizontalField.columnName] = val.id;

                     // Header
                     rows.push({
                        template: val.text,
                        height: 20,
                        css: "progress_header",
                     });

                     // Kanban list
                     rows.push({
                        view: "kanbanlist",
                        status: statusOps,
                        type: _logic.kanbanListTemplate(),
                     });
                  });

                  return {
                     header: opt.text,
                     body: {
                        margin: 0,
                        rows: rows,
                     },
                  };
               }
               // Vertical field only
               else if (CurrentVerticalField) {
                  let statusOps = {};
                  statusOps[CurrentVerticalField.columnName] = opt.id;

                  return {
                     header: opt.text,
                     body: {
                        view: "kanbanlist",
                        status: statusOps,
                        type: _logic.kanbanListTemplate(),
                     },
                  };
               }
            });

            // Rebuild kanban that contains options
            // NOTE: webix kanban does not support dynamic vertical list
            webix.ui(verticalOptions, $$(ids.kanban));
            $$(ids.kanban).reconstruct();

            // Owner field
            CurrentOwnerField = _logic.getOwnerField();
            if (CurrentOwnerField) {
               let $menuUser = $$(ids.kanban).getUserList();
               $menuUser.clearAll();

               if (CurrentOwnerField instanceof ABFieldUser) {
                  let users = this.AB.Account.userlist().map((u) => {
                     return {
                        id: u.username,
                        value: u.username,
                     };
                  });

                  $menuUser.parse(users);
               } else if (CurrentOwnerField instanceof ABFieldConnect) {
                  let options = await CurrentOwnerField.getOptions();

                  $menuUser.parse(
                     options.map((opt) => {
                        return {
                           id: opt.id,
                           value: opt.text,
                        };
                     })
                  );
               }
            }
         },

         busy: function () {
            if ($$(ids.kanban).showProgress)
               $$(ids.kanban).showProgress({ type: "icon" });
         },

         ready: function () {
            if ($$(ids.kanban).hideProgress) $$(ids.kanban).hideProgress();
         },

         objectLoad: (object) => {
            CurrentObject = object;

            FormSide.objectLoad(object);
         },

         /**
          * @method datacollectionLoad
          *
          * @param datacollection {ABDatacollection}
          */
         datacollectionLoad: (datacollection) => {
            CurrentDatacollection = datacollection;

            if (CurrentDatacollection)
               CurrentDatacollection.bind($$(ids.kanban));
            else $$(ids.kanban).unbind();
         },

         updateStatus: async function (rowId, status) {
            if (!CurrentVerticalField) return;

            // Show loading cursor
            _logic.busy();

            let patch = {};

            // update multi-values
            if (status instanceof Object) {
               patch = status;
            }
            // update single value
            else {
               patch[CurrentVerticalField.columnName] = status;
            }

            // update empty value
            let needRefresh = false;
            for (let key in patch) {
               if (patch[key] == null) {
                  patch[key] = "";

                  // WORKAROUND: if update data is empty, then it will need to refresh the kanban after update
                  needRefresh = true;
               }
            }

            try {
               await CurrentObject.model().update(rowId, patch);

               _logic.ready();

               if (needRefresh) _logic.show();

               // update form data
               if (FormSide.isVisible()) {
                  let data = $$(ids.kanban).getItem(rowId);
                  FormSide.refresh(data);
               }
            } catch (err) {
               App.AB.notify.developer(err, { message: "Error saving item:" });

               _logic.ready();
            }
         },

         updateOwner: async function (rowId, val) {
            if (!CurrentOwnerField) return;

            // Show loading cursor
            _logic.busy();

            let patch = {};
            patch[CurrentOwnerField.columnName] = val;

            try {
               let updatedRow = await CurrentObject.model().update(
                  rowId,
                  patch
               );

               // update card
               $$(ids.kanban).updateItem(rowId, updatedRow);

               // update form data
               if (FormSide.isVisible()) {
                  let data = $$(ids.kanban).getItem(rowId);
                  FormSide.refresh(data);
               }

               _logic.ready();
            } catch (err) {
               App.AB.notify.developer(err, { message: "Error saving item:" });

               _logic.ready();
            }
         },

         saveData(data) {
            // update
            if (data.id && $$(ids.kanban).exists(data.id)) {
               $$(ids.kanban).updateItem(data.id, data);
            }
            // insert
            else {
               $$(ids.kanban).add(data);
            }
         },

         unselect: function () {
            if ($$(ids.kanban)) {
               $$(ids.kanban).eachList(function (list, status) {
                  if (list && list.unselect) list.unselect();
               });
            }
         },

         addCard: () => {
            _logic.unselect();

            // show the side form
            FormSide.show();
            $$(ids.resizer).show();
         },

         removeCard: async (rowId) => {
            webix.confirm({
               title: L("Remove card"),
               text: L("Do you want to delete this card?"),
               callback: async (result) => {
                  if (!result) return;

                  _logic.busy();

                  try {
                     let response = await CurrentObject.model().delete(rowId);

                     if (response.numRows > 0) {
                        $$(ids.kanban).remove(rowId);
                     } else {
                        webix.alert({
                           text: L(
                              "No rows were effected. This does not seem right."
                           ),
                        });
                     }

                     _logic.ready();
                  } catch (err) {
                     App.AB.notify.developer(err, {
                        message: "Error deleting item:",
                     });

                     _logic.ready();
                  }
               },
            });
         },

         /**
          * @method setFields
          *
          * @param options - {
          * 		verticalGrouping:	{ABField} - required
          * 		horizontalGrouping:	{ABField} - optional
          * 		ownerField:			{ABField} - optional
          * }
          *
          */
         setFields: (options) => {
            this._verticalGrouping = options.verticalGrouping;
            this._horizontalGrouping = options.horizontalGrouping;
            this._ownerField = options.ownerField;
         },

         getVerticalGroupingField: () => {
            return this._verticalGrouping ? this._verticalGrouping : null;
         },

         getHorizontalGroupingField: () => {
            return this._horizontalGrouping ? this._horizontalGrouping : null;
         },

         getOwnerField: () => {
            return this._ownerField ? this._ownerField : null;
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

      this.addCard = _logic.addCard;
   }
};
