import ClassUI from "./ClassUI";

class ClassUIPage extends ClassUI {
   constructor(containerID, page, App, AB) {
      super();

      this.containerID = containerID;
      // {string}
      // the webix $$(containerID) reference to attach this UI to.
      // Typically the portal_work generates a series of container placeholders
      // and these ClassUIPage will attach themselves to them.

      this.page = page;
      // {ABViewPage}
      // The Root Page that this container is displaying.

      this.App = App;
      // {ABComponent.App}
      // The common UI Component App factory.

      this.AB = AB;
      // {ABFactory}
      // The common ABFactory being shared for all our ABxxx Objects.

      this.initialized = false;
      // {bool}
      // indicates if the User had chosen to display this page yet.
      // We prevent loading our data and building the page until the
      // User decides to show the page.

      this.pageStack = [];
      // {array}
      // Keep track of the {ABViewPage.id} that have been showPage()ed.
      // The last element in the stack should be the Actively Shown page.
      // If the stack is empty, then we are showing the RootPage.

      this.pageComponents = {};
      // {hash}  { ABViewPage.id : ABViewPage.component() }
      // we keep track of all the ui.component() of our possible views to
      // prevent having to regenerate them and quickly access their values.

      this.changePageEventIds = {};
      // {hash}  { ABViewPage.id : .on("changePage") }
      // A hash of the on("changePage") listeners for each page. Used to
      // prevent multiple listeners added to a Page
   }

   ui() {
      // NOTE: the .container === .id
      // so this REPLACES the container created by the portal_work
      var placeholder = {};
      if (this.page && this.page.isRoot()) {
         // some pages can take a while to initialize.
         // add a spinner to indicate it is busy
         placeholder = {
            type: "clean",
            css: { "text-align": "center" },
            template:
               '<div style="height: 100vh; width: 100%; background: #ebedf0;" class="webix_progress_icon"><div class="webix_progress_state wxi-sync webix_spin"></div></div>',
         };
      }
      return {
         view: "multiview",
         // container: this.containerID,
         css: "ab-main-container ab-generated-page",
         borderless: true,
         id: this.containerID,
         animate: false,
         cells: [placeholder],
         on: {
            // onViewChange: (prevId, nextId) => {
            //    this.resize();
            // },
         },
      };
   }

   init(AB, render = false) {
      if (AB) {
         this.AB = AB;
      }

      // don't redo all this if we already have!
      if (this.initialized) return Promise.resolve();

      var myUI = this.ui();
      webix.ui(myUI, $$(this.containerID));

      if (!render) {
         return Promise.resolve();
      }

      // .init() returns a Promise
      return new Promise((resolve /*, reject */) => {
         // 1) make sure all Application DataCollections have started
         //    initialization.
         this.page.application.datacollectionsIncluded().forEach((dc) => {
            if (!dc) return;

            dc.init();
         });

         // 2) Render all our Pages
         this.renderPage(this.page);

         // 3) After we are rendered, we are technically initialized
         this.initialized = true;

         // 4) Make sure our Root Page is "shown"
         this.showPage();

         resolve();
      });
   }

   /**
    * initEvents()
    * Setup the listeners for each page.  There are 3 main events we are
    * concerned with:
    *    "changePage" =>
    *          generated by our Page / Sub Page / Sub view
    *          indicates when a new page should be displayed.
    *    "ab.interface.update" =>
    *          generated by the server.
    *          indicates that the Definition of our interface
    *          has changed and we need to redisplay.
    *    "ab.datacollection.update" = >
    *          generated by the server.
    *          indicates one of the DataCollections have been updated.
    *          if it is one we are depending on, we need to redisplay
    *
    * @param {ABViewPage} page
    *       The ABViewPage to establish listeners on.
    */
   initEvents(page) {
      if (page == null) return;

      // { pageId: eventId, ..., pageIdn: eventIdn }
      this.changePageEventIds = this.changePageEventIds || {};

      // prevent duplicate event registrations
      if (!this.changePageEventIds[page.id]) {
         this.changePageEventIds[page.id] = page.on("changePage", (pageID) => {
            this.showPage(pageID);
         });
      }

      let needToReloadPage = () => {
         // clear the cache of events
         this.changePageEventIds = {};

         this.initialized = false;

         // begin the process of reloading the page
         this.init(this.AB, true);
      };

      if (!this.updatePageEventId && page.isRoot()) {
         /**
          * @event ab.interface.update
          * This event is triggered when the root page is updated
          *
          * @param data.rootPage {uuid} - id of the root page
          */
         this.updatePageEventId = this.AB.on(
            "ab.interface.update",
            function (data) {
               if (page.id == data.rootPageId) {
                  needToReloadPage();
               }
            }
         );
      }

      if (!this.updateDatacollectionEventId && page.isRoot()) {
         /**
          * @event ab.datacollection.update
          * This event is triggered when the datacollection is updated
          * Make sure we only update the Display if it was a DC that was
          * included in this Page's Application.
          *
          * @param data.datacollectionId {uuid} - id of the data view
          */
         this.updateDatacollectionEventId = this.AB.on(
            "ab.datacollection.update",
            (data) => {
               let updatedDC = this.page.application.datacollectionsIncluded(
                  (dc) => dc.id == data.datacollectionId
               )[0];
               if (updatedDC) {
                  needToReloadPage();
               }
            }
         );
      }
   }

