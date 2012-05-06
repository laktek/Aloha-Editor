define([
	'aloha/core',
	'aloha/jquery',
	'util/class',
],
function( Aloha, jQuery, Class ) {
	'use strict';

	/**
	 * Component class and manager.
	 *
	 * The main UI objects are components.  Components can be placed inside any
	 * container, such as a toolbar or sidebar.
	 *
	 * @class
	 * @base
	 */
	var Component = Class.extend({

		/**
		 * @type {boolean} Whether or not this component is visible.
		 */
		visible: true,

		/**
		 * Component constructor.
		 *
		 * @param {Aloha.Editable} editable The editable to which this
		 *                                  component will interact with for
		 *                                  the extent of its lifetime.
		 * @constructor
		 */
		_constructor: function( editable ) {
			this.editable = editable;

			// Components are responsible for updating their state and visibility
			// whenever the selection changes.
			// TODO(p.salema@gentics.com): Consider implementing 'aloha-node-changed'
			// which would be trigger only when the user selection moves from one node
			// into another.
			Aloha.bind( 'aloha-selection-changed aloha-command-executed',
				jQuery.proxy( function( event, range ) {
					this.selectionChange( range );
				}, this ) );

			this.init();
		},

		/**
		 * Initializes this component.  To be implemented in subclasses.
		 */
		init: function() {},

		/**
		 * Shows this component.
		 */
		show: function() {
			if ( !this.visible ) {
				this.element.show();
			}
			this.visible = true;
		},

		/**
		 * Hides this component.
		 */
		hide: function() {
			if ( this.visible ) {
				this.element.hide();
			}
			this.visible = false;
		},

		/**
		 * Selection change callback.
		 * Usually overridden by the component or the settings that are passed
		 * to the constructor at instantialization.
		 */
		selectionChange: function() {}

	});

	// Static fields.

	jQuery.extend( Component, {

		/**
		 * @type {object.<Aloha.ui.Component>} A List of all defined components.
		 */
		components: {},

		/**
		 * Defines a component.
		 *
		 * @param {string} name Component name.
		 * @param {Aloha.ui.Component} type Component type to inherit from.
		 * @param {object} settings Settings to configure component type.
		 * @return {Aloha.ui.Component} Generated component class.
		 */
		define: function( name, type, settings ) {
			Component.components[ name ] = type.extend( settings );
			return Component.components[ name ];
		},

		/**
		 * Renders a defined component for an editable.
		 *
		 * @param {string} name Name of component to render.
		 * @param {Aloha.Editable} editable Editable to associate component with.
		 * @return {Aloha.ui.Component} This component.
		 */
		render: function( name, editable ) {
			var ComponentType = Component.components[ name ];
			return new ComponentType( editable );
		}
	});

	return Component;
});
