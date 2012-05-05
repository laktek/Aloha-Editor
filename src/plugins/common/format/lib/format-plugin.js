/*!
 * Aloha Editor
 * Author & Copyright (c) 2010-2012 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

define([
	'aloha',
	'aloha/plugin',
	'aloha/jquery',
	'ui/component',
	'ui/surface',
	'ui/toggleCommandButton',
	'ui/multiSplit',
	'i18n!format/nls/i18n',
	'i18n!aloha/nls/i18n',
	'aloha/console',
	'css!format/css/format.css'
],
function( Aloha, Plugin, jQuery, Component, Surface, ToggleCommandButton,
          MultiSplitButton, i18n, i18nCore ) {
	'use strict';

	/**
	 * Define inline formatting buttons components.
	 *
	 * @private
	 * @param {Array.<object>} buttons
	 */
	function initInlineFormattingButtons(buttons) {
		// The bold component is a
		// [toggleCommandButton](toggleCommandButton.html) that ties into the
		// bold command.  The button will automatically update its state
		// whenever the selection changes and it will apply or remove the bold
		// styling when the button is clicked.  This functionality comes from
		// the toggleButton which knows how to hook into the associated
		// command.
		jQuery.each( buttons, function( i, command ) {
			Component.define( command, ToggleCommandButton, {
				command  : command,
				label    : i18n.t( 'button.' + command + '.label' ),
				iconOnly : true,
				icon     : 'aloha-icon aloha-icon-' + command
			});
		});
	}

	/**
	 * Local reference to the `RangeObject' constructor.
	 * @param {Aloha.Range} range.
	 * @return {GENTICS.Utils.RangeObject} A utility RangeObject what wraps the
	 *                                     given range.
	 * @constructor
	 * @private
	 */
	var RangeObject = window.GENTICS.Utils.RangeObject;

	return Plugin.create( 'format', {

		/**
		 * @type {Array.<string>} Available i18n languages.
		 * @const
		 */
		languages: [ 'en', 'de', 'fr', 'eo', 'fi', 'ru', 'it', 'pl' ],

		/**
		 * @type {Array.<string>} Default inline formatting buttons.
		 * @private
		 */
		inlineFormattingButtons: [
			'bold',
			'italic',
			'strikethrough', 'subscript', 'superscript',
			'underline'
		],

		/**
		 * @type {Array.<string>} Default block formatting options.
		 * @private
		 */
		formatBlockButtons: [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'p', 'pre'
		],

		/**
		 * @type {Array.<string>} Set the default formats according to the
		 *                        `removeFormatting()' command.
		 * @private
		 */
		formatsToRemove: [
			'abbr', 'acronym',
			'b', 'bdi', 'bdo', 'big', 'blink',
			'cite', 'code',
			'dfn', 'em',
			'font',
			'i', 'ins',
			'kbd',
			'mark',
			'nobr',
			'q',
			's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
			'tt',
			'u',
			'var'
		],

		/**
		 * Initialize the plugin and set initialize flag to true.
		 */
		init: function() {
			initInlineFormattingButtons(this.inlineFormattingButtons);
			this._initFormatBlock();
		},

		/**
		 * @private
		 */
		_initFormatBlock: function() {
			var plugin = this;

			/**
			 * Format block component
			 *
			 * @class
			 * @extends {Aloha.ui.MultiSplitButton}
			 */
			var FormatBlock = Component.define( 'formatBlock', MultiSplitButton, {

				/**
				 * Gets the buttons for the multi split menu.
				 *
				 * @return {Array.<Object>}
				 */
				getButtons: function() {
					// TODO: Finalize on how the settings should be given
					return jQuery.map( plugin.formatBlockButtons, function( item ) {
						return FormatBlock._buttons[ item ];
					});
				},

				/**
				 * Gets the items for bottom of the multi split menu.
				 *
				 * @return {Array.<Object>}
				 */
				getItems: function() {
					return [{
						label: i18n.t( 'button.removeFormatting.label' ),
						click: function() {
							plugin.removeFormatting( Surface.range, this.editable );
						}
					}];
				}
			});

			/**
			 * @type {Array.<Object>} Settings for all format block buttons.
			 *                        Class variable.
			 * @private
			 * @static
			 */
			FormatBlock._buttons = {};

			jQuery.each( this.formatBlockButtons, function( i, block ) {
				FormatBlock._buttons[ block ] = {
					label : i18n.t( 'button.' + block + '.label' ),
					icon  : 'aloha-large-icon-' + block,
					click : function() {
						Aloha.execCommand( 'formatBlock', false, block,
							Surface.range );
					},
					isActive: function() {
						return ( Aloha.queryCommandValue( 'formatBlock' ) ===
							block );
					}
				};
			});
		},

		/**
		 * Removes all formatting from the current selection.
		 */
		removeFormatting: function(range) {
			var rangeObject = new RangeObject( range ||
				Aloha.getSelection().getRangeAt( 0 ) );

			// TODO: Finalize on how to pass the settings to the plugin formats
			// to be removed by the removeFormat button may now be configured
			// using Aloha.settings.plugins.format.removeFormats = ['b',
			// 'strong', ...]
			//if (this.settings.removeFormats) {
			//		formats = this.settings.removeFormats;
			//}

			if (rangeObject.isCollapsed()) {
				return;
			}

			// TODO: check the difference between range and rangeObject
			Aloha.execCommand('removeformat', false, formatsToRemove , range);

			rangeObject.select();

			// TODO: trigger event - removed Format
		},

		/**
		 * @return {string} A string representation of this plugin instance.
		 */
		toString: function() {
			return 'format';
		}

	});

});