   /**
    * renderPage()
    * create the Webix UI for the given ABViewPage and all it's Sub Pages.
    * This routine creates the component.ui, and performs the component.init()
    * but does not perform the final component.onShow() ( that happens in the
    * showPage() method.)
    * @param {ABViewPage} page
    */
   renderPage(page) {
      var component = page.component(this.App);
      var ui = component.ui;

      // Keep the page component
      this.pageComponents[page.id] = component;

      var myContainer = $$(this.containerID);
      // {webix.ui}
      // Referencing our container. Since we seem to make numerous references
      // to this below, let's just pull it 1x.

      // James:
      // this is pulled in from our previous v1 code. Not sure if it is still
      // relevant.
      // TODO: review this and how this works in context of our Webix Only
      // Portal.
      // Also, notice how we are referencing the internal data of a Page object?
      // there should be an accessor method (like page.setting("pageWidth"))
      // that returns the data we need.
      /*
      if (
         parseInt(page.settings.pageWidth) > 0 &&
         parseInt(page.settings.fixedPageWidth) == 1
      ) {
         var parentContainer = this.element.parent()[0];
         parentContainer.style.width = parseInt(page.settings.pageWidth) + "px";
         parentContainer.style.margin = "0 auto";
         parentContainer.classList.add(page.settings.pageBackground);
      }
      */

      var type = page.settings?.type ?? "";
      if (typeof page.type === "function") {
         // plugin method.
         type = page.type();
      }
      switch (type) {
         case "popup":
            var popupTemplate = {
               view: "window",
               id: page.id,
               modal: true,
               position: "center",
               resize: true,
               width: parseInt(page.settings.popupWidth) || 700,
               height: parseInt(page.settings.popupHeight) + 44 || 450,
               css: "ab-main-container",
               head: {
                  view: "toolbar",
                  css: "webix_dark",
                  cols: [
                     {
                        view: "label",
                        label: page.label,
                        css: "modal_title",
                        align: "center",
                     },
                     {
                        view: "button",
                        label: "Close",
                        autowidth: true,
                        align: "center",
                        click: () => {
                           this.showPage();
                           // var popup = this.getTopParentView();
                           // popup.hide();
                        },
                        on: {
                           //Add data-cy attribute to the close button
                           onAfterRender: () => {
                              const button = $$(page.id).queryView("button");
                              const dataCy = `Popup Close Button ${page.name} ${page.id}`;
                              button
                                 .getInputNode()
                                 .setAttribute("data-cy", dataCy);
                           },
                        },
                     },
                  ],
               },
               body: {
                  view: "scrollview",
                  scroll: true,
                  body: ui,
               },
            };

            var oldView = $$(page.id);
            if (oldView) {
               // if it is a Popup, destroy() it
               if (oldView.config.view == "window") {
                  oldView.destructor();
               }
               // else remove the view from our multiview
               else if (myContainer) {
                  myContainer.removeView(page.id);
               }
            }

            // Now create the New one (hidden)
            try {
               webix.ui(popupTemplate).hide();
            } catch (e) {
               console.error("Error creating Page:", page);
               console.error(e);
               // debugger;
            }
            break;

         case "page":
         default:
            // Define page id to be batch id of webix.multiview
            ui.batch = page.id;

            // if this view already exists
            var oldPage = $$(page.id);
            if (oldPage) {
               // if the old view was a popup, but now we want it as
               // a page, we need to move it to our multiview
               if (oldPage.config.view == "window") {
                  oldPage.destructor();

                  myContainer.addView(ui);
               }
               // else we want to rebuild it.
               else {
                  webix.ui(ui, oldPage);
               }
            }
            // else this is our first time so add it
            else if (myContainer) {
               myContainer.addView(ui);
            }

            break;
      }

      // handle events
      this.initEvents(page);

      // Render child pages
      (page.pages() || []).forEach((subpage) => {
         this.renderPage(subpage);
      });

      // Initial UI components
      component.init();
   }

