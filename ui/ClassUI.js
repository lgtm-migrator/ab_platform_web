var EventEmitter = require("events").EventEmitter;

class ClassUI extends EventEmitter {
   constructor(base) {
      super();
      this.ids = {
         component: base,
      };
      // if (!base) {
      //    console.warn("new ClassUI() called without a base component id. ");
      // }
   }

   /**
    * @method CYPRESS_REF()
    * Attach a cypress "data-cy" attribute to the given element.  This is used
    * for writing E2E tests and how we directly identify a webix widget we are
    * referencing for our tests.
    * @param {webix.object|webix.node|html.element} el
    *        The element we are attempting to attach the data attribute to
    *        There are a number of ways we might be sending this element
    *        on a onAfterRender() callback on a Webix Object
    *        by gathering the nodes of a Webix object directly
    * @param {string} id
    *        [optional] the value of the data-cy attribute
    */
   static CYPRESS_REF(el, id) {
      id = id || el.config.id;

      // is this a webix object?
      if (el.getInputNode) {
         var node = el.getInputNode();
         if (node) {
            node.setAttribute("data-cy", id);
            return;
         }
      }

      // this element has a webix $view
      if (el.$view) {
         el.$view.setAttribute("data-cy", id);
         return;
      }

      // this is probably a straight up DOM element:
      el.setAttribute("data-cy", id);
   }

   /**
    * attach()
    * cause this UI object to attach itself to a given DIV.ID
    * of an existing HTML object.
    * @param {string} id
    *        the <DIV ID="id"> value of the HTML element to display this UI
    *        inside.
    * @return {Webix View}
    *        returns an instance of the Webix UI object generated by our
    *        .ui() description.
    */
   attach(id) {
      var ui = this.ui();
      if (ui && id) {
         ui.container = id;
      }

      this.el = webix.ui(ui);
      return this.el;
   }

   label(key, ...params) {
      if (this.AB) {
         return this.AB.Multilingual.label(key, key, ...params);
      }
      console.error(".labels() called before .AB was set!");
      return key;
   }

   /**
    * ui()
    * return a Webix user interface definition for this UI component.
    * This should be just the json description, not an active instance.
    * @return {obj}
    */
   ui() {
      console.error(
         "ClassUI.ui(): it is expected that sub classes of ClassUI will implement their own ui() method."
      );
   }

   show() {
      if (this.ids?.component) {
         $$(this.ids.component).show();
      }
   }
}

export default ClassUI;
