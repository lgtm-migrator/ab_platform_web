const ABViewMenuCore = require("../../core/views/ABViewMenuCore");
const ABViewTab = require("./ABViewTab");

const ABViewMenuPropertyComponentDefaults = ABViewMenuCore.defaultValues();

let L = (...params) => AB.Multilingual.label(...params);

module.exports = class ABViewMenu extends ABViewMenuCore {
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
      var idBase = "ABViewMenuEditorComponent";
      var ids = {
         component: App.unique(`${idBase}_component`),
         pages: App.unique(`${idBase}_pages`),
         tree: App.unique(`${idBase}_tree`),
      };

      var component = this.component(App);

      var menu = component.ui;
      if (component.ui.elements) {
         var menuIndex = 0;
         component.ui.elements.forEach((elem) => {
            if (elem.view == "menu") {
               menu = component.ui.elements[menuIndex];
            }
            menuIndex++;
         });
      }
      menu.id = ids.component;

      var _ui = {
         type: "space",
         rows: [menu, {}],
      };

      var _init = (options) => {
         var Menu = $$(ids.component);

         this.ClearPagesInView(Menu);
         if (this.settings.order && this.settings.order.length) {
            this.AddPagesToView(Menu, this.settings.order);
            // } else if (this.settings.pages && this.settings.pages.length) {
            //    this.AddPagesToView(Menu, this.settings.pages);
         }
      };

      var _logic = {};

      return {
         ui: _ui,
         init: _init,
         logic: _logic,
      };
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

      _logic.updateTreeDnD = (id, state) => {
         var currView = _logic.currentEditObject();

         // var curPage = currView.settings.pages.filter((page) => {
         //    return page.pageId == id || page.tabId == id;
         // })[0];

         var curPage = currView.application.pages(
            (page) => page.id == id,
            true
         )[0];

         // must not have been a page...lets check tabs
         if (!curPage) {
            curPage = currView.application.views(
               (view) => view.id == id,
               true
            )[0];
         }

         if (state) {
            let label = currView.getAliasname(curPage);
            $$(ids.treeDnD).add({
               id: curPage.id,
               value: label,
               type: curPage.type,
               pageId: curPage.pageId || "",
               tabId: curPage.tabId || "",
            });
            _logic.reorderPages();
         } else {
            // if this item exists in the tree and does not have a submenu you can remove it
            // otherwise we will ask the user to move its submenu items out before deleting
            if ($$(ids.treeDnD).exists(id) && !$$(ids.treeDnD).isBranch(id)) {
               $$(ids.treeDnD).remove(id);
               _logic.reorderPages();
            } else if (
               $$(ids.treeDnD).exists(id) &&
               $$(ids.treeDnD).isBranch(id)
            ) {
               $$(ids.pages).blockEvent();
               // we don't want to send a toggle event because it triggers saves to the database
               $$(ids.pages).checkItem(id);
               webix.message({
                  text: L(
                     "Item comtains submenu, please remove items in submenu before removing."
                  ),
                  type: "error",
                  expire: 10000,
               });
               //resume listening
               $$(ids.pages).unblockEvent();
            }
         }
      };

      _logic.reorderPages = () => {
         var currView = _logic.currentEditObject();

         // add a new pages container
         var pages = [];
         // loop through tree to reorder pages
         $$(ids.treeDnD).data.each((obj) => {
            // find the page in settings that matches the item in the tree
            // var curPage = currView.settings.pages.filter((page) => {
            //    return page.pageId == obj.id || page.tabId == obj.id;
            // })[0];

            var curPage = currView.application.pages(
               (page) => page.id == obj.id,
               true
            )[0];

            // must not have been a page...lets check tabs
            if (!curPage) {
               curPage = currView.application.views(
                  (view) => view.id == obj.id,
                  true
               )[0];
            }

            // put that page in the next possition of the page container
            pages.push(curPage);
         });

         var newPageOrder = [];
         // loop through pages
         /*
         {
            "pageId": "9b8a9458-3ad4-46c1-9ea8-6c96950e161d",
            "tabId": "",
            "type": "page",
            "isChecked": "true",
            "translations": [
               {
                  "language_code": "en",
                  "label": "Sub Page 1",
                  "aliasname": "Sub Page 1"
               }
            ],
            "parent": "0",
            "position": "0"
         }
         */
         pages.forEach((page) => {
            if (page) {
               var thisPage = {};
               // get the id of the element we are clicking to
               var id = page.id;
               // get the object of the data with the id in the tree view
               var treeItem = $$(ids.treeDnD).getItem(id);
               // set the parent element in the page if the treeItem has one
               thisPage.parent = treeItem.$parent;
               // store the position so we can put it back in the right spot later
               thisPage.position = $$(ids.treeDnD).getBranchIndex(id);
               // store the icon
               thisPage.icon = treeItem.icon;
               // store the getAliasname
               //thisPage.aliasname = currView.getAliasname(page);
               // store the page types
               thisPage.type = page.key == "viewcontainer" ? "tab" : "page";
               if (thisPage.type == "tab") {
                  thisPage.tabId = page.id;
                  thisPage.pageId = currView.getParentPageId(page);
               } else {
                  thisPage.pageId = page.id;
               }
               thisPage.isChecked = "true";
               thisPage.translations = page.translations;
               newPageOrder.push(thisPage);
            }
         });
         currView.settings.order = newPageOrder;

         _logic.onChange();
         $$(ids.treeDnD).openAll();
      };

      return commonUI.concat([
         {
            name: "orientation",
            view: "richselect",
            label: L("Orientation"),
            value: ABViewMenuPropertyComponentDefaults.orientation,
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
            options: [
               {
                  id: "x",
                  value: L("Horizontal"),
               },
               {
                  id: "y",
                  value: L("Vertical"),
               },
            ],
         },
         {
            name: "buttonStyle",
            view: "richselect",
            label: L("Button Style"),
            value: ABViewMenuPropertyComponentDefaults.buttonStyle,
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
            options: [
               {
                  id: "ab-menu-default",
                  value: L("Default"),
               },
               {
                  id: "ab-menu-link",
                  value: L("Link"),
               },
            ],
         },
         {
            name: "menuAlignment",
            view: "richselect",
            label: L("Menu Alignment"),
            value: ABViewMenuPropertyComponentDefaults.menuAlignment,
            labelWidth: this.AB.UISettings.config().labelWidthXLarge,
            options: [
               {
                  id: "ab-menu-left",
                  value: L("Left"),
               },
               {
                  id: "ab-menu-center",
                  value: L("Center"),
               },
               {
                  id: "ab-menu-right",
                  value: L("Right"),
               },
            ],
         },
         {
            name: "menuInToolbar",
            view: "checkbox",
            labelRight: L("Put menu in toolbar"),
            value: ABViewMenuPropertyComponentDefaults.menuInToolbar,
            labelWidth: this.AB.UISettings.config().labelWidthCheckbox,
         },
         {
            name: "toolbarFieldset",
            view: "fieldset",
            label: L("Toolbar Settings:"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            body: {
               view: "layout",
               type: "clean",
               padding: 10,
               rows: [
                  {
                     name: "menuPadding",
                     view: "counter",
                     label: L("Toolbar padding"),
                     value: ABViewMenuPropertyComponentDefaults.menuPadding,
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                  },
                  {
                     name: "menuTheme",
                     view: "richselect",
                     label: L("Toolbar theme"),
                     value: ABViewMenuPropertyComponentDefaults.menuTheme,
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                     options: [
                        {
                           id: "white",
                           value: L("White (Default)"),
                        },
                        {
                           id: "bg_gray",
                           value: L("Gray"),
                        },
                        {
                           id: "webix_dark",
                           value: L("Dark"),
                        },
                     ],
                  },
                  {
                     name: "menuPosition",
                     view: "richselect",
                     label: L("Menu Position"),
                     value: ABViewMenuPropertyComponentDefaults.menuPosition,
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                     options: [
                        {
                           id: "left",
                           value: L("Left"),
                        },
                        {
                           id: "center",
                           value: L("Center"),
                        },
                        {
                           id: "right",
                           value: L("Right"),
                        },
                     ],
                  },
                  {
                     name: "menuTextLeft",
                     view: "text",
                     label: L("Text Left"),
                     placeholder: L("Place text in left region of toolbar."),
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                     labelPosition: "top",
                  },
                  {
                     name: "menuTextCenter",
                     view: "text",
                     label: L("Text Center"),
                     placeholder: L("Place text in center region of toolbar."),
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                     labelPosition: "top",
                  },
                  {
                     name: "menuTextRight",
                     view: "text",
                     label: L("Text Right"),
                     placeholder: L("Place text in right region of toolbar."),
                     labelWidth: this.AB.UISettings.config().labelWidthLarge,
                     labelPosition: "top",
                  },
               ],
            },
         },
         {
            name: "pagesFieldset",
            view: "fieldset",
            label: L("Page List:"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            body: {
               view: "layout",
               type: "clean",
               padding: 10,
               rows: [
                  {
                     name: "pages",
                     view: "edittree",
                     borderless: true,
                     css: "transparent",
                     // editor: "inline-text",
                     editable: true,
                     editValue: "aliasname",
                     editor: "text",
                     template: function (item, common) {
                        return `<div class='ab-page-list-item'>
                           ${common.icon(item)} ${common.checkbox(
                           item,
                           false
                        )} <div class="fa fa-${
                           item.key == "viewcontainer"
                              ? "window-maximize"
                              : "file"
                        }"></div> 
                           ${item.label}</div>`;
                     },
                     on: {
                        onItemCheck: function (id, state) {
                           // trigger to save settings
                           _logic.onChange();
                           _logic.updateTreeDnD(id, state);
                        },
                        onBeforeEditStart: function (id) {
                           var item = this.getItem(id);
                           if (!item.aliasname) {
                              item.aliasname = item.label;
                              this.updateItem(item);
                           }
                        },
                        onBeforeEditStop: function (state, editor) {
                           var item = this.getItem(editor.id);
                           if (item) {
                              item.translations.forEach((t) => {
                                 if (
                                    t.language_code ==
                                    App.AB.Multilingual.currentLanguage()
                                 ) {
                                    t.aliasname = state.value;
                                 }
                              });
                              item.label = state.value;
                              this.updateItem(editor.id, item);
                           }

                           if ($$(ids.treeDnD).exists(editor.id)) {
                              // we need to update the drag and drop tree item as well so get it first
                              var treeItem =
                                 $$(ids.treeDnD).getItem(editor.id) || {};
                              // change the value (since that is what is being displayed)
                              treeItem.value = state.value;
                              // then change the aliasname (since that property controls the final view)
                              treeItem.aliasname = state.value;
                              // trigger a save so when we update the preview it has the new data to work with
                              _logic.onChange();
                              // tell the tree to update with new alias (this will trigger a page reorder save and the values already saved will be used to rebuild the component)
                              $$(ids.treeDnD).updateItem(editor.id, treeItem);
                           }
                        },
                     },
                  },
               ],
            },
         },
         {
            name: "pageOrderFieldset",
            view: "fieldset",
            label: L("Drag & Drop to Reorder/Click to Add Icon:"),
            labelWidth: this.AB.UISettings.config().labelWidthLarge,
            body: {
               view: "layout",
               type: "clean",
               padding: 10,
               rows: [
                  {
                     view: "edittree",
                     borderless: true,
                     name: "treeDnD",
                     template:
                        "{common.icon()} <i class='fa fa-fw fa-#icon#'></i> <span>#value#</span>",
                     drag: true,
                     editable: true,
                     editValue: "icon",
                     editor: "combo",
                     options: App.icons,
                     suggest: {
                        template: "#value#",
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
                           template:
                              "<i class='fa fa-fw fa-#value#'></i> #value#",
                        },
                     },
                     on: {
                        onBeforeDrop: function (context) {
                           context.parent = context.target; //drop as child
                           context.index = -1; //as last child
                        },
                        onAfterDrop: function (context, native_event) {
                           _logic.reorderPages();
                        },
                        onDataUpdate: function () {
                           _logic.reorderPages();
                        },
                     },
                  },
               ],
            },
         },
      ]);
   }

   static propertyEditorPopulate(App, ids, view) {
      super.propertyEditorPopulate(App, ids, view);

      $$(ids.orientation).setValue(
         view.settings.orientation ||
            ABViewMenuPropertyComponentDefaults.orientation
      );
      $$(ids.buttonStyle).setValue(
         view.settings.buttonStyle ||
            ABViewMenuPropertyComponentDefaults.buttonStyle
      );
      $$(ids.menuAlignment).setValue(
         view.settings.menuAlignment ||
            ABViewMenuPropertyComponentDefaults.menuAlignment
      );
      $$(ids.menuInToolbar).setValue(
         parseInt(view.settings.menuInToolbar) ||
            ABViewMenuPropertyComponentDefaults.menuInToolbar
      );
      $$(ids.menuPadding).setValue(
         view.settings.menuPadding ||
            ABViewMenuPropertyComponentDefaults.menuPadding
      );
      $$(ids.menuTheme).setValue(
         view.settings.menuTheme ||
            ABViewMenuPropertyComponentDefaults.menuTheme
      );
      $$(ids.menuPosition).setValue(
         view.settings.menuPosition ||
            ABViewMenuPropertyComponentDefaults.menuPosition
      );
      if (view.menuTextLeft == "" && view.settings.menuTextLeft) {
         view.menuTextLeft = view.settings.menuTextLeft;
      }
      $$(ids.menuTextLeft).setValue(
         view.menuTextLeft || ABViewMenuPropertyComponentDefaults.menuTextLeft
      );
      if (view.menuTextCenter == "" && view.settings.menuTextCenter) {
         view.menuTextCenter = view.settings.menuTextCenter;
      }
      $$(ids.menuTextCenter).setValue(
         view.menuTextCenter ||
            ABViewMenuPropertyComponentDefaults.menuTextCenter
      );
      if (view.menuTextRight == "" && view.settings.menuTextRight) {
         view.menuTextRight = view.settings.menuTextRight;
      }
      $$(ids.menuTextRight).setValue(
         view.menuTextRight || ABViewMenuPropertyComponentDefaults.menuTextRight
      );

      var pageTree = new webix.TreeCollection();
      var application = view.application;
      var currentPage = view.pageParent();
      var parentPage = currentPage.pageParent();
      var rootPage = view.pageRoot();

      /**
       * @method addPage
       *
       * @param {ABView} page
       * @param {integer} index
       * @param {uuid} parentId
       */
      var addPage = function (page, index, parentId) {
         // update .aliasname and .translations of the page
         if (view.settings.order && view.settings.order.forEach) {
            view.settings.order.forEach((localpage) => {
               if (
                  (localpage.pageId == page.id && !localpage.id) ||
                  (parentId &&
                     localpage.pageId == parentId &&
                     localpage.tabId == page.id)
               ) {
                  page.translations = localpage.translations;
               }
            });
         }
         let alias = view.getAliasname(page);
         page.label = alias ? alias : page.label;
         // add to tree collection
         pageTree.add(page, index, parentId);

         // add sub-pages
         var subPages = page.pages ? page.pages() : [];
         subPages.forEach((childPage, childIndex) => {
            addPage(childPage, childIndex, page.id);
         });

         // add tabs
         page
            .views((v) => v instanceof ABViewTab)
            .forEach((tab, tabIndex) => {
               // tab views
               tab.views().forEach((tabView, tabViewIndex) => {
                  // tab items will be below sub-page items
                  var tIndex = subPages.length + tabIndex + tabViewIndex;

                  addPage(tabView, tIndex, page.id);
               });
            });
      };

      application
         .pages((p) => rootPage && rootPage.id == p.id, true)
         .forEach((p, index) => {
            addPage(p, index);
         });

      $$(ids.pages).clearAll();
      $$(ids.pages).data.importData(pageTree);
      $$(ids.pages).refresh();
      $$(ids.pages).blockEvent();
      $$(ids.pages).uncheckAll();
      $$(ids.pages).unblockEvent();
      $$(ids.pages).openAll();

      // Select pages
      // if (view.settings.pages && view.settings.pages.forEach) {
      // $$(ids.treeDnD).clearAll();
      // view.settings.pages.forEach((page) => {
      //    if (page.isChecked) {
      //       if ($$(ids.pages).exists(page.tabId || page.pageId)) {
      //          //after this command all events will be ignored
      //          $$(ids.pages).blockEvent();
      //          // we don't want to send a toggle event because it triggers saves to the database
      //          $$(ids.pages).checkItem(page.tabId || page.pageId);
      //          //resume listening
      //          $$(ids.pages).unblockEvent();
      //       }
      //    }
      // });

      $$(ids.treeDnD).clearAll();
      if (view.settings.order && view.settings.order.forEach) {
         view.settings.order.forEach((page) => {
            if ($$(ids.pages).exists(page.tabId || page.pageId)) {
               //after this command all events will be ignored
               $$(ids.pages).blockEvent();
               // we don't want to send a toggle event because it triggers saves to the database
               $$(ids.pages).checkItem(page.tabId || page.pageId);
               //resume listening
               $$(ids.pages).unblockEvent();
            }
            let label = view.getAliasname(page);
            $$(ids.treeDnD).add(
               {
                  id: page.tabId || page.pageId,
                  value: label,
                  type: page.type,
                  pageId: page.pageId || "",
                  tabId: page.tabId || "",
                  icon: page.icon,
               },
               page.position ? parseInt(page.position) : 0,
               page.parent && page.parent != "0" ? page.parent : ""
            );
         });
         // } else if (view.settings.pages && view.settings.pages.forEach) {
         //    view.settings.pages.forEach((page) => {
         //       if (page.isChecked) {
         //          let label = view.getAliasname(page);
         //          $$(ids.treeDnD).add({
         //             id: page.tabId || page.pageId,
         //             value: label,
         //             type: page.type,
         //             pageId: page.pageId
         //          });
         //       }
         //    });
      }
      $$(ids.treeDnD).openAll();
      // }

      // $$(ids.pagesFieldset).config.height = ($$(ids.pages).count()*28)+18; // Number of pages plus 9px of padding top and bottom
      $$(ids.pagesFieldset).config.height =
         $$(ids.pages).count() * 28 + 18 + 40; // Number of pages plus 9px of padding top and bottom
      $$(ids.pagesFieldset).resize();
      $$(ids.pageOrderFieldset).config.height =
         $$(ids.pages).count() * 28 + 18 + 40; // Number of pages plus 9px of padding top and bottom
      $$(ids.pageOrderFieldset).resize();
   }

   static propertyEditorValues(ids, view) {
      super.propertyEditorValues(ids, view);

      view.settings.orientation = $$(ids.orientation).getValue();
      view.settings.buttonStyle = $$(ids.buttonStyle).getValue();
      view.settings.menuAlignment = $$(ids.menuAlignment).getValue();
      view.settings.menuInToolbar = $$(ids.menuInToolbar).getValue();
      view.settings.menuPadding = $$(ids.menuPadding).getValue();
      view.settings.menuTheme = $$(ids.menuTheme).getValue();
      view.settings.menuPosition = $$(ids.menuPosition).getValue();
      view.menuTextLeft = $$(ids.menuTextLeft).getValue();
      view.menuTextCenter = $$(ids.menuTextCenter).getValue();
      view.menuTextRight = $$(ids.menuTextRight).getValue();
      // Legacy support: clear the old settings when new values are created
      // otherwise leave them
      if (view.menuTextLeft.length) {
         view.settings.menuTextLeft = "";
      }
      if (view.menuTextCenter.length) {
         view.settings.menuTextCenter = "";
      }
      if (view.menuTextCenter.length) {
         view.settings.menuTextRight = "";
      }

      // var pagesIdList = [];
      if ($$(ids.pages)) {
         for (var i = 0; i < $$(ids.pages).data.count(); i++) {
            var currentPageId = $$(ids.pages).getIdByIndex(i);
            var currentItem = $$(ids.pages).getItem(currentPageId);

            var type = "page",
               tabId;
            if (currentItem.key == "viewcontainer") {
               type = "tab";
               tabId = currentPageId;
               currentPageId = currentItem.pageParent().id;
            } else {
               // if we have left the tabs we were looping through we need to reset the tabId
               tabId = "";
            }

            // let pageInfo = view.settings.pages.filter(
            //    (p) => p.pageId == currentPageId
            // )[0];

            let translations = [];

            if (currentItem && currentItem.translations)
               translations = currentItem.translations;
            // else if (pageInfo && pageInfo.translations)
            //    translations = AB.cloneDeep(pageInfo.translations);

            // pagesIdList.push({
            //    pageId: currentPageId,
            //    tabId: tabId,
            //    type: type,
            //    aliasname: currentItem.aliasname,
            //    isChecked: currentItem.checked,
            //    translations: translations
            // });
         }
         // view.settings.pages = pagesIdList;
         if (view.settings.pages) delete view.settings.pages;
      }
   }

   /*
    * @component()
    * return a UI component based upon this view.
    * @param {obj} App
    * @return {obj} UI component
    */
   component(App) {
      var idBase = `ABMenuLabel_${this.id}`;
      var ids = {
         component: App.unique(`${idBase}_component`),
      };

      var css = "";

      if (this.settings.buttonStyle) {
         css += this.settings.buttonStyle + " ";
      } else {
         css += ABViewMenuPropertyComponentDefaults.buttonStyle + " ";
      }

      if (this.settings.menuAlignment) {
         css += this.settings.menuAlignment + " ";
      } else {
         css += ABViewMenuPropertyComponentDefaults.menuAlignment + " ";
      }

      var _ui = {
         id: ids.component,
         view: "menu",
         autoheight: true,
         autowidth: true,
         datatype: "json",
         css: css,
         layout:
            this.settings.orientation ||
            ABViewMenuPropertyComponentDefaults.orientation,
         on: {
            onMenuItemClick: (id, e, node) => {
               // switch tab view
               var item = $$(ids.component).getMenuItem(id);
               if (item.type == "tab") {
                  this.changePage(item.pageId);

                  var redirectPage = this.application.pages(
                     (p) => p.id == item.pageId,
                     true
                  )[0];
                  if (!redirectPage) return;

                  var tabView = redirectPage.views(
                     (v) => v.id == item.id,
                     true
                  )[0];
                  if (!tabView) return;

                  var tab = tabView.parent;
                  if (!tab) return;

                  toggleParent(tab);
                  // if (!$$(tabView.id) || !$$(tabView.id).isVisible()) {
                  let showIt = setInterval(function () {
                     if ($$(tabView.id) && $$(tabView.id).isVisible()) {
                        clearInterval(showIt);
                        return;
                     }
                     tab.emit("changeTab", tabView.id);
                  }, 100);
                  // }
               }
               // switch page
               else {
                  this.changePage(id);
               }
            },
            onAfterRender: () => {
               const Menu = $$(ids.component);
               if (!Menu) return;
               Menu?.data.each((item) => {
                  const node = Menu.getItemNode(item.id);
                  if (!node) return;
                  // get linked page/tab info so we can use its name in the data-cy
                  const viewInfo = this.AB.definitionByID(item.id);
                  node.setAttribute(
                     "data-cy",
                     `menu-item ${viewInfo?.name} ${item.id} ${this.id}`
                  );
               });
            },
         },
         type: {
            subsign: true,
         },
      };

      if (parseInt(this.settings.menuInToolbar)) {
         var elems = [];
         var menuIncluded = false;

         // Legacy support: use old settings values if translated values are not set
         if (this.menuTextLeft == "" && this.settings.menuTextLeft) {
            this.menuTextLeft = this.settings.menuTextLeft;
         }
         if (this.menuTextCenter == "" && this.settings.menuTextCenter) {
            this.menuTextCenter = this.settings.menuTextCenter;
         }
         if (this.menuTextRight == "" && this.settings.menuTextRight) {
            this.menuTextRight = this.settings.menuTextRight;
         }

         if (
            this.settings.menuPosition &&
            this.settings.menuPosition == "left"
         ) {
            menuIncluded = true;
            elems.push(_ui);
         } else if (this.menuTextLeft && this.menuTextLeft.length) {
            let width = this.menuTextLeft.length * 15;
            elems.push({
               view: "label",
               label: this.menuTextLeft,
               align: "left",
               width: width,
            });
         } else {
            elems.push({
               view: "label",
               label: "",
               autowidth: true,
            });
         }

         if (
            this.settings.menuPosition &&
            this.settings.menuPosition == "center"
         ) {
            menuIncluded = true;
            elems.push(_ui);
         } else if (this.menuTextCenter && this.menuTextCenter.length) {
            let width = this.menuTextLeft.length * 15;
            elems.push({});
            elems.push({
               view: "label",
               label: this.menuTextCenter,
               align: "center",
               width: width,
            });
            elems.push({});
         } else {
            elems.push({
               view: "label",
               label: "",
               autowidth: true,
            });
         }

         if (
            this.settings.menuPosition &&
            this.settings.menuPosition == "right"
         ) {
            menuIncluded = true;
            elems.push(_ui);
         } else if (this.menuTextRight && this.menuTextRight.length) {
            let width = this.menuTextLeft.length * 15;
            elems.push({
               view: "label",
               label: this.menuTextRight,
               align: "right",
               width: width,
            });
         } else {
            elems.push({
               view: "label",
               label: "",
               autowidth: true,
            });
         }

         if (menuIncluded == false) {
            elems = [_ui];
         }

         _ui = {
            view: "toolbar",
            css: this.settings.menuTheme
               ? this.settings.menuTheme
               : ABViewMenuPropertyComponentDefaults.menuTheme,
            padding: this.settings.menuPadding
               ? parseInt(this.settings.menuPadding)
               : ABViewMenuPropertyComponentDefaults.menuPadding,
            elements: elems,
         };
      }

      // make sure each of our child views get .init() called
      var _init = (options) => {
         var Menu = $$(ids.component);
         if (Menu) {
            this.ClearPagesInView(Menu);
            if (this.settings.order && this.settings.order.length) {
               this.AddPagesToView(Menu, this.settings.order);
               // Force onAfterRender to fire
               Menu.refresh();
            }
         }
      };

      var toggleParent = (element) => {
         if (!element.parent) return false;
         var parentElem = element.parent;
         if (!parentElem.parent) return false;
         parentElem.parent.emit("changeTab", parentElem.id);
         toggleParent(parentElem.parent);
      };

      return {
         ui: _ui,
         init: _init,
      };
   }
};