   /**
    * show()
    * is called by the main portal_work when a menu item is selected and this
    * container should be displayed.
    */
   show() {
      var container = $$(this.containerID);
      if (container) {
         if (!this.initialized) {
            // this is our 1st time to show, so wait for our initial loading
            // container to display, before causing it to be transformed into
            // our Page.
            var eventID = container.attachEvent("onViewShow", () => {
               // only 1x
               container.detachEvent(eventID);
               // give ourselves some additional space to make sure animations
               // are complete or operational before the .init() which can be
               // resource intensive.
               setTimeout(() => {
                  this.init(this.AB, true);
                  container.show();
               }, 50);
            });
         }

         container.show();
      }
   }

   /**
    * showPage()
    * A RootPage can have several SubPages that it wants to display during
    * it's normal operation.  An embedded view component can trigger an
    * .emit("showPage", pageID) that will get propagated up to our RootPage
    * and showPage(pageID) will be called.
    *
    * For example, an ABViewMenu object will have a button clicked and it will
    * signal this to show the desired Page.
    *
    * If a showPage() is called with no parameter, then we are being requested
    * to return to the previous page before the current one.
    * @param {string} pageID
    *       The {ABViewPage.id} of the page to show.
    * @param {string} viewID
    *       An additional ABViewxxx.id that can also be signaled to show.
    *       ?? Usually on the Page we just showed, so you can specify a
    *       page + view.
    */
   showPage(pageID, viewId) {
      var showPageID = null;
      // {string}
      // This is the actual pageID of the ABViewPage to display.

      // in any case, if the active page is not the requested page,
      // we hide it:
      var activeID = this.pageStack[this.pageStack.length - 1];
      if (activeID) {
         // if the actively displayed page is what is being asked for
         // we can just exit.
         if (activeID == pageID) {
            return; //
         }

         // otherwise we need to hide() any popups / pages
         var activeUI = $$(activeID);
         if (activeUI && activeUI.hide) activeUI.hide();
      }

      // if no pageID provided, then we are displaying a previous page:
      if (!pageID) {
         // pull the last View displayed & remove it.
         this.pageStack.pop();
      } else {
         // be sure not to add our Root Page to the stack
         if (this.page.id != pageID) {
            // add the new pageID to our stack:
            // REMEMBER: last item is what should be show()n
            this.pageStack.push(pageID);
         } else {
            // in this case: we have items in our .pageStack, but we are told
            // to return to our RootPage;
            // clear out our .pageStack and we will return to our root
            this.pageStack = [];
         }
      }

      // now get the ID of the page to show
      showPageID = this.pageStack[this.pageStack.length - 1];
      if (!showPageID) {
         // then we want to display the Root Page:
         showPageID = this.page.id;
      }

      if (!showPageID) {
         // if we get here and don't have a showPageID ... something didn't
         // go as planned:
         this.AB.error(
            new Error(`Unable to resolve showPage() with pageID[${pageID}]`)
         );
      } else {
         // make sure a popup is shown
         if ($$(showPageID)) $$(showPageID).show();

         // if our MultiView has this batch then show batch
         var batchExist = false;
         var childViews = $$(this.containerID).getChildViews();
         batchExist = childViews.filter(function (v) {
            return v.config.batch == showPageID;
         })[0];
         if (batchExist) $$(this.containerID).showBatch(showPageID);

         // now make sure the actual component's .onShow() is called
         // But perform a Timeout() so any current webix animations
         // complete beforehand:
         setTimeout(() => {
            if (
               this.pageComponents[showPageID] &&
               this.pageComponents[showPageID].onShow
            ) {
               // for (const element of document
               //    .getElementById(self.containerDomID)
               //    .getElementsByClassName("ab-loading")) {
               //    element.style.display = "none";
               // }
               this.pageComponents[showPageID].onShow();
               if (viewId) {
                  $$(viewId).show();
               }
            }
         }, 60);
      }
   }

   /*
   removePage(pageId) {
      var pageCom = this.pageComponents[pageId];
      var pageElemId = pageCom.ui.id;

      // swtich the page before it will be removed
      if (this.activePageId == pageId) {
         this.showPage(this.rootPage.id);
      }

      // remove from .multiview
      $$(this.containerDomID).removeView(pageElemId);

      // destroy view's modal
      if ($$(pageElemId)) $$(pageElemId).destructor();
   }
   */
}

export default ClassUIPage;
