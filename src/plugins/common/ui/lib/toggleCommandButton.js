define([
	'aloha/core',
	'ui/surface',
	'ui/component',
	'ui/togglebutton'
],
function( Aloha, Surface, Component, ToggleButton ) {
	'use strict';

	/**
	 * The toggleCommandButton extends the toggleButton component type to
	 * provide an easy way to create buttons for __commands__ that are either
	 * on or off.
	 *
	 * @class
	 * @name Aloha.ui.ToggleCommandButton
	 * @extends {Aloha.ui.ToggleButton}
	 */
	var ToggleCommandButton = ToggleButton.extend({

		/**
		 * On click, we will always execute the command.  Since
		 * toggleCommandButton is used for binary commands, there is no need to
		 * provide a value.
		 *
		 * @override
		 * @todo: This function should only be called if the container in which
		 *        this component is rendered is visible.
		 */
		click: function() {
			Aloha.execCommand( this.command, false, null, Surface.range );
		},

		/**
		 * When the selection changes, the button will query the current state
		 * of the command to determine if the button should be rendered as on
		 * or off.
		 *
		 * @override
		 * @todo: This function should only be called if the container in which
		 *        this component is rendered is visible.
		 */
		selectionChange: function() {
			this.setState( Aloha.queryCommandState( this.command ) );
		}

	});

	return ToggleCommandButton;
});
