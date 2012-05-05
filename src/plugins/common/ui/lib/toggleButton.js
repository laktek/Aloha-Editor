define([
	'aloha/jquery',
	'ui/button'
],
function( jQuery, Button ) {
	'use strict';

	var uid = 0;

	/**
	 * The toggleButton extends the button component type to provide an easy
	 * way to create buttons for commands that are either on or off.
	 *
	 * @class
	 * @name Aloha.ui.ToggleButton
	 * @extends {Aloha.ui.Button}
	 */
	var ToggleButton = Button.extend({

		/**
		 * The `setState()' method updates the visual display of the
		 * toggleButton, and sets the state of the button.
		 *
		 * @param {boolean} toggled
		 */
		setState: function( toggled ) {
			this.buttonElement.prop( 'checked', toggled ).button( 'refresh' );
		},

		/**
		 * Creates the element to be used as the button.
		 *
		 * @override
		 * @return {jQuery<HTMLElement>}
		 */
		createButtonElement: function() {
			// Generate a unique id for the button until jQuery UI supports
			// implicit labels (http://bugs.jqueryui.com/ticket/6063)
			var id = 'aloha-toggleButton-' + (++uid);

			this.element = jQuery( '<span>' );

			jQuery( '<label>', {
				text: this.label,
				'for': id
			}).appendTo( this.element );

			this.buttonElement = jQuery( '<input type="checkbox">' )
				.attr( 'id', id )
				.appendTo( this.element );

			return this.buttonElement;
		}

	});

	return ToggleButton;
});
