const ABViewTabCore = require("../../core/views/ABViewTabCore");

const ABViewTabPropertyComponentDefaults = ABViewTabCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABViewTab extends ABViewTabCore {
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
      var idBase = "ABViewTabEditorComponent";
      var ids = {
         component: App.unique(`${idBase}_component`),
         view: App.unique(`${idBase}_view`),
      };
      var component = this.component(App);

      var tabElem = component.ui;

      if (tabElem.rows) {
         tabElem.rows[0].id = ids.component;
         tabElem.rows[0].tabbar = {
            height: 60,
            type: "bottom",
            css: this.settings.darkTheme ? "webix_dark" : "",
            on: {
               onItemClick: (id, e) => {
                  var tabId = $$(ids.component).getValue(),
                     tab = this.views((v) => v.id == tabId)[0],
                     currIndex = this._views.findIndex((v) => v.id == tabId);

                  // Rename
                  if (e.target.classList.contains("rename")) {
                     ABViewTab.popupShow(tab);
                  }
                  // Reorder back
                  else if (e.target.classList.contains("move-back")) {
                     this.viewReorder(tabId, currIndex - 1);

                     // refresh editor view
                     this.emit("properties.updated", this);
                  }
                  // Reorder next
                  else if (e.target.classList.contains("move-next")) {
                     this.viewReorder(tabId, currIndex + 1);

                     // refresh editor view
                     this.emit("properties.updated", this);
                  }
               },
            },
         };

         // Add action buttons
         if (tabElem.rows[0].cells && tabElem.rows[0].cells.length > 0) {
            tabElem.rows[0].cells.forEach((tabView) => {
               // Add 'move back' icon
               tabView.header =
                  '<i class="fa fa-caret-left move-back ab-tab-back"></i>' +
                  tabView.header;
               // Add 'edit' icon
               tabView.header +=
                  ' <i class="fa fa-pencil-square rename ab-tab-edit"></i>';
               // Add 'move next' icon
               tabView.header +=
                  ' <i class="fa fa-caret-right move-next ab-tab-next"></i>';
            });
         }
      } else if (tabElem.cols) {
         // if we detect colums we are using sidebar and need to format the onItemClick event differently
         var viewIndex = 1;
         var tabIndex = 0;

         if (this.settings.sidebarPos == "right") {
            // the sidebar is in the second column now so we need to reference it properly
            viewIndex = 0;
            tabIndex = 1;
         }

         tabElem.cols[viewIndex].id = ids.component;
         tabElem.cols[tabIndex].on = {
            onItemClick: (id, e) => {
               var tabId = id.replace("_menu", ""),
                  tab = this.views((v) => v.id == tabId)[0],
                  currIndex = this._views.findIndex((v) => v.id == tabId);

               component.onShow(tabId);

               // Rename
               if (e.target.classList.contains("rename")) {
                  ABViewTab.popupShow(tab);
               }
               // Reorder back
               else if (e.target.classList.contains("move-back")) {
                  this.viewReorder(tabId, currIndex - 1);

                  // refresh editor view
                  this.emit("properties.updated", this);
               }
               // Reorder next
               else if (e.target.classList.contains("move-next")) {
                  this.viewReorder(tabId, currIndex + 1);

                  // refresh editor view
                  this.emit("properties.updated", this);
               }
            },
         };

         // Add action buttons
         if (
            tabElem.cols[tabIndex].data &&
            tabElem.cols[tabIndex].data.length > 0
         ) {
            tabElem.cols[tabIndex].data.forEach((sidebarItem) => {
               // Add 'edit' icon
               sidebarItem.value =
                  sidebarItem.value +
                  ' <i class="fa fa-pencil-square rename ab-tab-edit"></i>';
               // Add 'move up' icon
               sidebarItem.value +=
                  '<i class="fa fa-caret-up move-back ab-tab-up"></i>';
               // Add 'move down' icon
               sidebarItem.value +=
                  ' <i class="fa fa-caret-down move-next ab-tab-down"></i>';
            });
         }
      }

      var _ui = {
         rows: [tabElem],
      };

      var _init = (options) => {
         component.init(options);

         // Add actions buttons - Edit , Delete
         if ($$(ids.component) && $$(ids.component).config.view == "tabview") {
            webix.ui({
               container: $$(ids.component).getMultiview().$view,
               view: "template",
               autoheight: false,
               height: 1,
               width: 0,
               template:
                  '<div class="ab-component-tools ab-layout-view ab-tab-tools">' +
                  '<i class="fa fa-trash ab-component-remove"></i>' +
                  '<i class="fa fa-edit ab-component-edit"></i>' +
                  "</div>",
               onClick: {
                  "ab-component-edit": function (e, id, trg) {
                     _logic.tabEdit(e, id, trg);
                  },
                  "ab-component-remove": function (e, id, trg) {
                     _logic.tabRemove(e, id, trg);
                  },
               },
            });
         } else if (
            $$(ids.component) &&
            $$(ids.component).config.view == "multiview"
         ) {
            webix.ui({
               container: $$(ids.component).$view,
               view: "template",
               autoheight: false,
               height: 1,
               width: 0,
               template:
                  '<div class="ab-component-tools ab-layout-view ab-tab-tools">' +
                  '<i class="fa fa-trash ab-component-remove"></i>' +
                  '<i class="fa fa-edit ab-component-edit"></i>' +
                  "</div>",
               onClick: {
                  "ab-component-edit": function (e, id, trg) {
                     _logic.tabEdit(e, id, trg);
                  },
                  "ab-component-remove": function (e, id, trg) {
                     _logic.tabRemove(e, id, trg);
                  },
               },
            });
         }

         component.onShow();
      };

      var _logic = {
         // templateBlock: (tab) => {
         // 	var _template = [
         // 		'<div class="ab-component-in-page">',
         // 		'<div id="' + ids.view + '_#objID#" >',
         // 		'<i class="fa fa-#icon#"></i>',
         // 		' #label#',
         // 		'</div>',
         // 		'</div>'
         // 	].join('');

         // 	return _template
         // 		.replace('#objID#', tab.id)
         // 		.replace('#icon#', tab.icon)
         // 		.replace('#label#', tab.label);
         // },

         tabEdit: (e, nodeId, trg) => {
            var tabId = $$(ids.component).getValue();
            var view = this.views(function (v) {
               return v.id == tabId;
            })[0];

            if (!view) return false;

            // NOTE: let webix finish this onClick event, before
            // calling .populateInterfaceWorkspace() which will replace
            // the interface elements with the edited view.  (apparently
            // that causes errors.)
            setTimeout(() => {
               console.error("ABViewTab: refactor .actions to .emit");
               App.actions.populateInterfaceWorkspace(view);
            }, 50);

            e.preventDefault();
            return false;
         },

         tabRemove: (e, nodeId, trg) => {
            var tabId = $$(ids.component).getValue();
            var deletedView = this.views((v) => v.id == tabId)[0];
            if (deletedView) {
               webix.confirm({
                  title: L("Delete tab"),
                  text: L("Do you want to delete <b>{0}</b>?", [
                     deletedView.label,
                  ]),
                  callback: (result) => {
                     if (result) {
                        // this.viewDestroy(deletedView);
                        deletedView.destroy();

                        // remove tab option
                        $$(ids.component).removeView(tabId);
                     }
                  },
               });
            }

            e.preventDefault();
            return false;
         },
      };

      return {
         ui: _ui,
         init: _init,
         logic: _logic,
      };
   }

   //
   // Property Editor
   //

   static addTab(ids, _logic, tabName, tabIcon) {
      // get current instance and .addTab()
      var LayoutView = _logic.currentEditObject();
      return LayoutView.addTab(tabName, tabIcon);

      // trigger a save()
      // this.propertyEditorSave(ids, LayoutView);
   }

   static editTab(ids, _logic, tabId, tabName, tabIcon) {
      // get current instance and rename tab
      var LayoutView = _logic.currentEditObject();
      var editedTab = LayoutView.views((v) => v.id == tabId)[0];

      if (!editedTab) return;

      editedTab.label = tabName;
      editedTab.tabicon = tabIcon;

      // trigger a save()
      // this.propertyEditorSave(ids, LayoutView);
      return editedTab.save();
   }

   static popupShow(tab) {
      var popup = $$("ab-component-tab-add-new-tab-popup");
      var form = $$("ab-component-tab-add-new-tab-form");
      var button = $$("ab-component-tab-save-button");

      if (popup) {
         // Edit tab
         if (tab) {
            form.setValues({
               id: tab.id,
               label: tab.label,
               tabicon: tab.tabicon,
            });

            popup.getHead().setHTML(L("Edit Tab"));
            button.setValue(L("Save"));
         }
         // Add new tab
         else {
            form.setValues({
               id: null,
               label: "",
            });

            popup.getHead().setHTML(L("Add Tab"));
            button.setValue(L("Add"));
         }

         button.refresh();

         // show 'add new field' popup
         popup.show();
      }
   }

   static popupClose() {
      var popup = $$("ab-component-tab-add-new-tab-popup");

      if (popup) popup.hide();
   }

   static popupBusy() {
      var button = $$("ab-component-tab-save-button");

      if (button) button.disable();
   }

   static popupReady() {
      var button = $$("ab-component-tab-save-button");

      if (button) button.enable();
   }

   static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {
      var commonUI = super.propertyEditorDefaultElements(
         App,
         ids,
         _logic,
         ObjectDefaults
      );

      // create 'add new tab' popup
      webix
         .ui({
            id: "ab-component-tab-add-new-tab-popup",
            view: "window",
            height: 250,
            width: 300,
            modal: true,
            position: "center",
            head: " ",
            body: {
               id: "ab-component-tab-add-new-tab-form",
               view: "form",
               elements: [
                  {
                     view: "text",
                     name: "label",
                     id: "ab-component-tab-name",
                     label: L("Label"),
                     required: true,
                  },
                  {
                     view: "combo",
                     id: "ab-component-tab-icon",
                     name: "tabicon",
                     label: L("Icon"),
                     options: {
                        filter: function (item, value) {
                           if (
                              item.value
                                 .toString()
                                 .toLowerCase()
                                 .indexOf(value.toLowerCase()) === 0
                           )
                              return true;
                           return false;
                        },
                        body: {
                           data: App.icons,
                           template:
                              "<i class='fa fa-fw fa-#value#'></i> #value#",
                        },
                     },
                  },
                  // action buttons
                  {
                     cols: [
                        { fillspace: true },
                        {
                           view: "button",
                           value: L("Cancel"),
                           css: "ab-cancel-button",
                           autowidth: true,
                           click: () => {
                              this.popupClose();
                           },
                        },
                        {
                           id: "ab-component-tab-save-button",
                           view: "button",
                           css: "webix_primary",
                           value: L("Add Tab"),
                           autowidth: true,
                           type: "form",
                           click: () => {
                              let form = $$(
                                 "ab-component-tab-add-new-tab-form"
                              );
                              if (form.validate()) {
                                 this.popupBusy();

                                 let vals = form.getValues();

                                 let doneFn = () => {
                                    this.popupReady();

                                    this.popupClose();

                                    // Refresh UI
                                    let currView = _logic.currentEditObject();
                                    currView.emit(
                                       "properties.updated",
                                       currView
                                    );
                                 };

                                 // add
                                 if (vals.id == null) {
                                    this.addTab(
                                       ids,
                                       _logic,
                                       vals.label,
                                       vals.tabicon
                                    ).then(() => doneFn());
                                 }
                                 // edit
                                 else {
                                    this.editTab(
                                       ids,
                                       _logic,
                                       vals.id,
                                       vals.label,
                                       vals.tabicon
                                    ).then(() => doneFn());
                                 }
                              }
                           },
                        },
                     ],
                  },
               ],
            },
         })
         .hide();

      // in addition to the common .label  values, we
      // ask for:
      return commonUI.concat([
         {
            view: "counter",
            name: "height",
            label: L("Height"),
         },
         {
            view: "counter",
            name: "minWidth",
            label: L("Minimum width"),
         },
         {
            view: "checkbox",
            name: "stackTabs",
            labelRight: L("Stack Tabs Vertically"),
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
            on: {
               onChange: (newv, oldv) => {
                  if (newv == 1) {
                     $$(ids.sidebarWidth).show();
                     $$(ids.sidebarPos).show();
                     $$(ids.iconOnTop).hide();
                  } else {
                     $$(ids.sidebarWidth).hide();
                     $$(ids.sidebarPos).hide();
                     $$(ids.iconOnTop).show();
                  }
               },
            },
         },
         {
            view: "checkbox",
            name: "iconOnTop",
            labelRight: L("Position icon above text"),
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
         },
         {
            view: "checkbox",
            name: "darkTheme",
            labelRight: L("Use Dark Theme"),
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
         },
         {
            view: "counter",
            name: "sidebarWidth",
            label: L("Width of Sidebar"),
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
         },
         {
            view: "richselect",
            name: "sidebarPos",
            label: L("Position of Sidebar"),
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
            options: [
               { id: "left", value: L("Left") },
               { id: "right", value: L("Right") },
            ],
         },
         // [button] : add tab
         {
            view: "button",
            css: "webix_primary",
            value: L("Add Tab"),
            click: () => {
               this.popupShow();
            },
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      $$(ids.height).setValue(
         view.settings.height || ABViewTabPropertyComponentDefaults.height
      );
      $$(ids.minWidth).setValue(
         view.settings.minWidth || ABViewTabPropertyComponentDefaults.minWidth
      );
      $$(ids.stackTabs).setValue(
         view.settings.stackTabs || ABViewTabPropertyComponentDefaults.stackTabs
      );
      $$(ids.darkTheme).setValue(
         view.settings.darkTheme || ABViewTabPropertyComponentDefaults.darkTheme
      );
      $$(ids.sidebarWidth).setValue(
         view.settings.sidebarWidth ||
            ABViewTabPropertyComponentDefaults.sidebarWidth
      );
      $$(ids.sidebarPos).setValue(
         view.settings.sidebarPos ||
            ABViewTabPropertyComponentDefaults.sidebarPos
      );
      $$(ids.iconOnTop).setValue(
         view.settings.iconOnTop || ABViewTabPropertyComponentDefaults.iconOnTop
      );

      if (view.settings.stackTabs) {
         $$(ids.sidebarWidth).show();
         $$(ids.sidebarPos).show();
         $$(ids.iconOnTop).hide();
      } else {
         $$(ids.sidebarWidth).hide();
         $$(ids.sidebarPos).hide();
         $$(ids.iconOnTop).show();
      }
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.height = $$(ids.height).getValue();
      view.settings.minWidth = $$(ids.minWidth).getValue();
      view.settings.stackTabs = $$(ids.stackTabs).getValue();
      view.settings.darkTheme = $$(ids.darkTheme).getValue();
      view.settings.sidebarWidth = $$(ids.sidebarWidth).getValue();
      view.settings.sidebarPos = $$(ids.sidebarPos).getValue();
      view.settings.iconOnTop = $$(ids.iconOnTop).getValue();
   }

   /**
    * @method component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      var AB = this.AB;

      var comp = super.component(App);
      // get a UI component for each of our child views
      this._viewComponents = [];
      this.views().forEach((v) => {
         var accessLevel = v.getUserAccess();
         if (accessLevel > 0) {
            this._viewComponents.push({
               view: v,
               // component: v.component(App)
            });
         }
      });

      var idBase = "ABViewTab_" + this.id;
      var ids = {
         component: App.unique(`${idBase}_component`),
         sidebar: App.unique(`${idBase}_sidebar`),
         expandMenu: App.unique(`${idBase}_expand_menu`),
         collapseMenu: App.unique(`${idBase}_collapse_menu`),
      };

      var _ui = {};

      // We are going to make a custom icon using the first letter of a menu item for menu items that don't have an icon
      // to do this we need to modify the default template with the method webix recommended form this snippet https://snippet.webix.com/b566d9f8
      webix.type(webix.ui.tree, {
         baseType: "sideBar", // inherit everything else from sidebar type
         name: "customIcons",
         icon: function (obj, common) {
            if (obj.icon.length)
               return (
                  "<span class='webix_icon webix_sidebar_icon fa fa-fw fa-" +
                  obj.icon +
                  "'></span>"
               );
            return (
               "<span class='webix_icon webix_sidebar_icon sidebarCustomIcon'>" +
               obj.value.charAt(0).toUpperCase() +
               "</span>"
            );
         },
      });

      if (this._viewComponents.length > 0) {
         if (this.settings.stackTabs) {
            // define your menu items from the view components
            var menuItems = this.views((view) => {
               var accessLevel = view.getUserAccess();
               if (accessLevel > 0) {
                  return view;
               }
            }).map((v) => {
               return {
                  id: v.id + "_menu",
                  value: v.label,
                  icon: v.tabicon ? v.tabicon : "",
               };
            });

            if (menuItems.length) {
               // create a menu item for the collapse option to use later
               var collapseMenu = {
                  id: ids.collapseMenu,
                  value: L("Collapse Menu"),
                  icon: "chevron-circle-left",
               };

               // create a menu item from the expand option to use later
               var expandMenu = {
                  id: ids.expandMenu,
                  value: L("Expand Menu"),
                  icon: "chevron-circle-right",
                  hidden: true,
               };

               // find out what the first option is so we can set it later
               var selectedItem = this._viewComponents[0].view.id + "_menu";

               var sidebar = {
                  view: "sidebar",
                  type: "customIcons", // define the sidebar type with the new template created above
                  id: ids.sidebar,
                  width: this.settings.sidebarWidth
                     ? this.settings.sidebarWidth
                     : 0,
                  scroll: true,
                  position: this.settings.sidebarPos
                     ? this.settings.sidebarPos
                     : "left",
                  css: this.settings.darkTheme ? "webix_dark" : "",
                  data: menuItems.concat(collapseMenu), // add you menu items along with the collapse option to start
                  on: {
                     onItemClick: function (id, e, node) {
                        // when a menu item is clicked
                        if (id == ids.collapseMenu) {
                           // if it was the collapse menu item
                           setTimeout(function () {
                              // remove the collapse option from the menu
                              $$(ids.sidebar).remove(ids.collapseMenu);
                              // add the expand option to the menu
                              $$(ids.sidebar).add(expandMenu);
                              // toggle the sidebar state
                              $$(ids.sidebar).toggle();
                              // we just clicked the collapse...but we don't wanted highlighted
                              // so highlight the previously selected menu item
                              $$(ids.sidebar).select(selectedItem);
                              // store this state in local storage the user preference is
                              // remembered next time they see this sidebar
                              this.AB.Storage.set(
                                 `${idBase}-state`,
                                 $$(ids.sidebar).getState()
                              );
                           }, 0);
                        } else if (id == ids.expandMenu) {
                           setTimeout(function () {
                              // remove the expand option from the menu
                              $$(ids.sidebar).remove(ids.expandMenu);
                              // add the collapse option to the menu
                              $$(ids.sidebar).add(collapseMenu);
                              // toggle the sidebar state
                              $$(ids.sidebar).toggle();
                              // we just clicked the collapse...but we don't wanted highlighted
                              // so highlight the previously selected menu item
                              $$(ids.sidebar).select(selectedItem);
                              // store this state in local storage the user preference is
                              // remembered next time they see this sidebar
                              this.AB.Storage.set(
                                 `${idBase}-state`,
                                 $$(ids.sidebar).getState()
                              );
                           }, 0);
                        } else {
                           // store the selecte menu item just in case someone toggles the menu later
                           selectedItem = id;
                           // if the menu item is a regular menu item
                           // call the onShow with the view id to load the view
                           id = id.replace("_menu", "");
                           $$(id).show(false, false);
                           // _onShow(id);
                        }
                     },
                     onAfterRender: () => {
                        // set ids of controller buttons
                        let collapseNode = $$(ids.sidebar).$view.querySelector(
                           `[webix_tm_id="${ids.collapseMenu}"]`
                        );
                        if (collapseNode) {
                           collapseNode.setAttribute(
                              "data-cy",
                              `tab-collapseMenu-${ids.collapseMenu}`
                           );
                        }
                        let expandNode = $$(ids.sidebar).$view.querySelector(
                           `[webix_tm_id="${ids.expandMenu}"]`
                        );
                        if (expandNode) {
                           expandNode.setAttribute(
                              "data-cy",
                              `tab-expandMenu-${ids.expandMenu}`
                           );
                        }
                        this.views((view) => {
                           var node = $$(ids.sidebar).$view.querySelector(
                              `[webix_tm_id="${view.id}_menu"]`
                           );
                           if (!node) return;
                           node.setAttribute(
                              "data-cy",
                              `tab-${view.label.replace(" ", "")}-${view.id}-${
                                 this.id
                              }`
                           );
                        });
                     },
                  },
               };

               var multiview = {
                  view: "multiview",
                  id: ids.component,
                  keepViews: true,
                  minWidth: this.settings.minWidth,
                  height: this.settings.height,
                  cells: this._viewComponents.map((v) => {
                     var tabUi = {
                        id: v.view.id,
                        // ui will be loaded when its tab is opened
                        view: "layout",
                        rows: [],
                     };

                     return tabUi;
                  }),
                  on: {
                     onViewChange: function (prevId, nextId) {
                        _onShow(nextId);
                     },
                  },
               };

               var columns = [sidebar, multiview];
               if (this.settings.sidebarPos == "right") {
                  columns = [multiview, sidebar];
               }

               _ui = {
                  cols: columns,
               };
            } else {
               _ui = {
                  view: "spacer",
               };
            }
         } else {
            var cells = this.views((view) => {
               var accessLevel = view.getUserAccess();
               if (accessLevel > 0) {
                  return view;
               }
            }).map((v) => {
               var tabUi = {
                  id: v.id,
                  // ui will be loaded when its tab is opened
                  view: "layout",
                  rows: [],
               };

               var tabTemplate = "";
               // tab icon
               if (v.tabicon) {
                  if (this.settings.iconOnTop) {
                     tabTemplate =
                        "<div class='ab-tabIconContainer'><span class='fa fa-lg fa-fw fa-" +
                        v.tabicon +
                        "'></span><br/>" +
                        v.label +
                        "</div>";
                  } else {
                     tabTemplate =
                        "<span class='fa fa-lg fa-fw fa-" +
                        v.tabicon +
                        "'></span> " +
                        v.label;
                  }
               }
               // no icon
               else {
                  tabTemplate = v.label;
               }

               return {
                  header: tabTemplate,
                  body: tabUi,
               };
            });

            // if there are cells to display then return a tabview
            if (cells.length) {
               _ui = {
                  rows: [
                     {
                        view: "tabview",
                        id: ids.component,
                        minWidth: this.settings.minWidth,
                        tabbar: {
                           height: 60,
                           type: "bottom",
                           css: this.settings.darkTheme ? "webix_dark" : "",
                           on: {
                              onAfterRender: () => {
                                 this.views((view) => {
                                    var node = $$(
                                       ids.component
                                    ).$view.querySelector(
                                       '[button_id="' + view.id + '"]'
                                    );
                                    if (!node) return;
                                    node.setAttribute(
                                       "data-cy",
                                       "tab " +
                                          view.name +
                                          " " +
                                          view.id +
                                          " " +
                                          this.id
                                    );
                                 });
                              },
                           },
                        },
                        multiview: {
                           height: this.settings.height,
                           on: {
                              onViewChange: function (prevId, nextId) {
                                 _onShow(nextId);
                              },
                           },
                        },
                        cells: cells,
                     },
                  ],
               };
            } else {
               // else we return a spacer
               _ui = {
                  view: "spacer",
               };
            }
         }
      } else {
         _ui = {
            view: "spacer",
         };
      }

      var _logic = {
         changePage: (pageId) => {
            $$(ids.component).blockEvent();
            this.changePage(pageId);
            $$(ids.component).unblockEvent();
         },

         changeTab: (tabViewId) => {
            // switch tab view
            _logic.toggleParent(this.parent);
            if (this.settings.stackTabs) {
               if (!$$(tabViewId).isVisible()) {
                  var showIt = setInterval(function () {
                     if ($$(tabViewId).isVisible()) {
                        clearInterval(showIt);
                     }
                     $$(tabViewId).show(false, false);
                  }, 200);
               }
            } else {
               $$(ids.component).setValue(tabViewId);
            }
         },

         toggleParent: (view) => {
            if (
               (view.key == "tab" || view.key == "viewcontainer") &&
               $$(view.id) &&
               $$(view.id).show
            ) {
               $$(view.id).show(false, false);
            }
            if (view.parent) {
               _logic.toggleParent(view.parent);
            }
         },
      };

      // make sure each of our child views get .init() called
      var _init = (options) => {
         var parent = this;

         if ($$(ids.component))
            webix.extend($$(ids.component), webix.ProgressBar);

         this._viewComponents.forEach((v) => {
            // v.component.init(options);

            // Trigger 'changePage' event to parent
            this.eventAdd({
               emitter: v.view,
               eventName: "changePage",
               listener: (...p) => _logic.changePage(...p),
            });
         });

         // Trigger 'changeTab' event to parent
         this.eventAdd({
            emitter: this,
            eventName: "changeTab",
            listener: (...p) => _logic.changeTab(...p),
         });

         // initialize the sidebar and figure out if it should be collased or not
         this.AB.Storage.get(`${idBase}-state`).then((state) => {
            if (state) {
               // this will collapse or expand the sidebar
               $$(ids.sidebar).setState(state);

               // if the state is collapsed we need to make sure the expand option is available
               if (state.collapsed) {
                  setTimeout(function () {
                     $$(ids.sidebar).remove(ids.collapseMenu);
                     $$(ids.sidebar).add(expandMenu);
                  }, 0);
               }
            }
         });
      };

      var _onShow = (viewId) => {
         var parent = this;

         var defaultViewIsSet = false;
         // if no viewId is given, then try to get the currently selected ID
         if (!viewId) {
            var sidebar = $$(ids.sidebar);
            if (sidebar) {
               viewId = sidebar.getSelectedId().replace("_menu", "");
            }
         }

         this._viewComponents.forEach((v, index) => {
            // set default view id
            var currView = this.views((view) => {
               return view.id == v.view.id;
            });
            var accessLevel = 0;
            if (currView.length) {
               accessLevel = currView[0].getUserAccess();
            }
            // choose the 1st View if we don't have one we are looking for.
            if (!viewId && !defaultViewIsSet && accessLevel > 0) {
               viewId = v.view.id;
               defaultViewIsSet = true;
            }

            // create view's component once
            if (v.component == null && v.view.id == viewId) {
               // show loading cursor
               if ($$(ids.component) && $$(ids.component).showProgress)
                  $$(ids.component).showProgress({ type: "icon" });

               v.component = v.view.component(App);

               if (parent.settings.stackTabs) {
                  // update multiview UI
                  webix.ui(
                     {
                        // able to 'scroll' in tab view
                        id: v.view.id,
                        view: "scrollview",
                        css: "ab-multiview-scrollview",
                        body: v.component.ui,
                     },
                     $$(v.view.id)
                  );
               } else {
                  // update tab UI
                  webix.ui(
                     {
                        // able to 'scroll' in tab view
                        id: v.view.id,
                        view: "scrollview",
                        css: "ab-tabview-scrollview",
                        body: v.component.ui,
                     },
                     $$(v.view.id)
                  );
               }

               // for tabs we need to look at the view's accessLevels
               accessLevel = v.view.getUserAccess();
               v.component.init(null, accessLevel);

               // done
               setTimeout(() => {
                  // $$(v.view.id).adjust();

                  if ($$(ids.component) && $$(ids.component).hideProgress)
                     $$(ids.component).hideProgress();
               }, 10);
            }

            // show UI
            if (v.view.id == viewId && v.component && v.component.onShow)
               v.component.onShow();

            if (parent.settings.stackTabs && v.view.id == viewId) {
               $$(viewId).show(false, false);
               $$(ids.sidebar).select(viewId + "_menu");
            }
         });
      };

      return {
         ui: _ui,
         init: _init,
         logic: _logic,

         onShow: _onShow,
      };
   }
};
